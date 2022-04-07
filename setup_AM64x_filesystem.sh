#!/bin/sh
#
# Copyright (c) 2021 Texas Instruments, Inc.
# All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

### CONFIG PATHS ###
# Wfantund project directories
BASE_PATH="$( cd "$( dirname "$0" )" && pwd )"
WEBAPP_PATH=/ti-wisun-webapp
AM64X_BOOT_SETUP_FOLDER=/am64x-setup/boot-setup
# AM64 directories
AM64X_ENV=linux-devkit/environment-setup-aarch64-linux
AM64X_FILESYS_REL_PATH=targetNFS
# Installation directories (relative to targetNFS)
WFANTUND_INSTALL_PATH=/usr/local/sbin/wfantund
NODEJS_INSTALL_PATH=/usr/local
WEBAPP_INSTALL_PATH=/usr/share/
COAP_CLIENT_INSTALL_PATH=/bin/coap-client
CRONTAB_INSTALL_PATH=/var/spool/cron/crontabs/

### USAGE ###
USAGE="USAGE: ./setup_AM64x_filesystem.sh <AM64X_SDK_INSTALL_PATH> [<LIB_COAP_INSTALL_PATH>]"
USAGE_EG="EXAMPLE: ./setup_AM64x_filesystem.sh /home/ti/ti-processor-sdk-linux-am64xx-evm-08.00.00.21/ /home/libcoap-release-4.3.0/"
USAGE_REQ="Requirements:\n1. Ensure to have setup the target filesys folder at <AM64X_SDK_INSTALL_PATH>/targetNFS following setup scripts in AM64x SDK. 
\n2. To cross compile libcoap. Download libcoap from https://github.com/obgm/libcoap/tree/release-4.3.0 & specify its path
\n3. Recommended AM64x SDK version = 8.0.x"

if [ $# -eq 0  -o -z "$1" -o $# -ge 3 ] 
	then
		echo $USAGE
		echo $USAGE_EG
		echo $USAGE_REQ
		exit 0
fi

if [ $# -eq 1 ]
	then
		echo "\nLIBCOAP will not be cross compiled as libcoap download path is not mentioned "
fi

### Absolute paths ###
AM64X_ENV_PATH=""
case "$1" in
*/)
	AM64X_ENV_PATH=$1$AM64X_ENV
	AM64X_FILESYS_PATH=$1$AM64X_FILESYS_REL_PATH
;;
*)
	AM64X_ENV_PATH=$1/$AM64X_ENV
	AM64X_FILESYS_PATH=$1/$AM64X_FILESYS_REL_PATH
;;
esac
WFANTUND_PATH=$AM64X_FILESYS_PATH$WFANTUND_INSTALL_PATH

### Echo Paths ###
echo "************* Directory paths *************"
echo "Wfantund base directory path"
echo $BASE_PATH
echo "\nAM64x environment file path"
echo $AM64X_ENV_PATH
echo "\nAM64x targetfilesys relative path"
echo $AM64X_FILESYS_PATH

### Check args to make sure they are valid ###
# Check Arg to see if it is valid SDK PATH
if [ ! \( -d $1 \) ]
then
	echo "\nError: Specified AM6X_SDK path is not a valid directory. Please Check specified SDK Root Path"
	echo $USAGE
	echo $USAGE_EG
	echo $USAGE_REQ
	exit 0
fi
# Check Arg to see if it is valid LIB COAP DOWNLOAD PATH
if [ ! \( -d $2 \) ]
then
	echo "\nError: Specified LIB_COAD DOWNLOAD path is not a valid directory. Please Check specified path"
	echo $USAGE
	echo $USAGE_EG
	echo $USAGE_REQ
	exit 0
fi
# Check to see if ENV_PATH exists
if [ ! \( -f $AM64X_ENV_PATH \) ]
then
	echo "\nError: ENV PATH file does not exist? Expected relative env filepath: <SDK_PATH>/$AM64X_ENV"
	echo $USAGE
	echo $USAGE_EG
	echo $USAGE_REQ
	exit 0
fi
#Check if target filesystem had been setup
if [ ! \( -d $AM64X_FILESYS_PATH \) ]
then
	echo "\nError: AM64x default filesystem folder note created. Expected filesystem folder to be at: $AM64X_FILESYS_PATH"
	echo $USAGE
	echo $USAGE_EG
	echo $USAGE_REQ
	exit 0
fi

### Cross Compile wfantund for AM64x ###
echo "\n************* Cross Compiling wfantund and wfanctl *************"
if [ -e $WFANTUND_PATH ]
then
	echo "Wfantund already cross-compiled, continuing next steps..."
else
	# Source the environment config required for AM64x
	. $AM64X_ENV_PATH
	# Run the bootstap.sh
	sudo ./bootstrap.sh
	# Configure for aarch-64
	./configure --sysconfdir=/etc --host=aarch64
	# If there were precious makes performed, it is recommend to do a make clean
	make clean
	# Cross compile
	sudo --preserve-env=PATH make
	#Install the compiled wfantund and wfanctl to the "target's root file system"
	sudo make DESTDIR=$AM64X_FILESYS_PATH install
	echo "Checking wfantund at $WFANTUND_PATH"
	# Check to see if cross-compilation succeeded by checking if the file was modified within last 1 minute
	if [ -f $WFANTUND_PATH ]
	then
		if [ $(( ($(date +%s) - $(stat $WFANTUND_PATH  -c %Y)) / 60 )) -le 1 ]
		then
			echo "Successfully Compiled and Moved wfantund and wfanctl to target filesystem"
		else
			echo "Error: WFANTUND does not seem to be replaced with newly compiler binaries. Please Check for error logs"
			#exit 0
		fi
	else
		echo "Error: WFANTUND does not seem to be replaced with newly compiler binaries. Please Check for error logs"
		#exit 0
	fi
fi

### Setup and Copy Node.js v16.13.2 to TARGET FILESYSTEM ###
echo "\n************* Setting up Node.js v16.13.2 on AM64x *************"
# Get the Nodejs v16.13.2 binaries
cd ~/Downloads
if [ -e node-v16.13.2-linux-arm64.tar.xz ]
then
	echo "Node.js binaries already retrieved, skipping download..."
else
	echo "Downloading Node.js v16.13.2 binaries..."
	wget https://nodejs.org/dist/v16.13.2/node-v16.13.2-linux-arm64.tar.xz
fi
# Install Node.js to the AM64x Target Filesystem
echo "Installing Node.js v16.13.2 to <TargetNFS>$NODEJS_INSTALL_PATH..."
cd $AM64X_FILESYS_PATH$NODEJS_INSTALL_PATH
sudo tar --strip-components 1 -xf ~/Downloads/node-v16.13.2-linux-arm64.tar.xz

### Setup and Copy TI_WISUN_FAN Web APP to TARGET FILESYSTEM ###
echo "\n************* Setting up Webserver and WebApp Service on AM64x *************"
# Go into webapp server folder and install packages
echo "Installing ti-wisun-webapp server dependencies..."
cd $BASE_PATH$WEBAPP_PATH/server
sudo npm install
# Go into webapp client folder, build static files and install packages
echo "\nInstalling client dependencies and building static files..."
cd $BASE_PATH$WEBAPP_PATH/client
sudo npm install
sudo npm run build
# Copy built webapp folder to am64x
sudo cp -r $BASE_PATH$WEBAPP_PATH $AM64X_FILESYS_PATH$WEBAPP_INSTALL_PATH
# Make start script executable and copy to am64x
sudo chmod +x $BASE_PATH$AM64X_BOOT_SETUP_FOLDER/start-ti-wisun-webapp.sh
sudo cp $BASE_PATH$AM64X_BOOT_SETUP_FOLDER/start-ti-wisun-webapp.sh $AM64X_FILESYS_PATH$WEBAPP_INSTALL_PATH
# Set executable and cp init-script.sh to am64x init.d
INIT_SCRIPT_PATH=$BASE_PATH$AM64X_BOOT_SETUP_FOLDER/init-script.sh
INIT_SCRIPT_INSTALL_PATH=$AM64X_FILESYS_PATH/etc/init.d/init-script.sh
sudo cp $INIT_SCRIPT_PATH $INIT_SCRIPT_INSTALL_PATH
sudo chmod +x $INIT_SCRIPT_INSTALL_PATH
# Link init-script.sh into each run level (changing name based on s-start or k-kill)
sudo ln -s ../init.d/init-script.sh $AM64X_FILESYS_PATH/etc/rc0.d/K20init-script.sh
sudo ln -s ../init.d/init-script.sh $AM64X_FILESYS_PATH/etc/rc1.d/K20init-script.sh
sudo ln -s ../init.d/init-script.sh $AM64X_FILESYS_PATH/etc/rc2.d/S20init-script.sh
sudo ln -s ../init.d/init-script.sh $AM64X_FILESYS_PATH/etc/rc3.d/S20init-script.sh
sudo ln -s ../init.d/init-script.sh $AM64X_FILESYS_PATH/etc/rc4.d/S20init-script.sh
sudo ln -s ../init.d/init-script.sh $AM64X_FILESYS_PATH/etc/rc5.d/S20init-script.sh
sudo ln -s ../init.d/init-script.sh $AM64X_FILESYS_PATH/etc/rc6.d/K20init-script.sh

### CROSS COMPILE LIB COAP ###
if [ $# -eq 2 ]
then
	echo "\n************* Begining to Cross Compile LIB COAP from $2 *************"
else 
	exit 0
fi
# Go to specified folder
cd $2
# Clean earlier configurations
sudo ./autogen.sh --clean
# Set cross-compile environment
. $AM64X_ENV_PATH
# Call autogen
sudo ./autogen.sh
# Configure lib coap 
./configure --host=aarch64-linux  --target=aarch64-linux --prefix=$AM64X_FILESYS_PATH -disable-doxygen --disable-manpages
# Compile the software for target
make
#lib-coap make install uses the PATH ENV obtained from source command. Hence, preserve it when calling make install using sudo. DESTDIR is obtained from the prefix option used in configure command
sudo --preserve-env=PATH make install
COAP_CLIENT_PATH=$AM64X_FILESYS_PATH$COAP_CLIENT_INSTALL_PATH
echo "\nChecking for $COAP_CLIENT_PATH"
# Check to see if cross-compilation succeeded by checking if the file was modified within last 1 minute
if [ -f $COAP_CLIENT_PATH ]
then
	if [ $(( ($(date +%s) - $(stat $COAP_CLIENT_PATH  -c %Y)) / 60 )) -le 1 ]
	then
		echo "Successfully Compiled and Moved COAP-CLIENT to target filesystem"
	else
		echo "Error: coap-client does not seem to be replaced with newly compiler binaries. Please Check for error logs"
		exit 0
	fi
else
	echo "Error: coap-client does not seem to be replaced with newly compiler binaries. Please Check for error logs"
	exit 0
fi