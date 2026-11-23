ARG DOCKER_BASE_IMAGE=ubuntu:22.04
FROM ${DOCKER_BASE_IMAGE}
# Install build-essential for compiler and build tools, zsh for shell, nano for text editing, ninja for building
RUN apt-get update && apt-get install -y build-essential gdb zsh nano ninja-build wget libftdi1-dev libusb-1.0-0-dev pkg-config
# Install Cmake 3.31
RUN apt-get update && apt-get install -y cmake
# Leave container running so we can exec into it later
ENTRYPOINT ["tail", "-f", "/dev/null"]