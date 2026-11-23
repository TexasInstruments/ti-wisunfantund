#!/bin/bash
# Explicitly install only the checksummed system D-Bus policy.
set -euo pipefail
replace=false
case $# in
  0) ;;
  1) [[ $1 == --replace-policy ]] || { printf 'Usage: install-system-files.sh [--replace-policy]\n' >&2; exit 2; }; replace=true ;;
  *) printf 'Usage: install-system-files.sh [--replace-policy]\n' >&2; exit 2 ;;
esac
[[ $EUID == 0 ]] || { printf 'Run this setup command with sudo.\n' >&2; exit 1; }
script=$(realpath -s -- "$0")
for input in "$script" "$(dirname -- "$script")/preflight.sh"; do
  path=$input
  while :; do
    [[ -e $path && ! -L $path ]] || { printf 'Unsafe path: %s\n' "$path" >&2; exit 1; }
    mode=$(stat -c '%a' -- "$path")
    (( (8#$mode & 0022) == 0 )) || { printf 'Writable package ancestor: %s\n' "$path" >&2; exit 1; }
    [[ $path == / ]] && break
    path=$(dirname -- "$path")
  done
done
source "$(dirname -- "$script")/preflight.sh"
bbb_role br
bbb_init
bbb_bundle
policy="$BBB_ROOT/system/wpantund-dbus.conf"
bbb_safe_path "$policy"
python3 -I - "$policy" <<'PY'
import sys, xml.etree.ElementTree as ET
root = ET.parse(sys.argv[1]).getroot()
if root.tag != 'busconfig' or not any(e.attrib.get('own') == 'org.wpantund' for e in root.iter('allow')):
    raise SystemExit('Invalid expected wfantund D-Bus policy')
PY
directory=/etc/dbus-1/system.d
bbb_safe_path "$directory"
target="$directory/wpantund.conf"
if [[ -e $target || -L $target ]]; then
  bbb_safe_path "$target"
  if cmp -s "$policy" "$target"; then
    printf 'Matching D-Bus policy already installed.\n'
    exit 0
  fi
  [[ $replace == true ]] || { printf 'Existing D-Bus policy differs. Review it; use --replace-policy only after approval.\n' >&2; exit 1; }
  cp -p -- "$target" "$target.bbb-backup-$(date -u +%Y%m%dT%H%M%S)-$$"
fi
install -o root -g root -m 0644 -- "$policy" "$target"
printf 'Installed %s. No service restarted.\n' "$target"
printf 'Ask the system bus to reload policy: sudo dbus-send --system --type=method_call --print-reply --dest=org.freedesktop.DBus /org/freedesktop/DBus org.freedesktop.DBus.ReloadConfig\n'
