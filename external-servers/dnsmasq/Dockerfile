ARG DOCKER_BASE_IMAGE
FROM ${DOCKER_BASE_IMAGE}
# Install some utilities 
RUN sudo apt update && sudo apt install -y nano iproute2 curl systemctl
# Install dnsmasq
RUN sudo apt update && sudo apt install -y dnsmasq=2.86-1.1
# Enable DHCP server with our options
COPY etc/dnsmasq.conf /etc/dnsmasq.conf
# Start dnsmasq and don't use dns, only DHCP
ENTRYPOINT ["dnsmasq", "-d", "-C", "/dev/null", "-p", "0"]
# By default assume interface is wfan0 and assign any address from subnet::1 to subnet::ffff
CMD ["-i", "wfan0", "--dhcp-range", "2020:abcd::1,2020:abcd::ffff,64,336h"]