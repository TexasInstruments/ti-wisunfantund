# introduction

Our Wi-SUN Border Router can be configured to use an external DHCP and/or Authentication Server to give out IPv6 addresses and authenticate devices, respectively. While any DHCP or Authentication Server should work, we provide demo configurations via Docker for two common options, FreeRADIUS and Dnsmasq. Folders for both options are included here (refer to `<foldername>_arm` when running on ARM hardware, like the AM64x).

# Requirements
1. Docker Engine
2. Docker Compose

# Preface

The Docker images provided here will pull from Docker Hub by default. If you need to pull from an internal mirror / a different location, or just want to try a different base image, the Compose file allows image overrides. To do so, simply set the `FREERADIUS_BASE_IMAGE_OVERRIDE` and/or the `DNSMASQ_BASE_IMAGE_OVERRIDE` environment variables to point to different images and build/proceed as normal. Refer to `docker-compose.yml` or `docker-compose-arm.yml` for further reference. 

When running on ARM, add `-f docker-compose-arm.yml` to the `docker compose` commands below to reference the correct file.

# FreeRADIUS

FreeRADIUS is an open-source authentication server we can use to authenticate nodes trying to join our Wi-SUN network. The `freeradius` folder provides a sane configuration that uses our default certificates and accepts messages from any address, but these settings can be replaced with a custom configuration as well.

## How to Run FreeRADIUS Server for Authentication

1. Build the docker image with `docker compose build`
    - need to rebuild if any changes are made to the configuration in the `freeradius` folder
    - To modify the certs, you need to add write permissions to the file, make your changes, and then *remove* write permissions from the file, otherwise freeradius may refuse to use it.
        - `sudo chmod o+w freeradius/raddb/certs/ti_br_cert.pem` adds write permissions
        - `sudo chmod o-w freeradius/raddb/certs/ti_br_cert.pem` removes write permissions
2. Run the server in debug mode with `docker compose run --rm freeradius -X`
    - Can use `docker compose run --rm freeradius bash` to hop into the shell inside the container instead, too
    - Call `freeradius -X` inside the shell to run manually
3. FreeRADIUS Authentication Server should now be running on the host network!

# Dnsmasq

Dnsmasq is an open-source program that can act as both a DHCPv6 Server and Relay to give out IPv6 addresses to nodes that join our Wi-SUN network. Read below for instructions on using it, and refer to https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html for more documentation on configuration.

## How to Run Dnsmasq as a DHCPv6 Server

1. Build docker image with `docker compose build`
2. Make sure wfantund is running and the interface and stack are up.
3. Start container with `docker compose run --rm dnsmasq`
    - This will start the server with a sane default configuration; it will listen on interface wfan0 and give addresses out between 2020:abcd::1 and 2020:abcd::ffff.
4. If you want to run with a non-default configuration, pass your command line options in as desired. This will overwrite the default interface and address range.
    - Start the container with `docker compose run --rm dnsmasq -i wfan1 --dhcp-range 2020:abcd::1,2020:abcd::10,64,336h` to only give out a small number of different addresses on interface wfan1, for example

## How to Run DNSMasq as a DHCPv6 Relay

1. On whichever PC is running the Server, configure the DHCPv6 Server to listen to a network interface that the wfantund host can access 
    - if using Dnsmasq, this could look something like `docker compose run --rm dnsmasq -i [network interface] --dhcp-range 2020:ABCD::1,2020:ABCD::ffff,64,336h`, for example
    - this will listen for requests coming in from the given network interface and reply back over the same interface (assuming the routing table points to it)
2. On the PC running the Relay, start Dnsmasq like so: `docker compose run --rm dnsmasq -i [wfan interface],[network interface] --dhcp-relay [wfan interface address],[DHCP Server Network Interface Address]`
    - this could look something like `docker compose run --rm dnsmasq -i wfan0,eth0 --dhcp-relay 2020:ABCD::,2001:db8::`, for example
    - this will relay DHCP requests addressed to the Relay's wfan interface to the DHCP Server's network interface


## How to figure out which device has a given IPv6 lease when using Dnsmasq DHCPv6 Server
1. Since IPv6 addresses given out by Dnsmasq are not based on MAC address, it can be hard to tell just by looking at the IPv6 address which device it refers to. To do so, take a look at `/var/lib/misc/dnsmasq.leases` on the DHCPv6 Server to view the leases assigned to a given DUID. Find the IP address you're curious about, and then refer to the DUID. The DUID is based on the link local address, so the last 48 bits refer to the last 48 bits of the devices MAC address. https://datatracker.ietf.org/doc/html/rfc8415#section-11.4 