ARG DOCKER_BASE_IMAGE=ubuntu:22.04
FROM ${DOCKER_BASE_IMAGE}
# Install compiler and build tools, zsh for shell, nano for text editing
RUN apt-get update && apt-get install -y build-essential gdb zsh nano dbus gcc g++ libdbus-1-dev libboost-dev libreadline-dev libcoap2-bin automake dbus net-tools netcat iproute2 iputils-ping curl git libtool autoconf autoconf-archive bsdmainutils
# Install Freeradius and apply config
RUN apt-get install freeradius -y
COPY external-servers/freeradius/raddb/. /etc/freeradius/3.0/
# Install dnsmasq (no need for custom config)
RUN apt install -y dnsmasq=2.86-1.1
# Leave container running so we can exec into it later
ENTRYPOINT ["tail", "-f", "/dev/null"]
