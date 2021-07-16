`wfantund` Installation Guide
=============================

`wfantund` is derived from `wpantund` and modified to meet the needs of TI Wi-SUN FAN Solution.

This document describes the process of building and installing
`wfantund` on Ubuntu. Installation on other platforms
may be possible, but are left as an excercise for the reader. This
document assumes that you are at least casually familiar with
[Autoconf][1]. It also assumes that you have already gotten a copy of
the wfantund sources, extracted them, and are wondering what to do
next.

[1]: http://www.gnu.org/software/autoconf/autoconf.html



Installing `wfantund` on Ubuntu
-------------------------------

### 1. Install Dependencies ###

Open up a terminal and perform the following commands:

	sudo apt-get update

	# Install runtine-dependent packages (libreadline is optional)
	sudo apt-get install dbus libreadline

	# Install build-dependent packages (libreadline-dev is optional)
	sudo apt-get install gcc g++ libdbus-1-dev libboost-dev libreadline-dev

### 2. Configure and build the project ###

If the `configure` script is not already present in the root directory
of your `wfantund` sources (which it should be if you got these
sources from a tarball), you will need to either grab one of the `full/*`
tags from the official git repository or run the bootstrap script.

#### 2.1. Grabbing a full tag from Git ####

The most likely thing you want to build is the latest TI Wi-SUN Release TAG
typically of the form TI_WiSUN_STACK_01_00_xx.

    git checkout TI_WiSUN_STACK_01_00_xx

And you should then be ready to build configure. Jump to section 2.3.

#### 2.2. Running the bootstrap script  ####

Alternatively, you can *bootstrap* the project directly by doing the
following:

    sudo apt-get install libtool autoconf autoconf-archive
    ./bootstrap.sh

#### 2.3. Running the configure script  ####

If the `configure` script is present, run it and then start the make
process:

    ./configure --sysconfdir=/etc
    make

This may take a while. You can speed up the process by adding the
argument `-j4` to the call to `make`, substituting the number `4` with
the number of processor cores you have on your machine. This greatly
improves the speed of builds.

Also, if additional debugging information is required or helpful from
`wpantund`, add the argument `--enable-debug` to the `./configure`
line above.

### 3. Install `wpantund` ###

Once the build above is complete, execute the following command:

    sudo make install

This will install `wfantund` onto your computer.

Configuring and Using `wfantund`
-------------------------------

### 1. Configuring `wfantund` ###

Now that you have `wfantund` installed, you will need to edit the
configuration file to tell the daemon how to communicate with the NCP.
You do this by editing the `wpantund.conf` file, which (if you
followed the directions above) should now be at `/etc/wpantund.conf`.

This file is, by default, filled only with comments—which describe
all of the important configuration options that you might need to set
in order to make wpantund usable. Read them over and then uncomment
and update the appropriate configuration properties.

Alternatively, you can specify any needed properties on the command
line when invoking `wfantund`. At a minimum, at least `NCPSocketName`
needs to be specified, which describes how `wfantund` is supposed to
talk to the NCP.

Refer to the authorative documentation in `/etc/wpantund.conf` or
`./src/wpantund/wpantund.conf` for more information.

### 2. Start wfantund ###

To connect to an NCP on the serial port `/dev/ttyACM0`, type the
following into terminal:

    sudo /usr/local/sbin/wfantund -o Config:NCP:SocketPath /dev/ttyACM0 

To change interface name: -o Config:TUN:InterfaceName `<Interface name>` 
can be used (Default InterfaceName is set to wfan0)

Note that, unless you are running as root, you *must* use `sudo` when
invoking `wfantund` directly.

On an embedded device, you would add the appropriate scripts or
configuration files that would cause `wfantund` to be started at boot.
Doing so should be pretty straightforward.

### 3. Using `wfanctl` ###

Now that you have `wfantund` running, you can now issue commands to
the daemon using `wfanctl` from another window: (Again, unless you are
running as root, you *must* use `sudo`)
```
   sudo /usr/local/bin/wfanctl
```
To change interface name:
```
    sudo /usr/local/bin/wfanctl -I `<Interface name>` 
```
can be used (Default InterfaceName is set to wfan0)

The interface and stack can be started using the following commands
```
   sudo wfanctl set interface:up true
   sudo wfanctl set stack:up true
```

