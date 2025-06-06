ARG DOCKER_BASE_IMAGE
FROM ${DOCKER_BASE_IMAGE}
# Install some utilities 
RUN apt update && apt install -y nano iproute2 curl systemctl
# Install freeradius
RUN apt update && apt install -y freeradius
# Copy in our options
COPY raddb/ /etc/raddb/ 