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
 *    Description:
 *		This file implements the main program entry point for the
 *		WPAN control utility, `wpanctl`.
 *
 * Modified by Texas Instruments - 2021
 *
 */


#if HAVE_CONFIG_H
#include <config.h>
#endif

#undef ASSERT_MACROS_USE_SYSLOG
#define ASSERT_MACROS_USE_SYSLOG 0

#include <getopt.h>
#include "assert-macros.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stdint.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <signal.h>
#include <string.h>
#include <ctype.h>
#include <libgen.h>
#include <time.h>

#if HAVE_PWD_H
#include <pwd.h>
#endif

#include <dbus/dbus.h>

#if HAVE_LIBREADLINE
#include <readline/readline.h>
#include <readline/history.h>
#endif // HAVE_LIBREADLINE

#include <poll.h>
#include "args.h"
#include "config-file.h"
#include "wpanctl-cmds.h"
#include "version.h"
#include "string-utils.h"
#include "wpanctl-utils.h"
#include "webserver-config.h"
#include "wpan-dbus.h"

static bool istty = true;
int WEBSERVER_APP = 0;
//extern int FILE_UPDATE_RATE;
int gDebugMode = 1;

const char * connecteddevices_filename = "/var/local/wisunwebapp/txt_files/connected_devices.txt";
const char * numconnected_filename = "/var/local/wisunwebapp/txt_files/num_connected.txt";
const char * all_connecteddevices_filename = "/var/local/wisunwebapp/txt_files/all_connected_devices.txt";

static arg_list_item_t option_list[] = {
	{ 'h', "help",          NULL,
	  "Print Help"                                                                   },
	{ 'w', "webserver",          NULL,
	  "Enable the webserver to run"                                                  },
	{ 'v', "version",       NULL,
	  "Print Version Information"                                    },
	{ 'f', NULL,            "filename",
	  "Read commands from file"                                              },
	{ 'I', "interface", "iface",
	  "Set interface to use"                                                 },
	{ 0, "ignore-mismatch", NULL, "Ignore driver version mismatch" },
	{ 0 }
};

void print_commands();
int exec_command(
    int argc, char * argv[]);

static int
tool_cmd_help(
    int argc, char* argv[]
    )
{
	if ((2 == argc) && (0 == strcmp(argv[1], "--help"))) {
		printf("Help not yet implemented for this command.\n");
		return ERRORCODE_HELP;
	}

	if ((argc == 2) && argv[1][0] != '-') {
		const char *argv2[2] = {
			argv[1],
			"--help"
		};
		return exec_command(2, (char**)argv2);
	} else {
		print_commands();
	}
	return ERRORCODE_HELP;
}

static int tool_cmd_clear(int argc, char *argv[])
{
	if (system("clear") == -1) {
		printf("\n\n\n\n\n\n\n\n");
	}
	return 0;
}

struct command_info_s commandList[] = {
	WPANCTL_CLI_COMMANDS,
	{"quit", "Terminate command line mode.", NULL},
	{"help", "Display this help.  \nFor more Information about the various commands that can be run,\nplease view the ti_wisun_commands.MD file.", &tool_cmd_help},
	{"clear", "Clear shell.", &tool_cmd_clear},
	{"?", NULL, &tool_cmd_help, 1},
	{NULL}
};

void
print_commands()
{
	int i;

	printf("Commands:\n");
	for (i = 0; commandList[i].name; ++i) {
		if (commandList[i].isHidden)
			continue;
		printf(
		    "   %s %s%s\n",
		    commandList[i].name,
		    &"                          "[strlen(commandList[i].name)],
		    commandList[i].desc
		    );
	}
}

struct command_info_s * find_cmd(char *cmd_name)
{
	int idx;
	for (idx = 0; commandList[idx].name; idx++) {
		if (strcmp(cmd_name, commandList[idx].name) == 0) {
			return commandList + idx;
		}
	}
	return NULL;
}

int exec_command(int argc, char * argv[])
{
	int ret = 0;
	struct command_info_s *cmd_entry;

	require(argc, bail);

	if ((strcmp(argv[0], "quit") == 0) || (strcmp(argv[0], "exit") == 0) ||
			(strcmp(argv[0], "q") == 0)) {
		ret = ERRORCODE_QUIT;
		goto bail;
	}

	if ((cmd_entry = find_cmd(argv[0])) == NULL) {
		fprintf(stderr, "The command \"%s\" is not recognised.\n",
			argv[0]);
		ret = ERRORCODE_BADCOMMAND;
		goto bail;
	}

	if (cmd_entry->entrypoint == NULL) {
		fprintf(stderr,
		        "The command \"%s\" is not yet implemented.\n",
		        cmd_entry->name);
		ret = ERRORCODE_NOCOMMAND;
		goto bail;
	}

	ret = cmd_entry->entrypoint(argc, argv);
bail:
	return ret;
}

#if HAVE_LIBREADLINE
static bool history_disabled;
char* wpanctl_generator(const char* text, int state)
{
	static int idx, len;
	const char *name;

	if (!state) {
		idx = 0;
		len = strlen(text);
	}

	while ((name = commandList[idx].name)) {
		idx++;

		if (commandList[idx - 1].isHidden)
			continue;

		if (strncmp(name, text, len) == 0)
			return strdup(name);
	}

	return NULL;
}

static char** wpanctl_completion(const char *text, int start, int end)
{
	if (start != 0)
		return NULL;

	return rl_completion_matches(text, wpanctl_generator);
}
#endif // HAVE_LIBREADLINE

void
process_input_line(char *l)
{
	char *inputstring;
	char *argv2[100] = {NULL};
	char **ap = argv2;
	int argc2 = 0;

	if (!l[0]) {
		l = NULL;
		goto bail;
	}
	l = strdup(l);
#if HAVE_LIBREADLINE
	if (!history_disabled) {
		add_history(l);
	}
#endif // HAVE_LIBREADLINE

	inputstring = l;
	while ((*ap = get_next_arg(inputstring, &inputstring))) {
		if (**ap != '\0') {
			ap++;
			argc2++;
		}
	}
	if (argc2 > 0) {
		gRet = exec_command(argc2, argv2);
		if (gRet == ERRORCODE_QUIT)
			goto bail;
		else if (gRet == ERRORCODE_ERRNO)
			fprintf(stderr, "errno=%d %s\n", errno, strerror(errno));
		else if (gRet < 0 && (gRet != ERRORCODE_HELP))
			fprintf(stderr, "Error %d %s\n", gRet, strerror(-gRet));
		else if (gRet && (gRet != ERRORCODE_HELP))
			fprintf(stderr, "Error %d (0x%02X)\n", gRet, gRet);

#if HAVE_LIBREADLINE
		if (!history_disabled)
			write_history(getenv("WPANCTL_HISTORY_FILE"));
#endif // HAVE_LIBREADLINE
	}

bail:
	free(l);
	return;
}

#if HAVE_LIBREADLINE
static char*
get_current_prompt()
{
	static char prompt[64] = {};

	if (!gInterfaceName[0]) {
		snprintf(prompt,
		         sizeof(prompt),
		         "wfanctl> "
		         );
	} else {
		snprintf(prompt,
		         sizeof(prompt),
		         "wfanctl:%s> ",
		         gInterfaceName
		         );
	}
	return prompt;
}

void
process_input_readline(char *l)
{
	if (NULL == l)
	{
		gRet = ERRORCODE_QUIT;
		rl_callback_handler_remove();
		return;
	}

	process_input_line(l);
	if (istty) {
#if HAVE_RL_SET_PROMPT
		if (gRet == ERRORCODE_QUIT)
			rl_set_prompt("");
		else
#endif
		rl_callback_handler_install(
		    get_current_prompt(), &process_input_readline);
	}
}
#endif // HAVE_LIBREADLINE

#pragma mark -

#if HAVE_LIBREADLINE

static int
initialize_readline()
{
	int ret = 0;

	require_action(NULL != readline, bail, ret = ERRORCODE_NOREADLINE);
	rl_initialize();

	rl_readline_name = "wpanctl";
	//rl_completer_word_break_characters = " \t\n\"\\'`@$><|&{("; // Removed '=' ';'

	using_history();
	read_history(getenv("WPANCTL_HISTORY_FILE"));
	rl_instream = stdin;

	rl_callback_handler_install(get_current_prompt(), &process_input_readline);

	rl_attempted_completion_function = wpanctl_completion;

bail:
	return ret;
}
#endif

static void
print_version()
{
	printf("wfanctl " PACKAGE_VERSION );
	if ((internal_build_source_version[0] == 0) || strequal(SOURCE_VERSION, internal_build_source_version)) {
		if (strequal(PACKAGE_VERSION, SOURCE_VERSION)) {
			printf(" (%s)\n", internal_build_date);
		} else {
			printf(" (" SOURCE_VERSION "; %s)\n", internal_build_date);
		}
	} else {
		if (strequal(SOURCE_VERSION, PACKAGE_VERSION) || strequal(PACKAGE_VERSION, internal_build_source_version)) {
			printf(" (%s; %s)\n", internal_build_source_version, internal_build_date);
		} else {
			printf(" (" SOURCE_VERSION "/%s; %s)\n", internal_build_source_version, internal_build_date);
		}
	}
}

static int
wpan_dbus_version_check(DBusConnection* connection)
{
	int timeout = 5 * 1000; // Five second timeout
	int ret = ERRORCODE_BADVERSION;
	DBusMessage *message = NULL;
	DBusMessage *reply = NULL;
	uint32_t version = 0;
	DBusError error;

	dbus_error_init(&error);

	message = dbus_message_new_method_call(
	    getenv("WPANCTL_DBUS_NAME"),
	    WPAN_TUNNEL_DBUS_PATH,
	    WPAN_TUNNEL_DBUS_INTERFACE,
	    WPANTUND_IF_GET_VERSION
	    );

	if (!message) {
		fprintf(stderr, "error: Unable to allocate dbus message\n");
		ret = ERRORCODE_ALLOC;
		goto bail;
	}

	reply = dbus_connection_send_with_reply_and_block(
	    connection,
	    message,
	    timeout,
	    &error
	    );

	if (!reply) {
		fprintf(stderr, "error: %s\n", error.message);
		ret = ERRORCODE_TIMEOUT;
		goto bail;
	}

	dbus_message_get_args(
	    reply, NULL,
	    DBUS_TYPE_UINT32, &version,
	    DBUS_TYPE_INVALID
	);

	if (gDebugMode >= 1) {
		fprintf(stderr, "DEBUG: Version check, wpanctl=%d, wpantund=%d\n", WPAN_TUNNEL_DBUS_VERSION, version);
	}

	if(version != WPAN_TUNNEL_DBUS_VERSION) {
		fprintf(stderr, "error: `wpantund` version (%d) doesn't match `wpanctl` version (%d).\n", version, WPAN_TUNNEL_DBUS_VERSION);
		goto bail;
	}

	ret = 0;

bail:
	if (message)
		dbus_message_unref(message);

	if (reply)
		dbus_message_unref(reply);

	dbus_error_free(&error);

	return ret;
}

#pragma mark -


int main(int argc, char * argv[])
{
	int c;
	bool ignore_driver_version_mismatch = false;
	DBusError error;
	DBusConnection* connection = NULL;

	dbus_error_init(&error);

	srandom(time(NULL));

	while (1) {
		static struct option long_options[] = {
			{"help", no_argument, 0, 'h'},
			{"version", no_argument, 0, 'v'},
			{"webserver",	no_argument,	0,	'w'},
			{"ignore-mismatch", no_argument, 0, 'i'},
			{"debug", no_argument, 0, 'd'},
			{"interface", required_argument, 0, 'I'},
			{"file", required_argument, 0, 'f'},
			{0, 0, 0, 0}
		};

		int option_index = 0;

		if ((optind < argc) && (find_cmd(argv[optind]) != NULL)) {
			// This is where the wpanctl command starts; skip
			// parsing the flags since they may belong to the command
			break;
	}

		c = getopt_long(argc, argv, "hvwidI:f:", long_options,
				&option_index);
		if (c == -1)
			break;
		
		switch (c) {
		case 'h':
		print_version();
		print_arg_list_help(option_list,
		                    argv[0],
		                    "[options] <sub-command> [args]");
		print_commands();
		gRet = ERRORCODE_HELP;
		goto bail;
		
		case 'v':
			print_version();
			gRet = 0;
			goto bail;

		case 'w':
			WEBSERVER_APP = 1;
			break;
		case 'd':
			gDebugMode++;
			break;

		case 'I':
			snprintf(gInterfaceName, sizeof(gInterfaceName),
				 "%s", optarg);
			break;

		case 'i':
			ignore_driver_version_mismatch = true;
			break;

		case 'f':
#if HAVE_LIBREADLINE
			if (NULL == freopen(optarg, "r", stdin))
			{
				fprintf(stderr,
						"%s: error: Unable to open file \"%s\".\n",
						argv[0], optarg);
				return ERRORCODE_BADARG;
			}
#else
			fprintf(stderr,
				"%s: Cannot read from file \"%s\" : Missing readline library.\n",
				argv[0], optarg);
			return ERRORCODE_BADARG; 
#endif
		default:
		break;
	}
	}

	istty = isatty(fileno(stdin));

	if (gDebugMode >= 1) {
		fprintf(stderr, "DEBUG: isatty(fileno(stdin)) = %d\n", istty);
	}

	if (gDebugMode >= 1) {
		fprintf(stderr, "DEBUG: Will use interface '%s'.\n", gInterfaceName);
	}

#if HAVE_PWD_H
	if (getuid() == 0 && strcmp(WPANTUND_SERVICE_USER, "root")) {
		uid_t target_uid = 0;
		gid_t target_gid = 0;
		struct passwd *passwd = getpwnam(WPANTUND_SERVICE_USER);

		if (passwd == NULL) {
			fprintf(stderr, "getpwnam: Unable to lookup user \"%s\".", WPANTUND_SERVICE_USER);
			gRet = ERRORCODE_ERRNO;
			goto bail;
		}

		target_uid = passwd->pw_uid;
		target_gid = passwd->pw_gid;

		if (target_gid != 0) {
			if (setgid(target_gid) != 0) {
				perror("setgid");
				gRet = ERRORCODE_ERRNO;
				goto bail;
			}
		}

		if (target_uid != 0) {
			if (setuid(target_uid) != 0) {
				perror("setuid");
				gRet = ERRORCODE_ERRNO;
				goto bail;
			}
		}
	}
#endif // HAVE_PWD_H

	if (getenv("WPANCTL_DBUS_NAME") && gDebugMode>=1)
		fprintf(stderr, "DEBUG: Using dbus \"%s\"\n", getenv("WPANCTL_DBUS_NAME"));

	setenv("WPANCTL_DBUS_NAME", WPAN_TUNNEL_DBUS_NAME, 0);

	if (gDebugMode >= 1) {
		fprintf(stderr, "DEBUG: trying dbus_bus_get(DBUS_BUS_SYSTEM). . .\n");
	}

	connection = dbus_bus_get(DBUS_BUS_SYSTEM, &error);

	require_string(connection != NULL, bail, error.message);

	if (gDebugMode >= 1) {
		fprintf(stderr, "DEBUG: DBusConnection: %p\n", connection);
	}

	if (gDebugMode >= 1) {
		fprintf(stderr, "DEBUG: Registering DBusConnection. . .\n");
	}

	dbus_bus_register(connection, &error);
	require_string(error.name == NULL, bail, error.message);

	if (gDebugMode >= 1) {
		fprintf(stderr, "DEBUG: DBusConnection registered.\n");
	}

	if (gDebugMode >= 1) {
		fprintf(stderr, "DEBUG: Requesting DBus name \"%s\". . .\n",WPAN_TUNNEL_DBUS_NAME ".wpanctl");
	}

	dbus_bus_request_name(connection,
	                      WPAN_TUNNEL_DBUS_NAME ".wpanctl",
	                      0,
	                      &error);

	if (gDebugMode >= 1) {
		if (error.name != NULL) {
			fprintf(stderr, "DEBUG: Requesting DBus name \"%s\" failed (no biggie): %s\n",WPAN_TUNNEL_DBUS_NAME ".wpanctl", error.name);
		} else {
			fprintf(stderr, "DEBUG: Requesting DBus name \"%s\" succeded.\n",WPAN_TUNNEL_DBUS_NAME ".wpanctl");
		}
	}

	// Don't fail if we can't get the name. It isn't a big deal.
	//require_string(error.name == NULL, bail, error.message);

	if (gDebugMode >= 1) {
		fprintf(stderr, "DEBUG: Performing wpantund version check. . .\n");
	}

	// Make sure that we are compatible with the copy of wpantund
	// that is currently running.
	gRet = wpan_dbus_version_check(connection);

	if (gRet != 0) {
		fprintf(stderr,
		        "%s: error: `wpantund` is either not running, locked up, or incompatible with this version of `wpanctl`.\n",
		        argv[0]
		        );
		if (!ignore_driver_version_mismatch)
			goto bail;
	} else {
		if (gDebugMode >= 1) {
			fprintf(stderr,
				"DEBUG: wpantund version check succeded.\n");
		}
	}

	if(WEBSERVER_APP == 1)
	{
		goto webserver_line;
	}
	if (istty) {
#if !HAVE_LIBREADLINE
		fprintf(stderr,
		        "%s: error: Interactive mode disabled: Compiled without libeditline or libreadline support.\n",
		        argv[0]
		        );
		print_arg_list_help(option_list,
		                    argv[0],
		                    "[options] <sub-command> [args]");
		print_commands();
		gRet = ERRORCODE_NOCOMMAND;
		goto bail;
#else   // HAVE_LIBREADLINE
		fprintf(stderr, "Initializing readline\n");
				
		setenv("WPANCTL_HISTORY_FILE", tilde_expand("~/.wpanctl_history"), 0);

		gRet = initialize_readline();
		if(gRet) {
			fprintf(stderr,
			        "%s: error: Failed to initialize readline: %d\n",
			        argv[0], gRet
			        );
			goto bail;
		}
#endif  // HAVE_LIBREADLINE
	}

	// Command mode.
	while ((gRet != ERRORCODE_QUIT) && !feof(stdin)) {
		optind = 0;
#if HAVE_LIBREADLINE
		if (istty) {

			int dbus_fd = -1;

			dbus_connection_get_unix_fd(connection, &dbus_fd);
			struct pollfd polltable[2] = {
				{ fileno(stdin), POLLIN | POLLHUP,               0                         },
				{ dbus_fd,               POLLIN | POLLHUP,               0                         },
			};

			if (poll(
			        polltable,
			        (dbus_fd >= 0) ? 2 : 1,
			        1000
			        ) < 0
			    ) {
				if (errno == EINTR) {
					// We just caught a signal.
					// Do nothing.
				} else {
					break;
				}
			}

			if (polltable[0].revents)
				rl_callback_read_char();
		} else
#endif  // HAVE_LIBREADLINE
		{
			char linebuffer[200];
			process_input_line(fgets(linebuffer, sizeof(linebuffer), stdin));
		}

		dbus_connection_read_write_dispatch(connection, 0);
	}
	
	if (optind < argc) {
			if (gDebugMode >= 1) {
			fprintf(stderr, "DEBUG: Executing command '%s'. . .\n",
				argv[optind]);
		}

		argc -= optind;
		argv += optind;

		optind = 0;
		gRet = exec_command(argc, argv);
		goto bail;
	}

webserver_line:
    // This is required because optind is treated as a global variable,
    // and the length of optind is used to determine whether additional
    // optional arguments must be passed.
    optind = 0;
    fprintf(stdout, "WEBSERVER_APP=%d", WEBSERVER_APP);

	if(WEBSERVER_APP == 1)
	{
		FILE * fp = NULL;
	    char * line = NULL;
	    size_t len = 0;
	    ssize_t read;
	    char sp = ' ';
	    char * space = &sp;
	    char list_title[] = "List ";
	  	char * list_str = list_title;

		fprintf(stdout, "Calling command: %s", set_interface_up_cmd);
	    process_input_line((char *)set_interface_up_cmd);

	    sleep(5);


	    fprintf(stdout, "Calling command: %s", set_stack_up_cmd);
	    process_input_line((char *)set_stack_up_cmd);

	    sleep(5);
	    while(1)
	    {
	    	fprintf(stdout, "Updating connecteddevices and numconnected files, polling every %d seconds\n", FILE_UPDATE_RATE);
			fprintf(stdout, "Calling command: %s", get_connected_devices_cmd);
			process_input_line((char*)get_connected_devices_cmd);
			fprintf(stdout, "Calling command: %s", get_num_connected_cmd);
			process_input_line((char*)get_num_connected_cmd);

		
		fp = fopen(all_connecteddevices_filename, "r");
			
		if(fp != NULL)
		{
			while ((read = getline(&line, &len, fp)) != -1)
			{
				char *pch = strstr(line, list_str);
				char *pch2 = strstr(line, space);

				// if there is not a space or 'List' string, then this is an ip address
				if(!pch && !pch2 && line[0] != ':' && line[0] != sp && line[0] != '\n')
				{
					fprintf(stdout, "IP Address Found: %s", line);

					// create new cmd
					char set_dodag_dest_cmd2[50];

					// copy previous command to new command
					strcpy(set_dodag_dest_cmd2, set_dodag_dest_cmd);

					// concat the ip address to set dodag dest cmd
					strcat(set_dodag_dest_cmd2, line);
					fprintf(stdout, "Calling command: %s", set_dodag_dest_cmd2);
					process_input_line((char*) &set_dodag_dest_cmd2);
					fprintf(stdout, "Calling command: %s", get_dodag_route_cmd);
					process_input_line((char*) &get_dodag_route_cmd);
				}
			}

			fclose(fp);
		
		}
		else
		{
			fprintf(stdout, "\n Waiting for nodes to join");
		}

		// get dodag for each of the nodes in the file
		
		sleep(FILE_UPDATE_RATE);
	    }

	}


bail:
#if HAVE_LIBREADLINE
	rl_callback_handler_remove();
#endif  // HAVE_LIBREADLINE
	if (gRet == ERRORCODE_QUIT)
		gRet = 0;

	if (connection) {
		dbus_connection_unref(connection);
	}

	dbus_error_free(&error);

	return gRet;
}
