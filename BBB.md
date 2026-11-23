# Build and run Wi-SUN on BeagleBone Black with CC1407 RCP (Early Access)

> **Early access only. Not for production use.** CC1407 support on BeagleBone Black is still in development and we are improving the software as we progress. You may run into difficulties along the way.
> If you hit an issue or have feedback, please reach out and we'll do our best to support you.
>
> Existing functionality and CC13xx support are unaffected by this addition.

This is step 3 of the CC1407 flow in the main [README](README.md). Before starting, flash the `.bin` image from the [`artifacts/`](artifacts) folder (step 1 and 2 in the README) and wire the boards using [BBB_WIRING.md](BBB_WIRING.md).

Build on an Ubuntu 22.04 PC, copy one folder, and run on BBB. The applications are static; keep BBB's existing Debian image and system D-Bus. No Docker or application compilation is needed on BBB.

Prerequisites: a matching CC1407 RCP image already flashed, SPI/INT wired and configured, and access to the matching TI SDK. The build instructions require the source update containing `scripts/build_bbb.py`. Existing SPI communication errors must be resolved before normal network operation.

## 1. PC: install tools once

On Ubuntu 22.04, with administrator approval:

```bash
sudo apt-get update
sudo apt-get install git python3 build-essential cmake ninja-build \
  gcc-arm-linux-gnueabihf g++-arm-linux-gnueabihf \
  libc6-dev-armhf-cross binutils-arm-linux-gnueabihf \
  autoconf automake autoconf-archive libtool pkg-config curl ca-certificates

cd /tmp
rm -rf libgpiod-1.6.3*

SERVER="http://in.archive.ubuntu.com"
TARBALL="/ubuntu/pool/universe/libg/libgpiod/libgpiod_1.6.3.orig.tar.xz"
wget "${SERVER}${TARBALL}"

tar -xf libgpiod_1.6.3.orig.tar.xz
cd libgpiod-1.6.3	
cd /tmp/libgpiod-1.6.3
make distclean

ac_cv_func_malloc_0_nonnull=yes \
ac_cv_func_realloc_0_nonnull=yes \
./configure \
    --host=arm-linux-gnueabihf \
    --prefix=/usr/arm-linux-gnueabihf \
    --enable-static \
    --disable-shared \
    --disable-tools

make -j$(nproc)
sudo make install
```

Use the wfantund checkout containing the BBB build scripts. Install matching TI SDK 8.33.00.14 through your approved distribution. If it is installed elsewhere, replace the SDK path in the next command.

## 2. PC: build everything with one command

From the wfantund repository root:

```bash
python3 -I scripts/build_bbb.py \
  --sdk "$HOME/ti/simplelink_cc13xx_cc26xx_sdk_8_33_00_14" \
  --target-profile bbb-static --release release1
```

The command automatically downloads/checks the D-Bus source, builds the static client library, copies license/source files, and builds all four BBB programs. No manual mkdir, curl, extraction, configure, make or file-copy commands are needed. Verified dependencies are cached for subsequent builds. The first run needs network access using your approved proxy settings.

Output: `build-bbb/bbb-runtime-release1`. Use a new --release name when that folder already exists. Failures stop the build without publishing an incomplete runtime folder.

Default SPI device is /dev/spidev0.0, global INT GPIO60 and speed1MHz. If your verified board setup differs, add --spi-device, --int-gpio or --speed. SDK sources and example cfgs are not modified. Keep using a toolchain compatible with the verified GCC11 build; --cc/--cxx allow explicit compiler selection.

## 3. PC: copy to BBB

Replace BBB-IP and use the actual existing repository path:

```bash
scp -pr build-bbb/bbb-runtime-release1 \
  debian@BBB-IP:/home/debian/lprf-dallas-wisun-wfantund/
```

Do not copy over a running release. No SDK or build tools need to be copied.

## 4. BBB: setup once

```bash
cd ~/lprf-dallas-wisun-wfantund/
sha256sum -c SHA256SUMS
sudo ./scripts/install-system-files.sh
./scripts/preflight.sh br
```

Also make sure you setup spidev on your Beaglbone Black before proceeding

All checksums must say OK.


## 5. BBB: run in three terminals

You can change the spi configuration by editing either the cfg/bbb-br.cfg file or cfg/bbb-rn.cfg file

Terminal 1:

```bash
cd ~/lprf-dallas-wisun-wfantund/
sudo ./scripts/run-host.sh br
```

Leave it running. RCP initialization must succeed without repeated SPI errors.
Repeated spi errors indicate a wiring issue or the board might not be flashed with the right image.

Terminal 2:

```bash
cd ~/lprf-dallas-wisun-wfantund/
sudo ./scripts/run-wfantund.sh br
```

Terminal 3:

```bash
cd ~/lprf-dallas-wisun-wfantund/
sudo ./bin/wfanctl -I wfan0 status
sudo ./bin/wfanctl -I wfan0 get NCP:Version
```

Configure the approved network/region/PHY/channel settings if defaults do not match your peers, then:

```bash
sudo ./bin/wfanctl -I wfan0 set interface:up true
sudo ./bin/wfanctl -I wfan0 status
```

Use one command per invocation. No interactive prompt, environment workaround or piped command is needed.

## 6. Router Node and stopping

For RN use `rn` in preflight and both launchers. RN needs an existing compatible BR network. Run only one role on a single RCP.

Stop wfantund first, then Linux host with Ctrl-C. Keep NV and lock files. Network state is stored outside the package. For an update, copy a new release folder, validate it and restart from that folder.

Build/static/CLI checks have passed locally; reliable BBB SPI and RF operation still require target testing. Generated files and local tests are ignored and must not be committed.
