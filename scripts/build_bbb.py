#!/usr/bin/env python3
"""Cross-build and package Docker-free BeagleBone Black host runtimes."""
import argparse
import importlib.util
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import struct
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
ROLES = ("br", "rn")


def run(arguments, **kwargs):
    return subprocess.run([str(arg) for arg in arguments], check=True, **kwargs)


def capture(arguments):
    return run(arguments, capture_output=True, text=True).stdout.strip()


def safe_label(value):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,79}", value) or ".." in value:
        raise ValueError("Profile/release must be a simple label without spaces or paths")
    return value


def validate_sdk(sdk):
    for suffix in ("source/ti/ti_wisunfan/rcp/rcp_host.c",
                   "source/third_party/ti_wisunfan/mbedtls/src/aes.c",
                   "source/third_party/mbed/nanostack/sal-stack-nanostack/nanostack/mac_api.h"):
        if not (sdk / suffix).is_file():
            raise ValueError(f"SDK file missing: {sdk / suffix}")
    notifications = sdk / "source/ti/ti_wisunfan/ncp_interface/src/ncp/ncp_base_mtd.cpp"
    if not notifications.is_file() or any(symbol not in notifications.read_text()
                                         for symbol in ("ncp_notify_tcp_rx", "ncp_notify_tcp_event")):
        raise ValueError("SDK is incompatible with this host branch: missing NCP TCP notifications; use a matching SDK (8.33 tested natively)")


def compiler_info(command):
    executable = shutil.which(command)
    if not executable:
        raise ValueError(f"Missing compiler {command}; install gcc-arm-linux-gnueabihf and g++-arm-linux-gnueabihf")
    target = capture([executable, "-dumpmachine"])
    if not re.fullmatch(r"arm[^\s]*linux[^\s]*gnueabihf", target):
        raise ValueError(f"Wrong compiler target {target}: require ARM Linux hard-float, not x86/AArch64")
    return {"path": executable, "target": target,
            "version": capture([executable, "-dumpfullversion", "-dumpversion"]),
            "sysroot": capture([executable, "-print-sysroot"])}


def validate_elf_header(binary):
    data = binary.read_bytes()[:52]
    if len(data) != 52 or data[:7] != b"\x7fELF\x01\x01\x01":
        raise ValueError(f"Not a little-endian ELF32 binary: {binary}")
    if struct.unpack_from("<H", data, 18)[0] != 40:
        raise ValueError(f"Not an ARM binary: {binary}")
    flags = struct.unpack_from("<I", data, 36)[0]
    if flags & 0xFF000000 != 0x05000000 or not flags & 0x400 or flags & 0x200:
        raise ValueError(f"Not ARM EABI5 hard-float: {binary}")


def inspect_binary(binary, readelf):
    validate_elf_header(binary)
    program = capture([readelf, "-l", binary])
    if "INTERP" in program:
        raise ValueError(f"Static bundle contains a dynamic loader: {binary}")
    dynamic = capture([readelf, "-d", binary])
    if re.search(r"\((?:NEEDED|RPATH|RUNPATH)\)", dynamic):
        raise ValueError(f"Static bundle contains dynamic dependencies: {binary}")
    notes = capture([readelf, "-n", binary])
    match = re.search(r"OS: Linux, ABI: ([0-9.]+)", notes)
    minimum = match.group(1) if match else None
    if minimum and tuple(map(int, minimum.split("."))) > (4, 19, 0):
        raise ValueError(f"Runtime minimum kernel {minimum} exceeds BBB Linux4.19")
    return {"static": True, "libraries": [], "minimum_kernel_note": minimum}


def config_text(role, device, gpio, speed):
    port = 4902 if role == "br" else 4903
    text = (f"[spi-cfg]\nbackend = spidev\ndevname = {device}\nspeed = {speed}\n"
            f"int-gpio = {gpio}\nlog-level = info\nstats-interval = 10\n\n[ncp-cfg]\nport = {port}\n")
    if role == "br":
        text += ("\n[dhcp-cfg]\nexternal-server-enabled = false\nexternal-server-address = 2020:ABCD::\n"
                 "\n[radius-cfg]\nexternal-server-enabled = false\nexternal-server-address = 2020:ABCD::\n")
    return text


def write_checksums(directory):
    lines = []
    for item in sorted(directory.rglob("*")):
        if item.is_symlink():
            raise ValueError(f"Bundle symlink not allowed: {item}")
        if item.is_file() and item.name != "SHA256SUMS":
            digest = hashlib.sha256(item.read_bytes()).hexdigest()
            lines.append(f"{digest}  {item.relative_to(directory).as_posix()}\n")
    (directory / "SHA256SUMS").write_text("".join(lines))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sdk", type=Path, required=True, help="Matching TI SDK source directory")
    parser.add_argument("--target-profile", required=True, help="Target OS/image label; not a compatibility guarantee")
    parser.add_argument("--sysroot", type=Path, help="Optional compiler-matched target sysroot")
    parser.add_argument("--dbus-prefix", type=Path, help="Optional prebuilt static libdbus prefix; otherwise prepared automatically")
    parser.add_argument("--cc", default="arm-linux-gnueabihf-gcc")
    parser.add_argument("--cxx", default="arm-linux-gnueabihf-g++")
    parser.add_argument("--readelf", default="arm-linux-gnueabihf-readelf")
    parser.add_argument("--spi-device", default="/dev/spidev0.0")
    parser.add_argument("--int-gpio", type=int, default=60, help="Verified legacy sysfs global GPIO, not chip offset")
    parser.add_argument("--speed", type=int, default=1000000)
    parser.add_argument("--jobs", type=int, default=2)
    parser.add_argument("--release", help="Unique output label; existing releases are never overwritten")
    args = parser.parse_args(argv)
    profile = safe_label(args.target_profile)
    if not re.fullmatch(r"/dev/spidev[0-9]+\.[0-9]+", args.spi_device):
        raise ValueError("SPI device must be /dev/spidevB.C")
    if args.int_gpio < 0 or not 1 <= args.speed <= 4000000 or args.jobs < 1:
        raise ValueError("Require nonnegative global GPIO, speed 1..4000000 Hz and positive jobs")
    sdk = args.sdk.resolve()
    validate_sdk(sdk)
    compilers = {"c": compiler_info(args.cc), "cxx": compiler_info(args.cxx)}
    if compilers["c"]["target"] != compilers["cxx"]["target"] or compilers["c"]["version"] != compilers["cxx"]["version"]:
        raise ValueError("C and C++ compilers must have matching target and version")
    for tool in ("cmake", "ninja", args.readelf):
        if not shutil.which(tool):
            raise ValueError(f"Missing build tool: {tool}")
    sysroot = args.sysroot.resolve() if args.sysroot else None
    if sysroot and (not sysroot.is_dir() or sysroot == Path("/")):
        raise ValueError("Explicit sysroot must be an existing target directory, not /")
    spec = importlib.util.spec_from_file_location("bbb_daemon", ROOT / "scripts/bbb_daemon.py")
    daemon = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(daemon)
    if args.dbus_prefix:
        dbus_prefix = args.dbus_prefix.resolve()
        daemon.dependency_environment(dbus_prefix)
    else:
        dbus_prefix = None
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    label = safe_label(args.release or f"{profile}-{stamp}")
    output_root = ROOT / "build-bbb"
    if output_root.is_symlink():
        raise ValueError("build-bbb must not be a symlink")
    destination = output_root / ("bbb-runtime-" + label)
    if destination.exists():
        raise ValueError(f"Release already exists; choose a new label: {destination}")
    output_root.mkdir(exist_ok=True)
    if dbus_prefix is None:
        dbus_prefix = daemon.prepare_dbus(ROOT, compilers, sysroot, args.jobs)
    # Every invocation receives an independent CMake cache; never overwrite native builds.
    build = Path(tempfile.mkdtemp(prefix="compile-", dir=output_root))
    command = ["cmake", "-S", ROOT / "linux-host", "-B", build, "-G", "Ninja",
               f"-DCMAKE_TOOLCHAIN_FILE={ROOT / 'cmake/toolchains/bbb-armhf.cmake'}",
               f"-DCMAKE_C_COMPILER={compilers['c']['path']}",
               f"-DCMAKE_CXX_COMPILER={compilers['cxx']['path']}",
               f"-DWISUN_SDK_ROOT={sdk}", "-DENABLE_FTDI_SPI=OFF", "-DCMAKE_EXE_LINKER_FLAGS=-static"]
    if sysroot:
        command.append(f"-DBBB_SYSROOT={sysroot}")
    run(command)
    run(["cmake", "--build", build, "--target", *(f"wisun-rcp-host-{role}" for role in ROLES),
         "--parallel", args.jobs])
    reports = {role: inspect_binary(build / "bin" / f"wisun-rcp-host-{role}", args.readelf) for role in ROLES}
    daemon_stage = daemon.build_daemon(ROOT, build, compilers, sysroot, args.jobs, dbus_prefix)
    staged_files = {"sbin/wfantund": daemon_stage / "usr/local/sbin/wfantund",
                    "bin/wfanctl": daemon_stage / "usr/local/bin/wfanctl",
                    "system/wpantund-dbus.conf": daemon_stage / "etc/dbus-1/system.d/wpantund.conf"}
    for name, item in staged_files.items():
        if not item.is_file() or item.is_symlink():
            raise ValueError(f"Missing or unsafe staged daemon artifact: {item}")
        if name.startswith(("bin/", "sbin/")):
            reports[Path(name).name] = inspect_binary(item, args.readelf)
            if b"unix:path=/run/dbus/system_bus_socket\0" not in item.read_bytes():
                raise ValueError("Static libdbus has the wrong target socket; rebuild with --with-system-socket=/run/dbus/system_bus_socket")
    revision = capture(["git", "-C", ROOT, "rev-parse", "HEAD"])
    dirty = bool(capture(["git", "-C", ROOT, "status", "--porcelain", "--untracked-files=no"]))
    source_hash = hashlib.sha256()
    for directory in (ROOT / "linux-host", sdk / "source"):
        for item in sorted(directory.rglob("*")):
            if item.is_file() and item.suffix in {".c", ".cpp", ".h", ".hpp", ".cmake", ".opts"}:
                source_hash.update(str(item.relative_to(directory)).encode() + b"\0")
                source_hash.update(item.read_bytes())
    with tempfile.TemporaryDirectory(prefix="package-", dir=output_root) as temporary:
        stage = Path(temporary) / "bundle"
        stage.mkdir()
        (stage / "bin").mkdir()
        (stage / "cfg").mkdir()
        (stage / "scripts").mkdir()
        for role in ROLES:
            shutil.copy2(build / "bin" / f"wisun-rcp-host-{role}", stage / "bin")
            (stage / "bin" / f"wisun-rcp-host-{role}").chmod(0o755)
            (stage / "cfg" / f"bbb-{role}.cfg").write_text(config_text(role, args.spi_device, args.int_gpio, args.speed))
        for name, item in staged_files.items():
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target)
            target.chmod(0o755 if name.startswith(("bin/", "sbin/")) else 0o644)
        (stage / "cfg/wpantund.conf").write_text('Config:NCP:DriverName "spinel"\n')
        templates = ROOT / "scripts/bbb-runtime"
        for name in ("preflight.sh", "run-host.sh", "run-wfantund.sh", "install-system-files.sh"):
            shutil.copy2(templates / name, stage / "scripts" / name)
            (stage / "scripts" / name).chmod(0o755)
            run(["bash", "-n", stage / "scripts" / name])
        shutil.copy2(ROOT / "BBB.md", stage / "BBB.md")
        metadata = {"target_profile": profile, "architecture": "armv7-linux-gnueabihf", "host_commit": revision,
                    "tracked_worktree_dirty": dirty, "sdk": str(sdk), "source_inputs_sha256": source_hash.hexdigest(),
                    "compilers": compilers, "sysroot": str(sysroot) if sysroot else "compiler supplied",
                    "spi_device": args.spi_device, "int_gpio": args.int_gpio, "speed_hz": args.speed,
                    "build_command": [str(part) for part in command], "hardware_qualified": False, "linkage": "static", "target_kernel": "4.19.94-ti-r42",
                    "binaries": reports}
        (stage / "BUILD_INFO.json").write_text(json.dumps(metadata, indent=2) + "\n")
        (stage / "RUNTIME_REQUIREMENTS.txt").write_text(
            "ARMv7 32-bit armhf Linux; image label is not a compatibility guarantee.\n"
            "Applications are fully static; no target application shared libraries required. Kernel/device requirements still apply.\n"
            "Require TUN, IPv6 loopback, system D-Bus, spidev, GPIO sysfs and installed bundle D-Bus policy.\n"
            "Use one host role per RCP. Verify pinmux/wiring/firmware/frame limits independently.\n"
            + json.dumps(reports, indent=2) + "\n")
        licenses = stage / "LICENSES"
        licenses.mkdir()
        shutil.copy2(ROOT / "LICENSE", licenses / "WFANTUND-LICENSE")
        dependency_license = dbus_prefix / "share/dbus-static-source"
        if not dependency_license.is_dir():
            raise ValueError("Static D-Bus prefix must include share/dbus-static-source with license/source archive")
        shutil.copytree(dependency_license, licenses / "dbus-source")
        # Root launchers reject group/other-writable package paths. Normalize
        # generated modes independently of the workstation's umask.
        for item in stage.rglob("*"):
            item.chmod(0o755 if item.is_dir() or item.suffix == ".sh" or item.parent.name in {"bin", "sbin"}
                       else 0o644)
        stage.chmod(0o755)
        write_checksums(stage)
        (stage / "SHA256SUMS").chmod(0o644)
        os.rename(stage, destination)
    print(f"\nBBB runtime bundle: {destination}")
    print("Not hardware-qualified; verify target libraries, GPIO mapping and firmware before use.")
    print(f"scp -pr {shlex.quote(str(destination))} USER@BBB:/absolute/existing/wfantund/repo/")
    print("On BBB: sudo scripts/install-system-files.sh; scripts/preflight.sh br; sudo scripts/run-host.sh br")
    print("In another terminal: sudo scripts/run-wfantund.sh br; then sudo bin/wfanctl -I wfan0")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f"BBB build failed: {error}", file=sys.stderr)
        sys.exit(1)
