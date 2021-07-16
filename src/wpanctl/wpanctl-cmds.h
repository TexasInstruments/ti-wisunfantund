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

#ifndef wpantund_wpanctl_cmds_h
#define wpantund_wpanctl_cmds_h

#include "tool-cmd-begin-net-wake.h"
#include "tool-cmd-list.h"
#include "tool-cmd-getprop.h"
#include "tool-cmd-setprop.h"
#include "tool-cmd-insertprop.h"
#include "tool-cmd-removeprop.h"
#include "tool-cmd-add-route.h"
#include "tool-cmd-remove-route.h"
#include "tool-cmd-status.h"

#include "wpanctl-utils.h"

#define WPANCTL_CLI_COMMANDS \
	{ \
		"get", \
		"Get a property", \
		&tool_cmd_getprop \
	}, \
	{ \
		"set", \
		"Set a property", \
		&tool_cmd_setprop \
	}, \
    { \
		"status", \
		"Retrieve the status of the interface.", \
		&tool_cmd_status \
	}, \
	{ \
		"add", \
		"Used for adding values to macfilterlist", \
		&tool_cmd_insertprop, 1 \
	}, \
	{ \
		"remove", \
		"Used for removing values to macfilterlist", \
		&tool_cmd_removeprop, 1 \
	} \

#endif
