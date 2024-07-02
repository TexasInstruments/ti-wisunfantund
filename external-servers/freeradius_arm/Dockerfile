ARG DOCKER_BASE_IMAGE
FROM ${DOCKER_BASE_IMAGE}
# Install some utilities 
RUN sudo apt update && sudo apt install -y nano iproute2 curl systemctl
# Install freeradius
RUN sudo apt update && sudo apt install -y freeradius
# Copy in our options
COPY raddb/ /etc/raddb/ 