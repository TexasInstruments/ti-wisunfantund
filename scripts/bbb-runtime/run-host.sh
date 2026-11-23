#!/bin/bash
set -euo pipefail

# Validate arguments even for non-root callers, before any package is sourced.
[[ $# == 1 && ( $1 == br || $1 == rn ) ]] || { printf 'usage: run-host.sh {br|rn}\n' >&2; exit 1; }
(( EUID == 0 )) || { printf 'run-host.sh requires an operator-controlled root shell\n' >&2; exit 1; }
for tool in stat dirname realpath; do
    command -v "$tool" >/dev/null || { printf 'missing required tool: %s\n' "$tool" >&2; exit 1; }
done
# Validate this launcher and the library before executing copied package code.
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

# A single host lock covers both roles and stays open across exec.
exec 9<> "$BBB_RUN/host.lock"
flock -n 9 || bbb_die 'a host helper is already active (br and rn are mutually exclusive)'
# Never replace a host beneath an existing daemon helper.
exec 8<> "$BBB_RUN/daemon.lock"
flock -n 8 || bbb_die 'a daemon helper is active; stop it explicitly before starting a host'
bbb_processes host
bbb_processes daemon
[[ -z $(ss -H -ltn "sport = :$BBB_PORT") ]] || bbb_die "port $BBB_PORT already has a listener"

# The host stores relative runtime/NV files here, not in the copied bundle.
bbb_safe_path /var/lib
if [[ ! -e /var/lib/wisun && ! -L /var/lib/wisun ]]; then mkdir -m 700 /var/lib/wisun; fi
bbb_root_dir /var/lib/wisun
BBB_STATE="/var/lib/wisun/$BBB_ROLE"
bbb_root_dir "$BBB_STATE"
# Preserve all existing data, but refuse links and insecure pre-existing data.
while IFS= read -r -d '' path; do
    [[ ! -L $path && ( -d $path || -f $path ) && $(stat -c '%u:%h' "$path") == 0:* ]] || bbb_die "unsafe state entry: $path"
    bbb_safe_path "$path"
    if [[ -f $path ]]; then
        [[ $(stat -c '%h' "$path") == 1 ]] || bbb_die "hard-linked state file: $path"
    fi
done < <(find "$BBB_STATE" -mindepth 1 -print0)
BBB_TICKS=$(bbb_start_ticks "$$") || bbb_die 'cannot record host process identity'
printf 'wisun-bbb-v1\n%s\n%s\n%s\n%s\n%s\n%s\n' \
    "$BBB_ROLE" "$$" "$BBB_TICKS" "$BBB_BIN" "$BBB_CFG" "$BBB_PORT" > "$BBB_RUN/host.state"
flock -u 8
exec 8>&-
cd -- "$BBB_STATE"
printf 'Starting %s host; preserving state in %s.\n' "$BBB_ROLE" "$BBB_STATE"
exec "$BBB_BIN" "$BBB_CFG"
