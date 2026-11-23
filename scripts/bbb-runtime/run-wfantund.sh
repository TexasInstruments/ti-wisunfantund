#!/bin/bash
set -euo pipefail

[[ $# == 1 && ( $1 == br || $1 == rn ) ]] || { printf 'usage: run-wfantund.sh {br|rn}\n' >&2; exit 1; }
(( EUID == 0 )) || { printf 'run-wfantund.sh requires an operator-controlled root shell\n' >&2; exit 1; }
for tool in stat dirname realpath; do
    command -v "$tool" >/dev/null || { printf 'missing required tool: %s\n' "$tool" >&2; exit 1; }
done
# Check the launcher and source library before executing copied package code.
for input in "$(realpath -s -- "$0")" "$(realpath -s -- "$(dirname -- "$0")/preflight.sh")"; do
    path=$input
    [[ -f $path ]] || { printf 'missing runtime script: %s\n' "$path" >&2; exit 1; }
    while :; do
        mode=$(stat -c '%a' -- "$path")
        [[ ! -L $path ]] && (( (8#$mode & 0022) == 0 )) || { printf 'unsafe package path: %s\n' "$path" >&2; exit 1; }
        [[ $path == / ]] && break
        path=$(dirname -- "$path")
    done
done
source "$(dirname -- "$0")/preflight.sh"
bbb_role "$@"
bbb_init
bbb_preflight
bbb_coordination
exec 8<> "$BBB_RUN/daemon.lock"
flock -n 8 || bbb_die 'a daemon helper is already active'
bbb_processes daemon

bbb_selected_host() {
    local ticks owner
    # An unlocked lock means stale metadata, not a running helper.
    exec 7<> "$BBB_RUN/host.lock"
    if flock -n 7; then bbb_die 'no active host helper; start the selected run-host.sh first'; fi
    exec 7>&-
    bbb_root_file "$BBB_RUN/host.state"
    mapfile -t host < "$BBB_RUN/host.state"
    [[ ${#host[@]} == 7 && ${host[0]} == wisun-bbb-v1 && ${host[1]} == "$BBB_ROLE" && \
       ${host[2]} =~ ^[1-9][0-9]*$ && ${host[3]} =~ ^[0-9]+$ && ${host[4]} == "$BBB_BIN" && \
       ${host[5]} == "$BBB_CFG" && ${host[6]} == "$BBB_PORT" ]] || bbb_die 'host metadata does not match selected role/bundle'
    BBB_PID=${host[2]}
    [[ -d /proc/$BBB_PID && $(stat -c '%u' "/proc/$BBB_PID") == 0 ]] || bbb_die 'recorded root host is no longer active'
    ticks=$(bbb_start_ticks "$BBB_PID") || bbb_die 'cannot verify host lifetime'
    [[ $ticks == "${host[3]}" ]] || bbb_die 'recorded host PID has been reused'
    # The helper execs the host with FD9, preserving this exact exclusive lock.
    owner=$(stat -Lc '%d:%i' "/proc/$BBB_PID/fd/9" 2>/dev/null) || bbb_die 'host did not retain FD9 lock'
    [[ $owner == "$(stat -c '%d:%i' "$BBB_RUN/host.lock")" ]] || bbb_die 'host lock inode mismatch'
    grep -Eq 'lock:.*FLOCK[[:space:]]+ADVISORY[[:space:]]+WRITE' "/proc/$BBB_PID/fdinfo/9" || bbb_die 'selected host does not own exclusive flock'
}

# ss only observes listeners: do not consume the host's single NCP connection.
# A listener is transport availability, not proof that the MAC/RCP is ready.
deadline=$((SECONDS + 30))
while :; do
    bbb_selected_host
    exe=$(readlink -- "/proc/$BBB_PID/exe" 2>/dev/null) || bbb_die 'host exited'
    listeners=$(ss -H -ltnp "sport = :$BBB_PORT") || bbb_die 'ss listener inspection failed'
    if [[ -n $listeners ]]; then
        [[ $exe == "$BBB_BIN" ]] || bbb_die 'listener appeared before expected host executable'
        [[ $listeners != *$'\n'* ]] || bbb_die "multiple listeners on port $BBB_PORT"
        [[ $listeners =~ pid=([0-9]+), ]] || bbb_die 'ss did not expose listener PID (root /proc access required)'
        [[ ${BASH_REMATCH[1]} == "$BBB_PID" ]] || bbb_die "port $BBB_PORT belongs to another process"
        [[ ${listeners#*pid=} != *pid=* ]] || bbb_die 'listener shared by multiple processes'
        # Host creates AF_INET6: accept wildcard or explicit IPv6 loopback.
        [[ $listeners =~ [[:space:]](\[::\]|\[::1\]|\*):$BBB_PORT[[:space:]] ]] || bbb_die 'selected listener does not expose IPv6 loopback'
        break
    fi
    (( SECONDS < deadline )) || bbb_die "host did not listen on port $BBB_PORT within 30 seconds"
    sleep 1
done
bbb_selected_host
[[ $(readlink -- "/proc/$BBB_PID/exe") == "$BBB_BIN" ]] || bbb_die 'expected host exited before daemon launch'
printf 'Host PID %s owns port %s; this is not a MAC-ready assertion.\n' "$BBB_PID" "$BBB_PORT"
[[ -s $BBB_ROOT/cfg/wpantund.conf ]] || bbb_die 'Missing package daemon config'
args=(-c "$BBB_ROOT/cfg/wpantund.conf" -o Config:NCP:DriverName spinel -o Config:NCP:SocketPath "tcp:[::1]:$BBB_PORT" -o Config:TUN:InterfaceName wfan0)
# Address selection remains in the operator's approved installed configuration.
export DBUS_SYSTEM_BUS_ADDRESS=unix:path=/run/dbus/system_bus_socket
exec "$BBB_ROOT/sbin/wfantund" "${args[@]}"
