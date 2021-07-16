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

#CONFIG RELATIVE PATHS
AM64X_ENV=linux-devkit/environment-setup-aarch64-linux
AM64X_FILESYS_REL_PATH=targetNFS
TEST_WFANTUND_PATH=/usr/local/sbin/wfantund
TEST_COAP_CLIENT=/bin/coap-client
WEBSERVER_INSTALL_PATH=/usr/share/
WEBSERVER_SERVICE_FILE_PATH=/lib/systemd/system
WEBSERVER_CONF_FILE_PATH=/etc
WEBSERVER_RULES_FILE_PATH=/etc/udev/rules.d
WEBSERVER_FOLDER=ti_wisun_webapp
WEBSERVER_SERVICE_FOLDER=ti_wisun_webapp/AM64x_wisun_webapp_service
SHELL_SCRIPT_FOLDER=shell_scripts


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
  echo "\n LIBCOAP will not be cross compiled as libcoap download path is not mentioned "
fi

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

# Echo Paths
echo "AM64x environment file path"
echo $AM64X_ENV_PATH

echo "AM64x targetfilesys relative path"
echo $AM64X_FILESYS_PATH

#Check Arg to see if it is valid SDK PATH
if [ ! \( -d $1 \) ]
 then
    echo "\n Error: Specified AM6X_SDK path is not a valid directory. Please Check specified SDK Root Path"
    echo $USAGE
    echo $USAGE_EG
    echo $USAGE_REQ
   exit 0
fi

#Check Arg to see if it is valid LIB COAP DOWNLOAD PATH
if [ ! \( -d $2 \) ]
 then
    echo "\n Error: Specified LIB_COAD DOWNLOAD path is not a valid directory. Please Check specified path"
    echo $USAGE
    echo $USAGE_EG
    echo $USAGE_REQ
   exit 0
fi

#Check to see if ENV_PATH exists
if [ ! \( -f $AM64X_ENV_PATH \) ]
 then
    echo "\n Error: ENV PATH file does not exist? Expected relative env filepath: <SDK_PATH>/$AM64X_ENV"
    echo $USAGE
    echo $USAGE_EG
    echo $USAGE_REQ
   exit 0
fi

#Check if target filesystem had been setup
if [ ! \( -d $AM64X_FILESYS_PATH \) ]
 then
    echo "\n Error: AM64x default filesystem folder note created. Expected filesystem folder to be at: $AM64X_FILESYS_PATH"
    echo $USAGE
    echo $USAGE_EG
    echo $USAGE_REQ
   exit 0
fi


## Cross Compiler wfantund for AM64x ##

echo "************* Cross Compiling wfantund and wfanctl **********"

#source the environment config required for AM64x
. $AM64X_ENV_PATH

#run the bootstap.sh
sudo ./bootstrap.sh

#configure for aarch-64
./configure --sysconfdir=/etc --host=aarch64

#if there were precious makes performed, it is recommend to do a make clean
make clean

#cross compile
sudo --preserve-env=PATH make

#Install the compiled wfantund and wfanctl to the "target's root file system"
sudo make DESTDIR=$AM64X_FILESYS_PATH install

WFANTUND_PATH=$AM64X_FILESYS_PATH$TEST_WFANTUND_PATH
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
 
   
#### Setup and Copy TI_WISUN_FAN Web APP to TARGET FILESYSTEM ####
echo "******* Setting up Webserver and WebApp Service on AM64x *******"
# go into webserver folder
cd $WEBSERVER_FOLDER
npm install package.json
# go back to top level wfantund folder
cd ..
sudo cp -r $WEBSERVER_FOLDER $AM64X_FILESYS_PATH$WEBSERVER_INSTALL_PATH

#copy shell script to WEBSERVER folder
sudo cp -r $SHELL_SCRIPT_FOLDER $AM64X_FILESYS_PATH$WEBSERVER_INSTALL_PATH

# Copy service & Config files 
cd $WEBSERVER_SERVICE_FOLDER

sudo cp *.service $AM64X_FILESYS_PATH$WEBSERVER_SERVICE_FILE_PATH

sudo cp *.conf $AM64X_FILESYS_PATH$WEBSERVER_CONF_FILE_PATH

sudo cp *.rules $AM64X_FILESYS_PATH$WEBSERVER_RULES_FILE_PATH

# set the init service shell script as executable
sudo chmod +x $AM64X_FILESYS_PATH/$WEBSERVER_SERVICE_FOLDER/ti_wisunfan_webapp_service.sh



### CROSS COMPILE LIB COAP ###
if [ $# -eq 2 ]
 then
   echo "\n ********** Begining to Cross Compile LIB COAP from $2 *********** "
  else 
   exit 0
fi


#cd to specified folder
cd $2

# Clean earlier configurations
sudo ./autogen.sh --clean
 
# Set cross-compile environment
. $AM64X_ENV_PATH

# Call autogen
sudo ./autogen.sh
 
# Configure lib coap 
./configure --host=aarch64-linux  --target=aarch64-linux --prefix=$AM64X_FILESYS_PATH -disable-doxygen --disable-manpages
 
#compile the software for target
make
 
#lib-coap make install uses the PATH ENV obtained from source command. Hence, preserve it when calling make install using sudo. DESTDIR is obtained from the prefix option used in configure command
sudo --preserve-env=PATH make install


COAP_CLIENT_PATH=$AM64X_FILESYS_PATH$TEST_COAP_CLIENT
echo "\n Checking for $COAP_CLIENT_PATH"
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
