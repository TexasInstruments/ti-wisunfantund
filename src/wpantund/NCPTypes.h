/*
 *
 * Copyright (c) 2016 Nest Labs, Inc.
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
 * Modified by Texas Instruments - 2021
 *
 */

#ifndef __wpantund__NCPTypes__
#define __wpantund__NCPTypes__

#include <stdint.h>
#include "time-utils.h"
#include <string>

#define MAC_FILTER_LIST_SIZE          10

namespace nl {
namespace wpantund {

enum NCPState {
	UNINITIALIZED,
	FAULT,
	UPGRADING,
	DEEP_SLEEP,
	OFFLINE,
	COMMISSIONED,
	ASSOCIATING,
	CREDENTIALS_NEEDED,
	ASSOCIATED,
	ISOLATED,
	NET_WAKE_WAKING,
	NET_WAKE_ASLEEP,
};

enum NodeType {
	UNKNOWN,
	ROUTER,
	END_DEVICE,
	SLEEPY_END_DEVICE,
	COMMISSIONER,
	LURKER,
	LEADER,
};

enum GlobalAddressFlags {
	GA_AM_GATEWAY      = 0x01,
	GA_AM_DHCP_SERVER  = 0x02,
	GA_AM_SLAAC_SERVER = 0x04,
	GA_DHCP            = 0x08,
	GA_SLAAC           = 0x10,
	GA_CONFIGURED      = 0x20,
	GA_REQUEST_SENT    = 0x40,
	GA_REQUEST_FAILED  = 0x80,
};

struct EnergyScanResultEntry
{
	uint8_t mChannel;
	int8_t 	mMaxRssi;
};

std::string address_flags_to_string(uint8_t flags);

std::string flags_to_string(uint8_t flags, const char flag_lookup[8] = "76543210");

bool ncp_state_is_sleeping(NCPState x);

bool ncp_state_has_joined(NCPState x);

bool ncp_state_is_joining(NCPState x);

bool ncp_state_is_commissioned(NCPState x);

bool ncp_state_is_busy(NCPState x);

bool ncp_state_is_joining_or_joined(NCPState x);

bool ncp_state_is_interface_up(NCPState x);

bool ncp_state_is_detached_from_ncp(NCPState x);

bool ncp_state_is_initializing(NCPState x);

bool ncp_state_is_associated(NCPState x);

std::string ncp_state_to_string(NCPState state);

NCPState string_to_ncp_state(const std::string& state_string);

std::string node_type_to_string(NodeType node_type);

std::string ncp_protocol_version_to_string(const int major, const int minor);

std::string ncp_region_to_string(uint8_t region);

std::string ch_spacing_to_string(const int ch_spacing);

std::string mac_filter_list_to_string(std::string filter_list[]);

std::string ch0_center_freq_to_string(const int ch0_mhz, const int ch0_khz);

NodeType string_to_node_type(const std::string& node_type_string);

}; // namespace wpantund
}; // namespace nl

#endif  // defined(__wpantund__NCPTypes__)
