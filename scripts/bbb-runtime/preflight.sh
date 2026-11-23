#!/bin/bash
# Read-only BBB checks. This file also supplies functions to the launchers.
set -euo pipefail

bbb_die() { printf 'bbb-runtime: %s\n' "$*" >&2; exit 1; }
bbb_role() {
    [[ $# == 1 && ( $1 == br || $1 == rn ) ]] || bbb_die "usage: ${0##*/} {br|rn}"
    BBB_ROLE=$1
    BBB_PORT=4902
    [[ $BBB_ROLE == br ]] || BBB_PORT=4903
}
bbb_tools() {
    local tool
    for tool in "$@"; do
        command -v "$tool" >/dev/null || bbb_die "missing target-image tool: $tool (provision separately)"
    done
}
bbb_init() {
    bbb_tools realpath dirname stat python3 sha256sum readelf uname getconf grep ip ss flock readlink find mkdir chmod sleep
    BBB_ROOT=$(realpath -- "$(dirname -- "${BASH_SOURCE[0]}")/..")
    BBB_BIN="$BBB_ROOT/bin/wisun-rcp-host-$BBB_ROLE"
    BBB_CFG="$BBB_ROOT/cfg/bbb-$BBB_ROLE.cfg"
    BBB_RUN=/run/wisun-bbb
}
# Bundle ownership need not be root: the operator explicitly trusts its owner.
# Every ancestor must nonetheless resist group/other modification when root runs.
bbb_safe_path() {
    local path=$1 mode
    [[ $path == /* ]] || path="$PWD/$path"
    [[ ! -L $path ]] || bbb_die "refuse symlink: $path"
    [[ -e $path ]] || bbb_die "missing path: $path"
    while :; do
        [[ ! -L $path ]] || bbb_die "refuse symlink ancestor: $path"
        mode=$(stat -c '%a' -- "$path")
        (( (8#$mode & 0022) == 0 )) || bbb_die "group/world-writable path: $path; stage a protected bundle"
        [[ $path == / ]] && break
        path=$(dirname -- "$path")
    done
}
bbb_bundle() {
    local line name digest required
    local -A covered=()
    [[ -f $BBB_ROOT/SHA256SUMS && -f $BBB_ROOT/BUILD_INFO.json ]] || bbb_die 'bundle requires SHA256SUMS and BUILD_INFO.json'
    [[ -f $BBB_BIN && -x $BBB_BIN && -f $BBB_CFG ]] || bbb_die "missing executable or config for $BBB_ROLE"
    # Reject checksum paths which escape the bundle or request GNU escaping.
    while IFS= read -r line || [[ -n $line ]]; do
        [[ $line =~ ^([[:xdigit:]]{64})\ [\ \*](.+)$ ]] || bbb_die 'invalid SHA256SUMS line'
        digest=${BASH_REMATCH[1]}; name=${BASH_REMATCH[2]}
        [[ $name != /* && $name != *\\* && $name != ../* && $name != */../* && $name != */.. && $name != . && $name != .. ]] || bbb_die "unsafe checksum path: $name"
        [[ -f $BBB_ROOT/$name ]] || bbb_die "missing checksum input: $name"
        covered[${name#./}]=1
        if (( EUID == 0 )); then bbb_safe_path "$BBB_ROOT/$name"; fi
    done < "$BBB_ROOT/SHA256SUMS"
    for required in "bin/wisun-rcp-host-$BBB_ROLE" "cfg/bbb-$BBB_ROLE.cfg" BUILD_INFO.json \
        scripts/preflight.sh scripts/run-host.sh scripts/run-wfantund.sh scripts/install-system-files.sh \
        sbin/wfantund bin/wfanctl cfg/wpantund.conf system/wpantund-dbus.conf; do
        [[ ${covered[$required]:-} == 1 ]] || bbb_die "SHA256SUMS must cover $required"
    done
    if (( EUID == 0 )); then
        bbb_safe_path "$BBB_ROOT/SHA256SUMS"
        bbb_safe_path "$BBB_BIN"
        bbb_safe_path "$BBB_CFG"
        bbb_safe_path "${BASH_SOURCE[0]}"
        bbb_safe_path "$0"
    fi
    (cd -- "$BBB_ROOT" && sha256sum --check --strict SHA256SUMS) || bbb_die 'bundle checksum failure'
    python3 -I -c 'import json,sys; x=json.load(open(sys.argv[1])); assert isinstance(x,dict), "metadata must be a JSON object"' \
        "$BBB_ROOT/BUILD_INFO.json" || bbb_die 'invalid BUILD_INFO.json'
}
bbb_config() {
    local values
    values=$(python3 -I - "$BBB_CFG" "$BBB_PORT" <<'PY'
import configparser, re, sys
c = configparser.ConfigParser(interpolation=None, inline_comment_prefixes=(";", "#"))
try:
    with open(sys.argv[1]) as f:
        c.read_file(f)
    assert c.get("spi-cfg", "backend").strip() == "spidev", "SPI backend must be spidev"
    device = c.get("spi-cfg", "devname").strip()
    assert re.fullmatch(r"/dev/spidev[0-9]+\.[0-9]+", device), "invalid spidev path"
    assert c.getint("ncp-cfg", "port") == int(sys.argv[2]), "wrong fixed role port"
    print(device)
except Exception as e:
    print("config: " + str(e), file=sys.stderr)
    sys.exit(1)
PY
    ) || bbb_die "invalid $BBB_CFG"
    BBB_SPI=$values
    [[ -c $BBB_SPI ]] || bbb_die "SPI device unavailable: $BBB_SPI (board provisioning required)"
}
bbb_target() {
    local header program deps
    [[ $(uname -m) == armv7l && $(getconf LONG_BIT) == 32 ]] || bbb_die 'requires armv7l with 32-bit userspace'
    header=$(LC_ALL=C readelf -h "$BBB_BIN") || bbb_die 'cannot read host ELF'
    grep -Eq 'Class:[[:space:]]+ELF32' <<< "$header" || bbb_die 'host is not ELF32'
    grep -Eq 'Machine:[[:space:]]+ARM([[:space:]]|$)' <<< "$header" || bbb_die 'host is not ARM'
    grep -q 'hard-float ABI' <<< "$header" || bbb_die 'host does not declare hard-float ABI'
    program=$(LC_ALL=C readelf -l "$BBB_BIN") || bbb_die 'cannot inspect program interpreter'
    ! grep -q INTERP <<< "$program" || bbb_die 'expected static binary without dynamic loader'
    deps=$(LC_ALL=C readelf -d "$BBB_BIN") || bbb_die 'cannot inspect static dependency table'
    ! grep -Eq '\((NEEDED|RPATH|RUNPATH)\)' <<< "$deps" || bbb_die 'unexpected shared-library dependency'
    python3 -I - "$(uname -r)" <<'PY'
import re, sys
match = re.match(r'(\d+)\.(\d+)', sys.argv[1])
if not match or tuple(map(int, match.groups())) < (3, 2):
    raise SystemExit('Kernel below validated static runtime minimum Linux3.2')
PY
}
bbb_services() {
    [[ -d /sys/class/gpio && -e /sys/class/gpio/export && -e /sys/class/gpio/unexport ]] || bbb_die 'sysfs GPIO interface unavailable'
    [[ -r /proc/sys/net/ipv6/conf/lo/disable_ipv6 ]] || bbb_die 'IPv6 loopback support unavailable'
    [[ $(< /proc/sys/net/ipv6/conf/lo/disable_ipv6) == 0 ]] || bbb_die 'IPv6 disabled on lo'
    ip -6 addr show dev lo | grep -Eq 'inet6 ::1/128' || bbb_die 'IPv6 ::1 missing on lo'
    [[ -c /dev/net/tun ]] || bbb_die '/dev/net/tun unavailable'
    [[ -S /run/dbus/system_bus_socket ]] || bbb_die 'system D-Bus socket unavailable'
    bbb_tools dbus-send
    dbus-send --system --type=method_call --print-reply --reply-timeout=3000 \
        --dest=org.freedesktop.DBus /org/freedesktop/DBus org.freedesktop.DBus.ListNames >/dev/null \
        || bbb_die 'cannot contact system D-Bus'
    local tool
    for tool in "$BBB_ROOT/sbin/wfantund" "$BBB_ROOT/bin/wfanctl"; do
        [[ -f $tool && -x $tool ]] || bbb_die "missing installed native tool: $tool"
        if (( EUID == 0 )); then bbb_safe_path "$tool"; fi
    done
}
bbb_preflight() {
    bbb_bundle; bbb_config; bbb_target; bbb_services
    local host_bin=$BBB_BIN item
    for item in "$BBB_ROOT/sbin/wfantund" "$BBB_ROOT/bin/wfanctl"; do
        BBB_BIN=$item; bbb_target
    done
    BBB_BIN=$host_bin
    [[ -f /etc/dbus-1/system.d/wpantund.conf ]] || bbb_die 'Install the bundle system D-Bus policy first'
    cmp -s "$BBB_ROOT/system/wpantund-dbus.conf" /etc/dbus-1/system.d/wpantund.conf || bbb_die 'Installed D-Bus policy differs; review/install bundle policy'
}

# Shared root coordination. Do not unlink locks: waiters must retain one inode.
bbb_root_dir() {
    local path=$1 mode
    if [[ ! -e $path && ! -L $path ]]; then mkdir -m 700 -- "$path" || bbb_die "cannot create $path"; fi
    [[ -d $path && ! -L $path && $(stat -c '%u' "$path") == 0 ]] || bbb_die "unsafe root directory: $path"
    bbb_safe_path "$path"
    mode=$(stat -c '%a' "$path")
    [[ $mode == 700 ]] || bbb_die "private directory must have mode 700: $path"
}
bbb_root_file() {
    local path=$1
    if [[ ! -e $path && ! -L $path ]]; then (set -o noclobber; : > "$path") || bbb_die "cannot create $path"; fi
    [[ -f $path && ! -L $path && $(stat -c '%u:%a:%h' "$path") == 0:600:1 ]] || bbb_die "unsafe root file: $path"
}
bbb_coordination() {
    umask 077
    bbb_safe_path /run
    bbb_root_dir "$BBB_RUN"
    bbb_root_file "$BBB_RUN/host.lock"
    bbb_root_file "$BBB_RUN/daemon.lock"
    bbb_root_file "$BBB_RUN/host.state"
}
bbb_processes() {
    local kind=$1 entry exe base
    for entry in /proc/[0-9]*/exe; do
        exe=$(readlink -- "$entry" 2>/dev/null) || continue
        base=${exe##*/}; base=${base% (deleted)}
        if [[ $kind == host && ( $base == wisun-rcp-host-br || $base == wisun-rcp-host-rn ) ]] || \
           [[ $kind == daemon && $base == wfantund ]]; then
            bbb_die "existing $kind process at ${entry%/exe}; stop it explicitly before launch"
        fi
    done
}
bbb_start_ticks() {
    python3 -I -c 'import sys; s=open("/proc/"+sys.argv[1]+"/stat").read(); print(s[s.rfind(")")+2:].split()[19])' "$1"
}
if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
    bbb_role "$@"
    bbb_init
    bbb_preflight
    printf 'Preflight passed for %s (port %s); hardware/MAC readiness is not established.\n' "$BBB_ROLE" "$BBB_PORT"
fi
