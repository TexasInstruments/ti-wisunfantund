**EARLY ACCESS PREVIEW**

This is an early preview of the Linux Host! The Linux Host is designed to be built and run in a Docker container running on an x86 Linux platform. There is no built in support for cross compiling to other platforms in this release. If you don't want to run in Docker, the build dependencies can be found in the Dockerfile, but the Linux Host has only been tested and verified in the Ubuntu 22.04 Container using **Docker v28.1.1**. We've tested 100 Router Nodes built on the 8.30 SDK using the Linux Host Border Router, and all connected as expected. We recommend using both external servers (FreeRADIUS and dnsmasq), and this is the configuration enabled when you build by default.

Linux Host Overview
-------------------------------
The Linux Host is a port of the upper layers of the Wi-SUN MAC and the Application layer for the Border Router. It is designed to connect to a TI device running the RCP LMAC Firmware. To support this new functionality, wfantund has also been updated to connect to a TCP socket instead of only a serial port. The Linux Host application will listen on port 4902 for incoming connections which wfantund can use to communicate with the application. 

The new stack design allows the stack to take advantage of the increased resources available on the Linux Host, enabling support for 1000+ node networks. 

Quickstart
-------------------------------

To get started quickly, follow the steps below from the base of the repo.

1. Download the EA F2 SDK and install it. The `docker-compose.yml` file in the base of the repo has a volume mount for this, but you need to manually update the path to wherever you have installed the EA SDK. 
2. Build the docker containers with `docker compose build`.
3. Start up the containers with `docker compose up -d`. This will start the `linux_host` container and the `wfantund` container.

Now that the containers are built and up, we can freely access them.

Linux Host Steps
------------------

**Configuration**
By default, the Linux Host will print logs to stdout. To build with most prints disabled, add `-DEXCLUDE_TRACE` to `linux-host/apps/border_router_nanostack_tirf/defines/router.opts`. 

NOTE: uart_cfg.devname is currently a build time constant in `main.c` - update this to point at the device running the rcp_lmac code before building! 

0. Configure, build, and flash the `rcp_lmac` example from the F2 SDK to your embedded device. Right now, PHY related settings like region and data rate must match in both the RCP LMAC example and the Linux Host example. For more details on settings / configuration, refer to the RCP LMAC Readme in the SDK.
1. Make any desired configuration changes to the host by changing either `ti_wisunfan_config.h` or `ti_wisunfan_features.h` in `linux-host/apps/border_router_nanostack_tirf`. The entire linux-host folder is volume mounted into the `linux_host` container, so you can make changes at will in this folder without needing to rebuild/restart the container. The container is also running with privileges, so it has access to all USB ports on the Host OS. 
2. Open a shell into the `linux_host` container with `docker compose exec -it linux_host bash`.
3. Within this shell, generate the build files by calling `cmake -G Ninja .`.
4. Build the project by calling `ninja`. If you make any changes to the configuration, you can rebuild by calling `ninja` again.
5. Run the project by calling `./bin/BorderRouter`.
6. The Linux Host is now running! It'll print logs to the terminal as it runs.

During runtime, the Linux Host will write to NV periodically to save network information. To clear the NV between runs, simply delete the `nv-simulation.bin` file that gets generated. A new one will be created on startup.

Wfantund Steps
-----------------

For using the Linux Host, it's assumed that Wfantund will be running in it's own container instead of directly on the Host OS. This is to simplify networking between the two and create a consistent environment for users. The Wfantund container has FreeRADIUS and dnsmasq preinstalled with the appropriate configurations, so they can quickly be started from the container.

1. Open a shell into the `wfantund` container with `docker compose exec -it wfantund bash`.
2. Build and install `wfantund` by running `./bootstrap.sh && ./configure --sysconfdir=/etc && make install`. Next, make sure that dbus is started by running `service dbus start`. Once these steps are done, there's no need to rebuild it again or restart dbus unless you restart the container.
3. Start wfantund by running `wfantund -o Config:NCP:SocketPath tcp:linux_host:4902 -o IPv6:WfantundGlobalAddress 2020:ABCD::/64`. This will create the wfan0 interface, assign it address 2020:ABCD::, and create a TCP connection to the `linux_host` container. 
4. Start another shell session with `docker compose exec -it wfantund bash` and start wfanctl by running `wfanctl`. From here you can interact with the interface as normal; start the stack by running `set interface:up true` in wfanctl.
5. When using external servers, start a shell session for each of them with `docker compose exec -it wfantund bash`. To start FreeRADIUS in the foreground, run `freeradius -X`. To start dnsmasq in the foreground, run `dnsmasq -d -i wfan0 --dhcp-range 2020:abcd::1,2020:abcd::ffff,64,336h`.

Once Everything is Started
--------------------------

Once the Linux Host is running and Wfantund has been used to start it, everything is good to go! Devices should be able to freely join the network and everything should work like normal.

Known Issues
-----------------

**Failed to bind!!**

This issue is usually caused by wfantund hanging on to the TCP port after the Linux Host goes down and is brought back up. If this has happened, be sure to stop both the Linux Host and the wfantund processes, give it a minute or two for the kernel to clean everything up, and start again. If you need to bring the Linux Host down, stop the wfantund process first and then stop the Linux Host to prevent this issue.

Untested Features
--------------------

The webserver has not been tested with the Linux Host, but should work the same as long as it also runs in the wfantund container. 

The internal authentication and dhcp servers have not been extensively tested; we recommend using the provided external server configuration. If you do want to use the internal servers, you can disable them in `linux-host/apps/border_router_nanostack_tirf/ti_wisunfan_features.h` by setting `FEATURE_EXTERNAL_DHCP_SERVER_ENABLE` or `FEATURE_EXTERNAL_RADIUS_SERVER_ENABLE` to false. 
