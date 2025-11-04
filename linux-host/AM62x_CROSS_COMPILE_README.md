# `wisun-rcp-host` Installation Guide on TI AM62x

This document describes the process of cross-compiling and running the `wisun-rcp-host` applications for the TI AM62x EVM (https://www.ti.com/tool/SK-AM62B-P1). Note that this guide assumes you'll be running everything directly on your host OS, not through Docker. 

## AM62x Linux Development Environment Setup

- Install Processor SDK Linux for AM62x EVM. Recommended Version: 11.01.05.03  
  (https://dr-download.ti.com/software-development/software-development-kit-sdk/MD-PvdSyIiioq/11.01.05.03/ti-processor-sdk-linux-am62xx-evm-11.01.05.03-Linux-x86-Install.bin)
- Note that the SDK includes CMake and Ninja, so no additional build tooling packages should be necessary.

## wisun-rcp-host compiling & setup instructions

From `linux-host` base folder:

```
# Set the toolchain & other cross-compile environment by using SDK environment setup
source <SDK_PATH>/linux-devkit/environment-setup-aarch64-oe-linux

# Remove existing CMake files if you've previously built the application for AMD64 (note that sudo may be necessary depending on if CMake was run in a container as root user or not)
rm -f CMakeCache.txt && rm -rf CMakeFiles/

# Generate CMake Files with cross compile environment active
cmake -G Ninja .

# cross compile
ninja
```

After building, the `wisun-rcp-host-br` and `wisun-rcp-host-rn` binaries can be found in the `bin/` folder. The applications can then be moved to the AM62x EVM and run natively there. Be sure to also copy over `apps/border_router_nanostack_tirf/border_router_host.cfg` and/or `apps/router_node_nanostack_tirf/router_node_host.cfg` to set the appropriate runtime configurations when running a given application. 

### External DHCPv6 / RADIUS Server Support

`wisun-rcp-host-br` can be configured to run with external DHCPv6 or RADIUS server support by modifying the `border_router_host.cfg` file. We provide example configurations for dnsmasq and FreeRADIUS in the `external-servers` folder of the wfantund repo.