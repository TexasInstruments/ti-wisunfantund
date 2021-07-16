# TI Wi-SUN FAN Wfantund NCP Properties

```wfanctl``` is based on ```wpanctl``` and supports the following TI Wi-SUN FAN Commands:

<br />

# List of all NCP Commands
- <pre>get</pre><br />
- <pre>set</pre><br />
- <pre>status</pre><br />

<br />

# List of GET Commands to GET NCP Properties

<br />

 - <pre>get NCP:ProtocolVersion</pre>

    *Description:* <br /> Major and Minor version of the protocol. Only Supported value = 1.0

    *Expected Result*: <br /> <pre>Wi-SUNFAN/87.105</pre><br /><br />

---
<br /><br />

 - <pre>get NCP:Version</pre>

    *Description:* <br /> Describes the firmware currently running on the NCP.

    STACK-NAME/STACK-VERSION[BUILD_INFO][; OTHER_INFO]; BUILD_DATE_AND_TIME


    *Expected Result*:<br />```TIWISUNFAN/1.0.1; RELEASE; <Date and Time>```

    *Sample Output:* <br /> <pre>TIWISUNFAN/1.0.1; RELEASE; Jun 10 2021 21:58:51</pre><br /><br />

---
<br /><br />

 - <pre>get NCP:InterfaceType</pre>

    *Description:* <br /> Identifies the network protocol for the NCP . Will always return 4 (Wi-SUN FAN)

    *Expected Result*:<br /> <pre>NCP:InterfaceType=4</pre><br /><br />

---
<br /><br />

 - <pre>get NCP:HardwareAddress</pre>

    *Description:* <br /> Eight byte HW Address (EUI-64)

    *Expected Result*:<br /> ```NCP:HardwareAddress = [<HardwareAddressOfYourDevice>]```

    *Sample Output:* <br /> <pre>NCP:HardwareAddress = [00124B0014F7D2E6]</pre><br /><br />

---
<br /><br />

 - <pre>get NCP:CCAThreshold</pre>

    *Description:* <br /> Value will be rounded to the nearest supported value

    *Expected Result*:<br /> <pre>NCP:CCAThreshold = -60</pre><br /><br />

---
<br /><br />

 - <pre>get NCP:Region</pre>

     *Description:* <br /> 1 - NA, 2 - JP, 3 - EU, 7 - BZ

    *Expected Result*:<br /> <pre>NCP:Region = "1: North-America"</pre><br /><br />

---
<br /><br />

 - <pre>get NCP:ModeID</pre>

    *Description:* <br /> Supported values (1-7) (If a PHY Mode Id is not supported<br /> for the chosen Region--> an PROP_LAST_STATUS will be thrown with INVALID_PARAMETER)

    *Expected Result*:<br /> <pre>NCP:ModeID = 2</pre><br /><br />

---
<br /><br />

 - <pre>get unicastchlist</pre>

    *Description:* <br /> Bit Mask of Max size 17 bytes (129 channels) --> Each bit <br />represents if the channel is present or not

    *Expected Result:*  <br />```unicastchlist = "<channellist>"```

    *Sample Output*:<br /> <pre>unicastchlist = "ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:01"</pre>

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>get broadcastchlist</pre>

    *Description:* <br /> Bit Mask of Max size 17 bytes (129 channels) --> Each bit <br />represents if the channel is present or not

    *Expected Result:*  ```broadcastchlist = "<channellist>"```

    *Sample Output*:<br /> <pre>broadcastchlist = "ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:01"</pre>

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>get asyncchlist</pre>

    *Description:* <br /> Bit Mask of Max size 17 bytes (129 channels) --> Each bit <br />represents if the channel is present or not

    *Expected Result:* <br />  ```asyncchlist = "<channellist>"```

    *Sample Output*:<br /> <pre>asyncchlist = "ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:01"</pre>

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>get chspacing</pre>

    *Description:* <br /> Channel spacing in MHz. (If a channel spacing is not <br />supported for the chosen Region/PhyModeId --> an PROP_LAST_STATUS will be thrown with INVALID_PARAMETER)

    *Expected Result*:<br /> <pre>chspacing ="200 kHz"</pre><br /><br />

---
<br /><br />

 - <pre>get ch0centerfreq</pre>

    *Description:* <br /> Channel 0 Center frequency structure with value{Ch0-MHz, Ch0-KHz}. For example a ch0 center frequency of 902.2 MHz will be encoded as a structure of {902,200}

    *Expected Result*:<br /> <pre>ch0centerfreq = "{902 MHz, 200 kHz}"</pre><br /><br />

---
<br /><br />

 - <pre>get Network:panid</pre>

    *Description:* <br /> MAC PAN Id of the device. For Wi-SUN Network, this needs to <br />be set only of the Border Router. Router device will select network based on Network Name.

    *Expected Result*:<br /> <pre>Network:panid = 0xABCD</pre><br /><br />

---

<br /><br />

 - <pre>get bcdwellinterval</pre>

    *Description:* <br /> Broadcast Dwell Interval (0 - 255 ms)

    *Expected Result*:<br /> <pre>bcdwellinterval = 255</pre><br /><br />

---
<br /><br />

 - <pre>get ucdwellinterval</pre>

    *Description:* <br /> Unicast Dwell Interval (0 - 255 ms)

    *Expected Result*:<br /> <pre>ucdwellinterval = 255</pre><br /><br />
<br /><br />
---

<br /><br />

 - <pre>get bcinterval</pre>

    *Description:* <br /> Broadcast Interval (0 - 0xFFFFFF ms)

    *Expected Result*:<br /> <pre>bcinterval = 1020</pre><br /><br />

---
<br /><br />

 - <pre>get ucchfunction</pre>

    *Description:* <br /> 0 - Fixed, 1 - Hopping based on DH1CF (others are reserved)

    *Expected Result*:<br />```ucchfunction = <unicastchfunction>```

    *Sample Output*:<br /> <pre>ucchfunction = 2</pre>

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>get bcchfunction</pre>

    *Description:* <br /> 0 - Fixed, 1 - Hopping based on DH1CF (others are reserved)

    *Expected Result*:<br />``` bcchfunction = <broadcastchfunction>```

    *Sample Output*:<br /> <pre>bcchfunction = 2</pre>

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>get macfilterlist</pre>

    *Description:* <br /> When read, it provides an array of EUI Address.  <br />CMD_VALUE_INSERTED return value of EUI-64 inserted or "all zeros" to inform that operation failed.

    *Expected Result*:<br /> List of all devices specified in macfilter list.<br />
    If nothing has been set, this should return an empty string.<br />
    If the hardware address of various nodes have been added to the allow list <br />or deny list, a sample output would look like the following:

    <pre>macfilterlist = "<br />00124B0014F7D2E6<br />nextaddress<br />nextaddress2...<br />"</pre>

<br /><br />

---

<br /><br />

 - <pre>get macfiltermode</pre>

    *Description:* <br /> 0 - Disabled, 1 - Allow List, 2 - Deny List

    *Expected Result*:<br /> <pre>macfiltermode = 0</pre><br /><br />

---
<br /><br />

 - <pre>get Interface:Up</pre>

    *Description:* <br /> Network interface up/down status. Non-zero (set to 1) indicates up,

    zero indicates down. (Equivalent of Start/Init)

    *Expected Result*:<br /> <pre>Interface:Up = true</pre> or <pre>Interface:Up = false</pre> <br />if interface has not yet been started.

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>get Stack:Up</pre>

    *Description:* <br /> Wi-SUN stack operational status. Non-zero (set to 1) indicates up,
    zero indicates down

    *Expected Result*:<br /> <pre>Stack:Up = true</pre> or <pre>Stack:Up = false</pre> if stack has not yet been started.

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>get Network:NodeType</pre>

    *Description:* <br /> Indicates router or border router (0 - Border Router; 1 - Router)<br />

    *Expected Result*:<br /> <pre>Network:NodeType = "0 : Border Router"</pre> for Border router, or<br /> <pre>Network:NodeType = "1 : Router"</pre> for Router<br /><br />

---
<br /><br />

 - <pre>get Network:Name</pre>

    *Description:* <br /> UTF8 encoded string of max size 32 bytes, represents the network name that is used <br />for Router to select the Border Router to connect to.

    *Expected Result*:<br /> <pre>Network:Name = "Wi-SUN Network"</pre><br /><br />

---
<br /><br />

 - <pre>get dodagroutedest</pre>

    *Description:* <br /> IPv6 address of the destination to which a PROP_DODAG_ROUTE can be called to get the <br />path from border router.

    *Expected Result:*  ```dodagroutedest = "<ip address of destination node>"```

    *Sample Output*:<br /> <pre>dodagroutedest = "2020:abcd:0000:0000:0212:4b00:14f8:2b18"</pre><br /><br />

---
<br /><br />

 - <pre>get dodagroute</pre>

    *Description:* <br /> Can be used by Border router HOST to read the entire path specific to a device. This <br />is the only property where the Host is expected to specify a value for the "CMD_VALUE_GET" command.<br />
    Border Router HOST should specify the PathCost as "0 (UInt16)" and specify the target device "IPAddress"<br />
    NCP will return the Path Cost and the array of IPv6 address that serves as current PATH for downlink
    <br />
    messages to the target device<br /><br />
    If no DODAG route exists, then NCP will return with PathCost = 0 and the specified target IPAddress
    *Sample Output*:

    <br />
    <pre>dodagroute = "
    2020:abcd:0000:0000:0212:4b00:14f7:d2e6
    2020:abcd:0000:0000:0212:4b00:14f7:2add
    2020:abcd:0000:0000:0212:4b00:14f7:db18
    "</pre>

<br /><br />

---
<br /><br />

 - <pre>get numconnected</pre>

    *Description:* <br /> Returns the number of nodes currently in the network.

    *Expected Result*:<br /> <pre>numconnected = 2</pre><br /><br />

---
<br /><br />

 - <pre>get connecteddevices</pre>

    *Description:* <br /> Provides a list of all the IP Addresses currently in the Border Router's routing table, along with the number of connected devices.

    *Expected Result*:<br /> <pre>connecteddevices = "
List of connected devices currently in routing table:
2020:abcd:0000:0000:0212:4b00:14f7:2add
2020:abcd:0000:0000:0212:4b00:14f7:db18
Number of connected devices: 2
"</pre><br /><br />

---
<br /><br />

 - <pre>get IPv6:AllAddresses</pre><br />

    *Description:* <br /> Array of structures containing:<br />

   - "6": IPv6 Address<br />

   - "C": Network Prefix Length<br />

   - "L": Valid Lifetime<br />

   - "L": Preferred Lifetime<br />

   - "C": Flags<br />

    *Expected Result*:<br /> <pre>IPv6:AllAddresses = [
"2020:abcd:0000:0000:0212:4b00:14f7:d2e6" prefix_len: 64 origin:ncp valid:7198 preferred:3598
"fe80::212:4b00:17f7:d2e6" prefix_len: 64 origin:ncp valid:forever preferred:forever
]</pre>
<br /><br />


# List of SET Commands to SET NCP Properties

---
<br /><br />

 - <pre>set NCP:CCAThreshold 0</pre>

    *Description:* <br /> Value will be rounded to the nearest supported value

    *Expected Result*:<br /> <pre>NCP:CCAThreshold = 0</pre><br /><br />

---
<br /><br />

 - <pre>set unicastchlist 7-15:120-128</pre>

    *Description:* <br /> Bit Mask of Max size 17 bytes (129 channels) --> Each bit <br />represents if the channel is present or not

    Then, after calling set unicastchlist, to see the new value for unicast channel list, call ```get unicastchlist``` and it should return the following:
    *Expected Result:*  <br />```unicastchlist = "<channellist>"```

    *Sample Output*:<br /> <pre>unicastchlist = "80:ff:00:00:00:00:00:00:00:00:00:00:00:00:00:ff:00"</pre>

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>set broadcastchlist 0-57:79-102</pre>

    *Description:* <br /> Bit Mask of Max size 17 bytes (129 channels) --> Each bit <br />represents if the channel is present or not

    After calling ```set broadcastchlist```, call ```get broadcastchlist``` to see the updated values: <br /><br />
    *Expected Result:*  ```broadcastchlist = "<channellist>"```

    *Sample Output*:<br /> <pre>broadcastchlist = "ff:ff:ff:ff:ff:ff:ff:03:00:ff:ff:7f:00:00:00:00"</pre>

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>set asyncchlist 1-129</pre>

    *Description:* <br /> Bit Mask of Max size 17 bytes (129 channels) --> Each bit <br />represents if the channel is present or not

    *Expected Result:* <br />  ```asyncchlist = "<channellist>"```

    *Sample Output*:<br /> <pre>asyncchlist = "ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:ff:01"</pre>

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>set Network:panid 0xDEED</pre>
    Then call ```get Network:panid```:<br />
    *Description:* <br /> MAC PAN Id of the device. For Wi-SUN Network, this needs to <br />be set only of the Border Router. Router device will select network based on Network Name.

    *Expected Result*:<br /> <pre>Network:panid = 0xDEED</pre><br /><br />

---
<br /><br />

 - <pre>set bcdwellinterval 0</pre>

    *Description:* <br /> Broadcast Dwell Interval (0 - 255 ms)

    *Expected Result*:<br /> <pre>bcdwellinterval = 0</pre><br /><br />

---
<br /><br />

 - <pre>set ucdwellinterval 255</pre>

    *Description:* <br /> Unicast Dwell Interval (0 - 255 ms)

    *Expected Result*:<br /> <pre>ucdwellinterval = 255</pre><br /><br />


 - <pre>set bcinterval 1020</pre>

    *Description:* <br /> Broadcast Interval (0 - 0xFFFFFF ms)

    *Expected Result*:<br /> <pre>bcinterval = 1020</pre><br /><br />

---
<br /><br />

 - <pre>set ucchfunction 2</pre>

    *Description:* <br /> 0 - Fixed, 1 - Hopping based on DH1CF (others are reserved)

    *Expected Result*:<br /> ```ucchfunction = <unicastchfunction>```

    *Sample Output*:<br /> <pre>ucchfunction = 2</pre>

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>set bcchfunction 0</pre>

    *Description:* <br /> 0 - Fixed, 1 - Hopping based on DH1CF (others are reserved)

    *Expected Result*:<br /> <pre>bcchfunction = <broadcastchfunction></pre>

    *Sample Output*:<br /> <pre>bcchfunction = 0</pre>

    More details on this command are listed below.<br /><br />

---
<br /><br />

- <pre>add macfilterlist 2020abcd21124b00</pre> would insert this extended address value into the filterlist.<br >
- <pre>remove macfilterlist 2020abcd21124b00</pre> would remove this extended address value out of the filterlist.<br /><br />

    *Description:* <br /> After inserting or removing from macfilterlist, ```get macfilterlist``` can be called to obtain the contents of the list. <br />
    When read, it provides an array of EUI Addresses.  <br />CMD_VALUE_INSERTED returns a value of EUI-64 inserted or "all zeros" to inform that operation failed.
    <br /><br />

    *Expected Result*:

    List of all devices specified in macfilter list.
    If nothing has been set, this should return an empty string.<br />
    If the hardware address of various nodes have been added to the allow list <br />or deny list, a sample output would look like the following:

    <pre>macfilterlist = "<br />extaddr1<br />extaddr2<br />extaddr3<br />"</pre>

<br />
<br />

---

<br /><br />

 - <pre>set macfiltermode 1</pre>

    *Description:* <br /> 0 - Disabled, 1 - Allow List, 2 - Deny List
    <br /><br />Then call ```get macfiltermode```:<br />
    *Expected Result*:<br /> <pre>macfiltermode = 1</pre><br /><br />

---
<br /><br />

 - <pre>set Interface:Up true</pre>

    *Description:* <br /> Network interface up/down status. Non-zero (set to 1) indicates up,

    zero indicates down. (Equivalent of Start/Init)

    *Expected Result*:<br /> <pre>Interface:Up = true</pre> or <pre>Interface:Up = false</pre> <br />if interface has not yet been started.

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>set Stack:Up true</pre>

    *Description:* <br /> Wi-SUN stack operational status. Non-zero (set to 1) indicates up,
    zero indicates down

    *Expected Result*:<br /> <pre>Stack:Up = true</pre> or <pre>Stack:Up = false</pre> if stack has not yet been started.

    More details on this command are listed below.<br /><br />

---
<br /><br />

 - <pre>set Network:Name "Your Wi-SUN Network"</pre>

    *Description:* <br /> UTF8 encoded string of max size 32 bytes, represents the network name that is used <br />for Router to select the Border Router to connect to.

    *Expected Result*:<br /> <pre>Network:Name = "Your Wi-SUN Network"</pre><br /><br />

---
<br /><br />

 - <pre>set dodagroutedest 2020:abcd:0000:0000:0212:4b00:14f8:2b18</pre>

    *Description:* <br /> IPv6 address of the destination to which a PROP_DODAG_ROUTE can be called to get the <br />path from border router.

    *Expected Result:*  ```dodagroutedest = "<ip address of destination node>"```

    *Sample Output*:<br /> <pre>dodagroutedest = "2020:abcd:0000:0000:0212:4b00:14f8:2b18"</pre><br /><br />


 # Running the Basic Example
To start ```wfantund```, use this command:<br />

<pre>sudo /usr/local/sbin/wfantund -o Config:NCP:SocketPath /dev/ttyACM0 -o Config:TUN:InterfaceName wfan0</pre>

<br />

A successful start of wfantund should look something like this:
<pre>wpantund[2518]: Starting wpantund 0.08.00d (Aug 9 2021 08:08:26) . . .
wpantund[2518]: SOURCE_VERSION = 0.07.01-361-g4b7cbb3-dirty
wpantund[2518]: BUILD_VERSION = 0.07.01-365-ga1c331c-dirty
wpantund[2518]: Configuration file "/etc/wpantund.conf" read.
wpantund[2518]: Ready. Using DBUS bus ":1.101"
wpantund[2518]: Running as root without dropping privileges!
wpantund[2518]: [-NCP-]: Stack is not up
wpantund[2518]: State change: "uninitialized" -> "offline"
wpantund[2518]: NCP is running "TIWISUNFAN/1.0.0; RELEASE; Aug 6 2021 17:45:13"
wpantund[2518]: Driver is running "0.08.00d (0.07.01-361-g4b7cbb3-dirty/0.07.01-365-ga1c331c-dirty; Aug 9 2021 08:08:26)"
wpantund[2518]: [-NCP-]: Interface is not up
wpantund[2518]: [-NCP-]: Stack is not up
wpantund[2518]: Resetting interface(s). . .
wpantund[2518]: Finished initializing NCP
</pre>
<br />

*After starting up wfantund, the network should be available via the software-assigned ip address, and hence can be seen when running <pre>ifconfig -a</pre>*

<br />

To run ```wfanctl```, use this command:

<br />

<pre>sudo /usr/local/bin/wfanctl</pre>


When making edits to wfantund or wfanctl OR when starting up, please run the following commands from the Installation and Run Guide:

<pre>sudo make</pre>

<pre>sudo make install</pre>

<br /><br />
Command Examples:

```set ucchfunction <unicastchfunctionvalue>```

This command would set the unicast channel function based on the specified value.

<pre>set ucchfunction 1</pre> would set the unicast channel function to 1 (hopping).<br /><br /><br />

<pre>set ucchfunction 0</pre> would set the unicast channel function to 0 (fixed).<br /><br /><br />

<pre>set unicastchlist <startchannel-endchannel:<startchannel2-endchannel2></pre>

Running the command <pre>set unicastchlist 0-56:72-95</pre> means that the unicast channel list is set to all channels from 0 through 56,
excluding channels 57 through 71, and including channels 72 through 95.<br />


If only one channel is desired, call this command with a single value like so:

<pre>set unicastchlist 1</pre>


<br /><br />
Likewise,

<pre>set broadcastchlist 1</pre> means that the broadcast channel list used is set to a fixed channel of 1.


<pre>set broadcastchlist 17-85:97-120</pre> means that the broadcast channel list is set to all channels from 17 through 85, excluding
86 to 96, and including 97 to 120.


<pre>set asyncchlist <channelslist></pre>
works exactly the same way and can be called like so in the hopping case:
<pre>set asyncchlist 0-60:72-84</pre>

or like <pre>set asyncchlist 1</pre> to signify a fixed channel of 1.

<br /><br />
# Forming Network Topology and Configuring Mac Filter Lists

An allow list example:

<pre>set macfiltermode 1</pre>

<pre>add macfilterlist 2020abcd21124b00</pre>


This would first set the macfilter mode to 1 (allow list), and then insert the extended address value of 2020abcd21124b00 into the allow list.


A deny list example:

<pre>set macfiltermode 2</pre>

<pre>add macfilterlist 2020abcd21124b00</pre>


This would first set the macfilter mode to 2 (deny list), and then insert the extended address value of 2020abcd21124b00 into the deny list.

<br />

*If the allow list is used, the border router can ONLY communicate with the devices listed in the allow list.<br />
Likewise, if the deny list is used, the border router can ONLY communicate with the devices if they are not in the deny list.*


<br /><br />
# Starting Up the Network


*In order for nodes to connect to the border router, both the interface and the stack must be turned on.*

Example:

<pre>set interface:up true</pre>

<pre>set stack:up true</pre>


This will kickstart the border router based on your configurations and nodes can begin to connect.


* The general recommendation after starting up the network is to wait up to 5 minutes for nodes to begin connecting, then run <pre>get connecteddevices</pre> to see the list of IP addresses of the nodes in the table. <br />  Then, using the ip addresses from the connecteddevices list, you can individually ping each of the router nodes following the instructions in the last section.


<br /><br />
# Obtaining the dodag route for a particular node

By using the <pre>set dodagroutedest <ip address of node></pre> command, the full dodag connection path from the Border Router to this specific node can be obtained.


For example,

<pre>set dodagroutedest 2020:abcd:0000:0000:0212:4b00:14f7:db18</pre> sets db18 device as the destination node to obtain the dodag route from. <br />Next,

<br />
<pre>get dodagroute</pre> can be called, and will return a list of ip addresses from Border Router to the selected node to display the overall topology for that particular node.


The sample output looks something like the following:


<pre>
2020:abcd:0000:0000:0212:4b00:14f7:d2e6
2020:abcd:0000:0000:0212:4b00:14f7:2add
2020:abcd:0000:0000:0212:4b00:14f7:db18
</pre>


The first device in the list displayed is the Border Router.

This output signifies that the first device, Border Router (d2e6) is a direct link to Router device (2add) and then is connected to the second Router device (db18).

This means that the second Router device (db18) is one hop away from the Border Router.


<br /><br />
# Pinging the Nodes


After nodes have joined the network:

To perform a ping to any node, in your terminal call:

<pre>ping6 -c 10 <ipv6address> -I wfan0</pre>

*This will trigger 10 pings to be sent to your respective IP Address.*
