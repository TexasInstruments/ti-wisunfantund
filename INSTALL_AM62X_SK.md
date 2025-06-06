# `wfantund` Installation Guide on TI AM62x

`wfantund` is derived from `wpantund` and modified to meet the needs of TI Wi-SUN FAN Solution.

This document describes the process of building and installing
`wfantund` on the TI AM62x EVM (https://www.ti.com/tool/SK-AM62B-P1). Note that this guide assumes you'll be running everything directly on your host OS, not through Docker. 

## AM62x Linux Development Environment Setup

- Install Processor SDK Linux for AM62x EVM. Recommended Version: 11.01.05.03  
  (https://dr-download.ti.com/software-development/software-development-kit-sdk/MD-PvdSyIiioq/11.01.05.03/ti-processor-sdk-linux-am62xx-evm-11.01.05.03-Linux-x86-Install.bin)
- **Preferred Method:** Setup all tools and set custom boot & rootfile systems as follows:

```
	mkdir <SDK_PATH>/targetNFS
	cd 	<SDK_PATH>/targetNFS
	tar -xvf  <SDK_PATH>/filesystem/am62xx-evm/tisdk-default-image-am62xx-evm.rootfs.tar.xz
```

- **Alternate Method:** Run `./setup.sh` in the AM62x SDK

  - **Important:** _Default targetNFS uses the tisdk-docker image. It is recommend to use the tisdk-default image_
  - Set up root filesystem at default location `<SDK_PATH>/targetNFS`

## Preparation of AM62x SD Card Image:

- Perform steps in ti-wisun-webapp/README.md to install updated npm/node versions
- Download lib-coap from https://github.com/obgm/libcoap/tree/release-4.3.0  
  (Note: This is needed for AM62x. AM62x native SDK does not provide support to lib coap today.)
- Setup the AutoConf dependencies
  sudo apt-get install autoconf autoconf-archive
- run `setup_AM62x_fileSystem.sh <AM64_SDK_PATH> <LIB_COAP DOWNLOAD PATH>`
  - The Script performs the following
    - Cross compiles to AM62x platform
    - Sets up the webserver components and service start scripts
    - Sets the root file system for AM62x under <SDK_PATH>/targetNFS
- Insert SD Card into PC & Call bin/create-sdcard.sh script provided in AM62x SDK with root privileges
  - Script will automatically partition the SD Card and prepare it for AM62x (select atleast 2 partitions)
  - Script will ask for boot folder, Linux Kernel images and root files ystem
    - Boot: recommend to provide pre-built boot: <SDK_PATH>/board-support/prebuilt-images/am62xx-evm
    - Linux Kernel: Use the option that allows Kernel images to be used from the root filesystem
    - RootFileSystem: Specify the path to prepared root file system (<SDK_PATH>/targetNFS)

## Preparation of TI CC13xx Images:

- Download TI CC13xx_26Xx SDK from https://www.ti.com/tool/download/SIMPLELINK-CC13XX-CC26XX-SDK
- Compile default project Binaries for
  _ BR NWP Image on CC13x2R7 (ns_br)
  _ Node CoAP image on CC13x2R7 (ns*node_coap)
  Refer to \*\*http://dev.ti.com/wisunsla*\_ for information on compiling out of box images and flashing to TI Launch Pads

## TI Wi-SUN FAN OOB Demo:

- Insert SD card in AM62x SK, connect BR NWP to its USB Port & Power On
- AM62x will boot and automatically start the BR and ti-wisun-webapp
  _*(Note: This may take up to 2 minutes)*_
- Use Mobile Phone or PC to search for WiFi Access Point TI AM62xsk_AP
- Connect to WiFi using default password (tiwilink8)
- Power on the two (or more) TI CC13x2R7 Launchpads with OOB node CoAP examples 
  (Green LED will blink fast to indicate it is trying to join the network)
- Open Web-browser and go to 192.168.43.1:8035
- Wait for the Wi-SUN router nodes to Join
  - The Green LED will slow down the rate at which it blinks as it gets closer to joining the Border Router
  - The Green LED will stop blinking after joining the network
  - _*Note: This may take around 3 - 5 minutes*_

_*User can configure and monitor the network*_

### Trouble Shooting OOB Demo

The `setup_AM62x_fileSystem.sh` sets up the run configuration directories with an init script for running the
ti-wisun-webapp on boot.

If the nodes do not join as expected after _~5-7 minutes_ one can
restart wfantund as follows:

- Simply unplug and replug the Wi-SUN Border Router NWP device.

  - It will trigger restart wfantund execution from the webapp
  - Remember to restart the nodes as the Border Router will be re-started

## Cross Compiling for AM62x

The setup_AM62x_fileSystem.sh script performs the following cross compilation steps for wfantund and lib-coap. The steps are provided here for reference.

### Wfantund compiling & setup instructions

From `wfantund` base folder:

```
#Set the toolchain & other cross-compile environment by using SDK environment setup
source <SDK_PATH>/linux-devkit/environment-setup-aarch64-oe-linux

#run the bootstap.sh
sudo ./bootstrap.sh

# configure for aarch-64
./configure --sysconfdir=/etc --host=aarch64

#if there were precious makes performed, it is recommend to do a make clean
make clean

# cross compile
sudo --preserve-env=PATH make

# Install the compiled wfantund and wfanctl to the "target's root file system"
sudo make DESTDIR=<SDK_PATH>/targetNFS install
```

### Cross Compiling libcoap

Download libcoap package from https://github.com/obgm/libcoap/tree/release-4.3.0

```
# Starting a clean build
sudo ./autogen.sh --clean

# Set the toolchain & other cross-compile environment by using SDK environment setup
source <SDK_PATH>/linux-devkit/environment-setup-aarch64-oe-linux

# Run autogen
sudo ./autogen.sh

# Configure for aarch64
./configure --host=aarch64-linux  --target=aarch64-linux --prefix=<SDK_PATH>/targetNFS -disable-doxygen --disable-manpages

# compile the software for target
make

# lib-coap make install uses the PATH ENV obtained from source command. Hence, preserve it when calling make install using sudo. DESTDIR is obtained from the prefix option used in configure command
sudo --preserve-env=PATH make install
```
