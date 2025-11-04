Linux Host Overview
-------------------------------
The Linux Host is a port of the upper layers of the Wi-SUN MAC and the Application layer for the Border Router and Router Node. It is designed to connect to a TI device running the RCP LMAC Firmware. To support this new functionality, wfantund has also been updated to connect to a TCP socket instead of only a serial port. The Linux Host application will listen on port 4902 for incoming connections which wfantund can use to communicate with the application. 

This new architecture allows the stack to take advantage of the increased resources available on the Linux Host, enabling support for 1000+ node networks. 

Quickstart
-------------------------------

To get started quickly, follow the steps below from the base of the repo.

1. Download the F2 SDK corresponding to the commit message of ti-wisunfantund and install it. The `docker-compose.yml` file in the base of the repo has a volume mount for this, but you need to manually update the path to wherever you have installed the SDK. 
    - You can also use the F2 SDK via [GitHub](https://github.com/TexasInstruments/simplelink-lowpower-f2-sdk). The process is the same, just clone the repo, make sure you use the tag corresponding to the ti-wisunfantund commit message, and update your volume mount.
2. Build the docker containers with `docker compose build`.
3. Start up the containers with `docker compose up -d`. This will start the `linux_host` container and the `wfantund` container.

Now that the containers are built and up, we can freely access them.

Linux Host Steps
------------------

**Configuration**
By default, the Linux Host will print logs to stdout. To build with most prints disabled, update `linux-host/apps/border_router_nanostack_tirf/defines/router.opts` for Border router or `linux-host/apps/router_node_nanostack_tirf/defines/router.opts` for Router Node to include `-DEXCLUDE_TRACE`. 

0. Build and flash the `rcp_lmac` example from the F2 SDK to your embedded device. Refer to the readme for the `rcp_lmac` example for details on how to configure custom PHY and region settings at runtime.
1. Make any desired configuration changes to the host by changing either `ti_wisunfan_config.h` or `ti_wisunfan_features.h` in `linux-host/apps/border_router_nanostack_tirf` or `linux-host/apps/router_node_nanostack_tirf`. The entire linux-host folder is volume mounted into the `linux_host` container, so you can make changes at will in this folder without needing to rebuild/restart the container. The container is also running with privileges, so it has access to all USB ports on the Host OS. 
2. Open a shell into the `linux_host` container with `docker compose exec -it linux_host bash`.
3. Within this shell, generate the build files by calling `cmake -G Ninja .`.
4. Build the project by calling `ninja`. If you make any changes to the configuration, you can rebuild by calling `ninja` again.
5. If running the Border Router project, call `./bin/wisun-rcp-host-br apps/border_router_nanostack_tirf/border_router_host.cfg`. If running the Router Node project, call `./bin/wisun-rcp-host-rn apps/router_node_nanostack_tirf/router_node_host.cfg` The second parameter provides runtime configuration for the application, including the serial port and baud rate for the device running the `rcp_lmac` firmare. Update this file as needed to point at the correct serial port.
6. The Linux Host is now running! It'll print logs to the terminal as it runs.

During runtime, the Linux Host will write to NV periodically to save network information. To clear the NV between runs, simply delete the `nv-simulation-<br/rn>.bin` file that gets generated. A new one will be created on startup.

Wfantund Steps
-----------------

For using the Linux Host, it's assumed that Wfantund will be running in it's own container instead of directly on the Host OS. This is to simplify networking between the two and create a consistent environment for users. The Wfantund container has FreeRADIUS and dnsmasq preinstalled with the appropriate configurations, so they can quickly be started from the container.

1. Open a shell into the `wfantund` container with `docker compose exec -it wfantund bash`.
2. Build and install `wfantund` by running `./bootstrap.sh && ./configure --sysconfdir=/etc && make install`. Next, make sure that dbus is started by running `service dbus start`. Once these steps are done, there's no need to rebuild it again or restart dbus unless you restart the container.
3. If running border router, start wfantund by running `wfantund -o Config:NCP:SocketPath tcp:linux_host:4902 -o IPv6:WfantundGlobalAddress 2020:ABCD::/64`. This will create the wfan0 interface, assign it address 2020:ABCD::, and create a TCP connection to the `linux_host` container. If running router node, start wfantund by running `wfantund -o Config:NCP:SocketPath tcp:linux_host:4903`, similarly creating the wfan0 interface and TCP linux_host container connection.
4. Start another shell session with `docker compose exec -it wfantund bash` and start wfanctl by running `wfanctl`. From here you can interact with the interface as normal; start the stack by running `set interface:up true` in wfanctl.
5. When using external servers, start a shell session for each of them with `docker compose exec -it wfantund bash`. To start FreeRADIUS in the foreground, run `freeradius -X`. To start dnsmasq in the foreground, run `dnsmasq -d -i wfan0 --dhcp-range 2020:abcd::1,2020:abcd::ffff,64,336h`.
6. If you do want to use the external servers with the border router example, you can enable them in `linux-host/apps/border_router_nanostack_tirf/border_router_host.cfg` with the external-server-enabled flag under dhcp-cfg or radius-cfg sections.


Once Everything is Started
--------------------------

Once the Linux Host is running and Wfantund has been used to start it, everything is good to go! Devices should be able to freely join the network and everything should work like normal.

Known Issues
-----------------

**Failed to bind!!**

This issue is usually caused by wfantund hanging on to the TCP port after the Linux Host goes down and is brought back up. If this has happened, be sure to stop both the Linux Host and the wfantund processes, give it a minute or two for the kernel to clean everything up, and start again. If you need to bring the Linux Host down, stop the wfantund process first and then stop the Linux Host to prevent this issue.

PySpinel Notes
--------------------

PySpinel can also be used to configure and start the Linux Host application. This can be done by invoking PySpinel with `python3 spinel-cli.py -s <NCP Socket Number>`. Out of the box, this would look like `python3 spinel-cli.py -s 4902` to connect to the Linux Host Border Router. Note that right now PySpinel will only connect to a port open on `localhost`, so PySpinel must be run either directly in the linux_host or wfantund container, or connected to the network in its own container.

Untested Features
--------------------

The webserver has not been tested with the Linux Host, but should work the same as long as it also runs in the wfantund container. 

