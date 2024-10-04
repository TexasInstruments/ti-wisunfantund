# Requirements
1. Docker Engine
2. Docker Compose

# How to Run DNSMasq as a DHCPv6 Server
0. Navigate to this folder
1. Build the docker image with `docker compose build`
2. Make sure wfantund is running and the interface and stack are up.
3. Start the container with `docker compose run --rm dnsmasq`
    - This will start the server with a sane default configuration; it will listen on interface wfan0 and give addresses out between 2020:abcd::1,2020:abcd::ffff.
4. If you want to run with a non-standard configuration, pass your command line options in as desired. This will overwrite the default interface and address range.
    - Start the container with `docker compose run --rm dnsmasq -i wfan1 --dhcp-range 2020:abcd::1,2020:abcd::10,64,336h` to only give out 10 different addresses on interface wfan1, for example
    - Refer to https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html for more options related to dhcp-range if needed


# How to figure out which device has a given IPv6 lease
1. Since IPv6 addresses given out by Dnsmasq are not based on MAC address, it can be hard to tell just by looking at the IPv6 address which device it refers to. To do so, simply take a look at `/var/lib/misc/dnsmasq.leases` on the DHCPv6 Server to view the leases given to a given DUID. Find the IP address you're curious about, and then refer to the DUID. The DUID is based on the link local address, so the last 48 bits (check this caden) refer to the last 48 bits of the devices MAC address! https://datatracker.ietf.org/doc/html/rfc8415#section-11.4 