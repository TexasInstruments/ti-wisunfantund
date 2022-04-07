# This script starts the ti-wisun-webapp, which will automatically
# start wfantund once a device is connected to the specified serial port
# with --serial-port or (/dev/ttyACM0 by default) and run the webserver
# on the specified port (8035)

# Start the webapp
node /usr/share/ti-wisun-webapp/server/src/index.js --host=0.0.0.0 --port=8035
