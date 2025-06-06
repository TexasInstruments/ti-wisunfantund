ARG DOCKER_BASE_IMAGE=ubuntu:22.04
FROM ${DOCKER_BASE_IMAGE}
# Install build-essential for compiler and build tools, zsh for shell, nano for text editing, ninja for building
RUN apt-get update && apt-get install -y build-essential gdb zsh nano ninja-build wget
# Install Cmake 3.31
RUN wget -qO- "https://cmake.org/files/v3.31/cmake-3.31.0-linux-x86_64.tar.gz" | tar --strip-components=1 -xz -C /usr/local
# Leave container running so we can exec into it later
ENTRYPOINT ["tail", "-f", "/dev/null"]