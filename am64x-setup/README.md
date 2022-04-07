# General Notes

## Setting up the ti-wisun-webapp on the am64x

The `setup_AM64x_filesystem.sh` script found in the base directory will install the boot scripts onto the am64x and automatically run the ti-wisun-webapp.

Specifically, the `start-ti-wisun-webapp.sh` script will be executed each time
the system reboots, starting the <u>ti-wisun-webapp</u> on the
port specified _(defaulting to port 8035)_.
Also, the <u>ti-wisun-webapp</u>
automatically starts wfantund when a device is connected to the
serial port specified _(defaulting to
/dev/ttyACM0)_.

## WIFI Setup

Inside of the `wifi-setup` directory, instructions/files are provided to
allow the user to connect the am64x to Enterprise networks. This setup is optional since the am64x has its own OOB wifi network.
