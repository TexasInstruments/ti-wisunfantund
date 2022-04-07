wfantund, Userspace Wireless Field Area Network (WFAN) Network Daemon
======================================================================

`wfantund` is derived from `wpantund` which was written and developed by
Nest Labs to make supporting [Thread](http://threadgroup.org)
connectivity on Unix-like operating systems more straightforward.

`wfantund` is a user-space network interface driver/daemon that
provides a native IPv6 network interface to TI Wi-SUN FAN Border Router
operating in Network Processor (NWP) mode. 

TI Wi-SUN FAN Solution are supported over TI CC13xx platforms.
Refer to https://www.ti.com/wireless-connectivity/wi-sun/overview.html for more details.


TI Wi-SUN FAN embedded software running on TI CC13xx platform can be downloaded
from TI CC13xx_26xx SDK (https://www.ti.com/tool/download/SIMPLELINK-CC13X2-26X2-SDK)

Software provided in this repository provides Linux Application Examples that can run over
TI Wi-SUN FAN Border Router NWP software (to be obtained from TI CC13xx_26xx SDK) connected
via UART to a Linux Platform.

These examples are meant to be serve as sample application examples to aid in development
of a Linux OS based Wi-SUN Border Router custom applications and provide back-end connectivity.

Software can be ported to other embedded Linux platforms to develop WI-SUN FAN based Border router
solution. Reference cross compilation support has been provided for TI AM64x SK Platform 
(https://www.ti.com/tool/SK-AM64).


`wfantund` is designed to marshall all access to the NCP, ensuring
that it always remains in a consistent and well-defined state.

## License ##

`wfantund` is based on `wpantund`.
`wfantund` is open-source software released under the [Apache License,
Version 2.0][1]. See the file [`LICENSE`][2] for more information.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the [License][4] for the specific language governing permissions and
limitations under the License.

[1]: http://www.apache.org/licenses/LICENSE-2.0
[2]: ./LICENSE


## Compilation and Installation ##

### Linux OS (Ubuntu) Support ###
Refer to Install.md for compiling and installing `wfantund` and `wfanctl` 
in Ubuntu Linux OS.

### Embedded Linux OS Support ###
Refer to Install_AM64x_sk.md for cross-compiling and installing `wfantund` and `wfanctl` 
for TI AM64x SK (https://www.ti.com/tool/SK-AM64).

## Usage Overview ##

The behavior of `wfantund` is determined by its configuration
parameters, which may be specified in a configuration file (typically
`/etc/wpantund.conf`) or at the command line. A typical configuration
file might look like that shown below. For a more thorough explanation
of available configuration parameters, see the [included example][3].

    # Try to name the network interface `wpan0`.
    # If not possible, a different name will be used.
    Config:TUN:InterfaceName      "wfan0"

    # The pathname of the socket used to communicate
    # with the NCP.
    Config:NCP:SocketPath         "/dev/ttyUSB0"

    # The name of the driver plugin to use. The chosen
    # plugin must support the NCP you are trying to use.
    Config:NCP:DriverName         "spinel"

    # Drop root privileges after opening all sockets
    Config:Daemon:PrivDropToUser  "nobody"

### Configuring and monioring wfantund using TI's webserver (Recommended) ###

TI's webserver application has been provided in the `/ti-wisun-webapp` folder. This application allows the user to easily configure the border router, monitor the health of the network, and build other applications on top of it.

**Note: Make sure to follow the installation instructions in the ti-wisun-webapp README.md for the correct npm/node versions**

This application automatically starts wfantund on detecting the border router device.

For more information, go to `/ti-wisun-webapp/README.md`

### Steps to run demo ###

* Start the webserver found in `/ti-wisun-webapp/`
* Connect one TI CC13x2R7 with TI Wi-SUN BR Image to Linux PC
* Power on one (or few) Wi-SUN FAN Router devices 
* Wi-SUN FAN Router devices will start blinking their Green LED to show that they are trying to join network
* Rate at which they blink will go down as they connect to network
* Wi-SUN Router devices will stop blinking after they join the network *(Note: It may take around 3-5 min for a node to join)*
* The webserver application can be visualized using any standard webbrowser to display the Wi-SUN FAN network as a graph
* The webserver is designed to be a foundation that higher level applications can be developed on top of

### Configuring wfantund using wfanctl (Alternate) ###

To use `wfanctl`, first start wfantund:

    sudo /usr/local/sbin/wfantund -o Config:NCP:SocketPath `<Serial Port>`
    example: sudo /usr/local/sbin/wfantund -o Config:NCP:SocketPath /dev/ttyACM0

When up and running, you can use `wfanctl` to get or set TI Wi-SUN FAN Parameters

To start wfanctl use
```
   $ sudo /usr/local/bin/wfanctl 
```
To get/set properties use the get/set command.

example:
```
   wfanctl:wfan0> get panid
   0xABCD
```

The status of TI Wi-SUN Border Router along with some other related information can be obtained using the `status` command

```
wfanctl:wfan0> status
wfan0 => [
	"NCP:State" => "offline"
	"Daemon:Enabled" => true
	"NCP:Version" => "TIWISUNFAN/1.0.1; RELEASE; Oct 28 2021 14:02:58"
	"Daemon:Version" => "0.08.00d (0.07.01-380-ge8fc63f-dirty; Nov  2 2021 20:16:55)"
	"Config:NCP:DriverName" => "spinel"
	"NCP:HardwareAddress" => [00124B0014F7D160]
	"Network:NodeType" => "0 : Border Router"
	"Network:PANID" => 0xABCD
]
```
_For detailed list of all supported TI Wi-SUN FAN Command, please refer to `ti_wisun_commands.md`_

The interface and stack can be started using the following commands
```
   $ sudo wfanctl set interface:up true
   $ sudo wfanctl set stack:up true
```

Status of Interface can be checked by using the status command.
```
wfanctl:wfan0> status
wfan0 => [
	"NCP:State" => "associated"
	"Daemon:Enabled" => true
	"NCP:Version" => "TIWISUNFAN/1.0.1; RELEASE; Oct 28 2021 14:02:58"
	"Daemon:Version" => "0.08.00d (0.07.01-380-ge8fc63f-dirty; Nov  2 2021 20:16:55)"
	"Config:NCP:DriverName" => "spinel"
	"NCP:HardwareAddress" => [00124B0014F7D160]
	"Network:NodeType" => "0 : Border Router"
	"Network:PANID" => 0xABCD
]
```
Note: `associated` in TI WI-SUN FAN Contest implies that the TI Wi-SUN FAN Border Router has started.

### Checking if tun Interface is up. ###
When the stack is up, the TUN interface will be enabled. It can be verified by checking

    $ ifconfig wfan0
    wfan0: flags=4305<UP,POINTOPOINT,RUNNING,NOARP,MULTICAST>  mtu 1280  metric 1
        inet6 fe80::212:4b00:14f7:d160  prefixlen 64  scopeid 0x20<link>
        inet6 2020:abcd::212:4b00:14f7:d160  prefixlen 64  scopeid 0x0<global>
        inet6 fe80::31b1:1233:76ab:d3e5  prefixlen 64  scopeid 0x20<link>

### Checking for connected devices ###
User can check for connected devices using the connecteddevices property
```
   wfanctl:wfan0> get connecteddevices
   connecteddevices = "
   List of connected devices currently in routing table:
   2020:abcd:0000:0000:0212:4b00:14f7:d102
   2020:abcd:0000:0000:0212:4b00:14f7:d2e8`
```
### Interacting with connected devices ###
Using the TUN interface, users can directly communicate to devices over IPv6.

#### Ping specific devices ####
Users can ping devices using linux ping6 application and wfan0 interface

ping6 -I wfan0 `<ip address>`

## Preparation of TI CC13xx Images: ##
* Download TI CC13xx_26Xx SDK from https://www.ti.com/tool/download/SIMPLELINK-CC13XX-CC26XX-SDK
* Compile default project Binaries for 
	* BR NWP Image on CC13x2R7 (ns_br)
	* Node CoAP image on CC13x2R7 (ns_node_coap)
Refer to _*http://dev.ti.com/wisunsla*_ for information on compiling out of box images and flashing to TI Launch Pads

## Feature and Architecture Summary ##

`wfantund` based on `wpantund` provides:

 *  ... a native IPv6 interface to an NCP.
 *  ... a command line interface (`wfanctl`) for managing and
    configuring the NCP.
 *  ... a DBus API for managing and configuring the NCP.
 *  ... a way to reliably manage the power state of the NCP.
 *  ... a uniform mechanism for handling NCP firmware updates.

The architecture and design of `wfantund` is based on `wpantund` which
has been motivated by the following design goals (in no specific order):

 *  Portability across Unix-like operating systems (currently supports
    Linux. BSD support should be fairly trivial to add)
 *  Require few runtime dependencies (DBus, with boost needed when
    building)
 *  Single-threaded architecture, with heavy use of asynchronous I/O
 *  Power efficiency (0% CPU usage when idle)
 *  Allow management interface to be used by multiple independent
    applications simultaneously
 *  Allow multiple instances of `wfantund` to gracefully co-exist on a
    single machine
 *  Modular, plugin-based architecture (all details for communicating
    with a specific NCP stack are implemented as plugins)

Note that Windows is not currently supported, but patches are welcome.

The following NCP plugins are provided:

*   `src/ncp-spinel`: Modified from those provided by `wpantund` to support
     TI Wi-SUN FAN Border Router. 
*   `src/ncp-dummy`: A dummy NCP plug-in implementation meant to be the
    starting point for implementing new NCP plug-ins



## Conceptual Overview ##

`wfantund` is based on `wpantund` and is conceptually similar in purpose to the point-to-point
daemon (`pppd`, commonly used on Unix platforms to provide network
connectivity via a dial-up modems) except that instead of communicating
with a dial-up modem, `wfantund` is communicating with an NCP.

`wfantund` communicates with the NCP via an abstraction of a
asynchronous stream socket, which could be any of the following:

 *  A real serial port (UART) connected to the NCP (preferably with
    hardware flow control)
 *  The stdin and stdout from a subprocess (for supporting SPI
    interfaces using a translator program or debugging virtual
    stacks)
 *  A TCP socket (for debugging, not recommended for production)

Unlike a dial-up modem, NCPs often have a rich management interface
for performing operations, such as forming a network, joining a
network, scanning for nearby networks, etc. To perform these operations,
`wfantund` includes a command line utility called `wfanctl`.
Applications that need to directly configure the network interface can
also communicate directly with `wfantund` using its DBus API.

To expose a native IPv6 network interface to the host operating
system, `wfantund` uses the `tun` driver on Linux. On Linux, the
default name for the interface is `wfan0`.




If compiled with `libreadline` or `libedit`, `wfanctl` supports an
convenient interactive console. All commands support online help: type
`help` to get a list of supported commands, or add `-h` to a command to get
help with that specific command.

[3]: ./src/wpantund/wpantund.conf

## Support ##

Submit bugs and feature requests to https://e2e.ti.com/support/wireless-connectivity/sub-1-ghz-group/sub-1-ghz/f/sub-1-ghz-forum

## Authors and Contributors ##

The following people have significantly contributed to the design
and development of `wfantund`:
Texas Instruments Inc

`wpantund` Authors
 *  Robert Quattlebaum
 *  Marcin Szczodrak
 *  Vaas Krishnamurthy
 *  Arjuna Siva
 *  Abtin Keshavarzian


