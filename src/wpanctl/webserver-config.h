/*
*
* Copyright (c) 2021 Texas Instruments
* All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
*/

#ifndef WEBSERVER_CONFIG_H
#define WEBSERVER_CONFIG_H

extern int WEBSERVER_APP;
// this value is in seconds
const int FILE_UPDATE_RATE = 30;


// this command starts the interface
const char set_interface_up_cmd[] = "set interface:up true\n";
// this command starts up the stack
const char set_stack_up_cmd[] = "set stack:up true\n";
// pass in an ipaddress to this command to set the dodagroutedest
const char set_dodag_dest_cmd[] = "set dodagroutedest ";
// this command gets the dodag route dest node
const char get_dodag_dest_cmd[] = "get dodagroutedest\n";
// this command calls get dodagroute
const char get_dodag_route_cmd[] = "get dodagroute\n";
// this command gets connected devices
const char get_connected_devices_cmd[] = "get connecteddevices\n";
// this command gets num connected
const char get_num_connected_cmd[] = "get numconnected\n";
#endif
