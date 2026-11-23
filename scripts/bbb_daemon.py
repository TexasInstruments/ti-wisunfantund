"""Build wfantund/wfanctl in an isolated ARM hard-float autotools workspace."""
import os
import fcntl
import hashlib
import json
import tarfile
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import tempfile


_ROOT_INPUTS = (
    "configure.ac", "Makefile.am", "pre.am", "bootstrap.sh", ".default-version",
    "doxygen.cfg.in", "LICENSE", "AUTHORS", "CHANGELOG",
)
_SOURCE_ROOTS = ("src", "third_party", "m4", "doc", "etc")
# These input templates may be ignored; generated Makefile/config templates are not inputs.
_AUX_INPUTS = ("doxygen.cfg.in", "src/version.c.in", "src/ipc-dbus/wpantund.conf.in")


DBUS_SHA256 = "f77620140ecb4cdc67f37fb444f8a6bea70b5b6461f12f1cbe2cec60fa7de5fe"
DBUS_URL = "https://dbus.freedesktop.org/releases/dbus/dbus-1.12.20.tar.gz"


def verify_dbus_archive(archive):
    if hashlib.sha256(Path(archive).read_bytes()).hexdigest() != DBUS_SHA256:
        raise ValueError("D-Bus source checksum differs from the pinned release")


def dbus_cache_valid(prefix, identity):
    try:
        metadata = json.loads((prefix / ".build-info.json").read_text())
        if metadata["identity"] != identity:
            return False
        return all((prefix / name).is_file()
                   and hashlib.sha256((prefix / name).read_bytes()).hexdigest() == digest
                   for name, digest in metadata["artifacts"].items()) and bool(metadata["artifacts"])
    except (OSError, ValueError, KeyError):
        return False


def prepare_dbus(root, compilers, sysroot, jobs):
    """Download, verify and cache the static client library automatically."""
    cache = Path(root) / "build-bbb/dependencies"
    cache.mkdir(parents=True, exist_ok=True)
    identity = {"compiler": compilers["c"], "sysroot": str(sysroot) if sysroot else None,
                "archive_sha256": DBUS_SHA256, "socket": "/run/dbus/system_bus_socket"}
    key = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()[:16]
    prefix = cache / ("dbus-1.12.20-" + key)
    with (cache / (key + ".lock")).open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if dbus_cache_valid(prefix, identity):
            print("[BBB] Reusing verified static D-Bus client library", flush=True)
            return prefix
        archive = cache / "dbus-1.12.20.tar.gz"
        if not archive.exists():
            if not shutil.which("curl"):
                raise ValueError("curl is required for the first D-Bus source download")
            with tempfile.TemporaryDirectory(prefix="download-", dir=cache) as directory:
                candidate = Path(directory) / "archive.tar.gz"
                subprocess.run(["curl", "--fail", "--location", "--retry", "2", "--connect-timeout", "30",
                                "--max-time", "300", "--output", str(candidate), DBUS_URL], check=True)
                verify_dbus_archive(candidate)
                os.replace(candidate, archive)
        verify_dbus_archive(archive)
        with tempfile.TemporaryDirectory(prefix="dbus-build-", dir=cache) as directory:
            workspace = Path(directory)
            extraction = workspace / "source"
            extraction.mkdir()
            with tarfile.open(archive) as stream:
                members = stream.getmembers()
                for member in members:
                    target = (extraction / member.name).resolve()
                    if (Path(member.name).is_absolute() or not target.is_relative_to(extraction)
                            or not (member.isfile() or member.isdir() or member.issym())):
                        raise ValueError("Unsafe D-Bus archive entry")
                    if member.issym() and not (target.parent / member.linkname).resolve().is_relative_to(extraction):
                        raise ValueError("Unsafe D-Bus archive link")
                stream.extractall(extraction, members=members)
            source = extraction / "dbus-1.12.20"
            build = workspace / "build"
            build.mkdir()
            env = {k: v for k, v in os.environ.items()
                   if k not in {"CPATH", "C_INCLUDE_PATH", "CPLUS_INCLUDE_PATH", "LIBRARY_PATH",
                                "CC", "CXX", "CFLAGS", "CPPFLAGS", "LDFLAGS", "CONFIG_SITE"}
                   and not k.startswith("PKG_CONFIG")}
            flags = "-O2 -mcpu=cortex-a8 -mfpu=neon -mfloat-abi=hard"
            if sysroot:
                flags += " --sysroot=" + shlex.quote(str(sysroot))
            env.update(CC=compilers["c"]["path"], CFLAGS=flags, CONFIG_SITE="/dev/null",
                       PKG_CONFIG_LIBDIR="/nonexistent", PKG_CONFIG_PATH="",
                       # Configure also describes bus targets; we build/install
                       # only dbus/, whose client library does not use Expat.
                       EXPAT_CFLAGS=" ", EXPAT_LIBS="-lexpat")
            # Use a stable final prefix while staging installation off to the side.
            command = [source / "configure", "--host=" + compilers["c"]["target"], "--prefix=" + str(prefix),
                       "--with-system-socket=/run/dbus/system_bus_socket", "--disable-shared", "--enable-static",
                       "--disable-systemd", "--disable-tests", "--disable-installed-tests", "--disable-xml-docs",
                       "--disable-doxygen-docs", "--without-x", "--disable-selinux", "--disable-apparmor",
                       "--disable-libaudit"]
            _run(command, cwd=build, env=env)
            _run(["make", "-C", "dbus", "-j", jobs], cwd=build, env=env)
            stage = workspace / "install"
            _run(["make", "-C", "dbus", "DESTDIR=" + str(stage), "install"], cwd=build, env=env)
            _run(["make", "DESTDIR=" + str(stage), "install-pkgconfigDATA"], cwd=build, env=env)
            result = stage / str(prefix).lstrip("/")
            licenses = result / "share/dbus-static-source"
            licenses.mkdir(parents=True)
            for name in ("COPYING", "AUTHORS"):
                shutil.copy2(source / name, licenses / name)
            shutil.copy2(archive, licenses / archive.name)
            artifacts = {str(p.relative_to(result)): hashlib.sha256(p.read_bytes()).hexdigest()
                         for p in result.rglob("*") if p.is_file()}
            (result / ".build-info.json").write_text(json.dumps({"identity": identity, "artifacts": artifacts}, indent=2) + "\n")
            if prefix.exists():
                # Only this exact script-owned cache entry is replaced after success.
                shutil.rmtree(prefix)
            shutil.move(str(result), prefix)
        return prefix


def dependency_environment(sysroot):
    """Return target-only pkg-config settings without reading/changing os.environ."""
    if sysroot is None:
        raise ValueError("Building wfantund requires an explicit target sysroot")
    target = Path(sysroot).resolve()
    if not target.is_dir() or target == Path("/"):
        raise ValueError("Daemon sysroot must be an existing target directory, not /")
    directories = (
        "usr/lib/arm-linux-gnueabihf/pkgconfig", "lib/arm-linux-gnueabihf/pkgconfig",
        "usr/lib/pkgconfig", "lib/pkgconfig", "usr/share/pkgconfig",
        "usr/local/lib/pkgconfig", "usr/local/share/pkgconfig", "lib/pkgconfig",
    )
    for package in ("dbus-1",):
        if not any((target / directory / f"{package}.pc").is_file() for directory in directories):
            raise ValueError(f"Target {package}.pc missing in sysroot {target}")
    return {
        "PKG_CONFIG_SYSROOT_DIR": str(target),
        "PKG_CONFIG_LIBDIR": os.pathsep.join(str(target / item) for item in directories),
        "PKG_CONFIG_PATH": "",
        "PKG_CONFIG_DIR": "",
    }


def _run(arguments, *, cwd, env, capture=False):
    arguments = [str(item) for item in arguments]
    print(f"[wfantund] {cwd}: {shlex.join(arguments)}", flush=True)
    result = subprocess.run(arguments, cwd=cwd, env=env, check=True,
                            stdout=subprocess.PIPE if capture else None, text=True)
    return result.stdout.strip() if capture else None


def _snapshot(root, destination):
    tracked = subprocess.run(
        ["git", "-C", str(root), "ls-files", "-z", "--", *_ROOT_INPUTS, *_SOURCE_ROOTS],
        check=True, stdout=subprocess.PIPE,
    ).stdout
    inputs = {Path(os.fsdecode(item)) for item in tracked.split(b"\0") if item}
    inputs.update(item.relative_to(root) for item in (root / "m4").glob("*.m4"))
    inputs.update(Path(item) for item in _AUX_INPUTS if (root / item).is_file())
    for relative in sorted(inputs):
        if (any(part in {".libs", ".deps", "autom4te.cache", "logs", "linux-host", "ti-wisun-webapp"}
                or "sdk" in part.lower() for part in relative.parts)
                or relative.name in {"Makefile", "Makefile.in", "config.status", "config.h", "config.h.in"}
                or relative.suffix in {".o", ".lo", ".la", ".a", ".so", ".log"}):
            continue
        source = root / relative
        if not source.exists():  # Respect tracked deletions in the current worktree.
            continue
        if not source.resolve().is_relative_to(root):
            raise ValueError(f"Source input points outside the repository: {source}")
        if not source.is_file():
            raise ValueError(f"Expected a source file, not a submodule/directory: {source}")
        output = destination / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        # Copy current bytes, not git's index/HEAD, and never retain live-tree symlinks.
        shutil.copy2(source, output)
    for name in (*_ROOT_INPUTS[:5], *_AUX_INPUTS, "m4/nl.m4", "src/version.h"):
        if not (destination / name).is_file():
            raise ValueError(f"Missing daemon autotools input: {root / name}")


def build_daemon(root, work, compilers, sysroot, jobs, dbus_prefix):
    """Return a DESTDIR tree containing the cross-built daemon and CLI.

    compilers is the builder's {'c': compiler_info, 'cxx': compiler_info} mapping.
    All generated files remain in a fresh directory below work; no live-tree
    configure, make or autoreconf commands are run.
    """
    dependencies = dependency_environment(dbus_prefix)
    target_sysroot = Path(sysroot).resolve() if sysroot else None
    dependencies["PKG_CONFIG_SYSROOT_DIR"] = ""
    if not isinstance(jobs, int) or isinstance(jobs, bool) or jobs < 1:
        raise ValueError("Daemon build jobs must be a positive integer")
    cc, cxx = compilers["c"], compilers["cxx"]
    if (not re.fullmatch(r"arm[^\s]*linux[^\s]*gnueabihf", cc["target"])
            or cc["target"] != cxx["target"] or cc["version"] != cxx["version"]):
        raise ValueError("Daemon requires matching ARM Linux hard-float C/C++ compilers")
    for tool in ("git", "autoreconf", "make", "pkg-config", cc["path"], cxx["path"]):
        if not shutil.which(str(tool)):
            raise ValueError(f"Missing daemon build tool: {tool}")
    root, work = Path(root).resolve(), Path(work).resolve()
    work.mkdir(parents=True, exist_ok=True)
    workspace = Path(tempfile.mkdtemp(prefix="daemon-", dir=work))
    source, build, stage = (workspace / name for name in ("source", "build", "stage"))
    for directory in (source, build, stage):
        directory.mkdir()

    # Do not let native compiler search paths, configure caches or dependency
    # overrides bypass the explicit sysroot and target pkg-config metadata.
    cleared = {
        "CPATH", "C_INCLUDE_PATH", "CPLUS_INCLUDE_PATH", "OBJC_INCLUDE_PATH",
        "LIBRARY_PATH", "COMPILER_PATH", "GCC_EXEC_PREFIX", "LD_LIBRARY_PATH",
        "CONFIG_SITE", "MAKEFLAGS", "MFLAGS", "DESTDIR", "LIBS", "CPPFLAGS",
        "CFLAGS", "CXXFLAGS", "LDFLAGS", "CC", "CXX", "CPP", "CXXCPP", "LD",
        "AR", "RANLIB", "STRIP", "NM",
    }
    prefixes = ("PKG_CONFIG", "DBUS_", "LIBREADLINE_", "BOOST_", "CONNMAN_", "GLIB_", "ac_cv_")
    env = {key: value for key, value in os.environ.items()
           if key not in cleared and not key.startswith(prefixes)}
    env.update(dependencies)
    env.update(PKG_CONFIG=shutil.which("pkg-config"), CONFIG_SITE="/dev/null", CONFIG_SHELL="/bin/bash")
    for package in ("dbus-1",):
        if not any((Path(directory) / f"{package}.pc").is_file()
                   for directory in dependencies["PKG_CONFIG_LIBDIR"].split(os.pathsep)):
            raise ValueError(f"Target {package}.pc missing in {target_sysroot}; install target development files")
    _run([env["PKG_CONFIG"], "--print-errors", "--exists", "dbus-1 >= 1.4"], cwd=work, env=env)
    for package in ("dbus-1",):
        pcdir = _run([env["PKG_CONFIG"], "--variable=pcfiledir", package], cwd=work, env=env, capture=True)
        if not Path(pcdir).resolve().is_relative_to(Path(dbus_prefix).resolve()):
            raise ValueError(f"Refusing non-target {package} pkg-config directory: {pcdir}")
    env["DBUS_CFLAGS"] = _run([env["PKG_CONFIG"], "--cflags", "dbus-1"], cwd=work, env=env, capture=True)
    env["DBUS_LIBS"] = _run([env["PKG_CONFIG"], "--libs", "--static", "dbus-1"], cwd=work, env=env, capture=True)
    flags = "-mcpu=cortex-a8 -mfpu=neon -mfloat-abi=hard"
    if target_sysroot:
        flags += f" --sysroot={shlex.quote(str(target_sysroot))}"
    env.update(CC=shlex.quote(str(cc["path"])), CXX=shlex.quote(str(cxx["path"])),
               CFLAGS=f"{flags} -g -O2", CXXFLAGS=f"{flags} -g -O2", LDFLAGS=f"{flags} -static", CPPFLAGS="")
    for variable, tool in (("AR", "ar"), ("RANLIB", "ranlib")):
        program = _run([cc["path"], f"-print-prog-name={tool}"], cwd=work, env=env, capture=True)
        executable = shutil.which(program)
        if not executable:
            raise ValueError(f"Compiler's {tool} tool is unavailable: {program}")
        env[variable] = shlex.quote(executable)

    _snapshot(root, source)
    _run(["autoreconf", "--verbose", "--force", "--install"], cwd=source, env=env)
    build_target = _run(["/bin/sh", source / "m4/config.guess"], cwd=source, env=env, capture=True)
    _run(["/bin/bash", source / "configure", f"--build={build_target}", f"--host={cc['target']}",
          "--prefix=/usr/local", "--sysconfdir=/etc", "--with-dbusconfdir=/etc",
          "--with-dbusdatadir=/usr/share", "--with-boost=internal", "--without-readline",
          "--without-connman", "--enable-ncp-spinel=default", "--disable-ncp-dummy",
          "--enable-static-link-ncp-plugin=spinel", "--disable-shared", "--enable-static"],
         cwd=build, env=env)
    # Static plugin linkage avoids a build-directory plugin RPATH; system
    # dependencies remain dynamically linked for the matching target image.
    static_links = ["wfantund_LDFLAGS=-all-static", "LDFLAGS=-all-static"]
    _run(["make", "-C", build / "src", "-j", jobs, *static_links], cwd=build, env=env)
    _run(["make", "-C", build / "src", f"DESTDIR={stage}", *static_links, "install"], cwd=build, env=env)
    return stage
