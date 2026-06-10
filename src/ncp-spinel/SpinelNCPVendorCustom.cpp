/*
 *
 * Copyright (c) 2018 Nest Labs, Inc.
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

#if HAVE_CONFIG_H
#include <config.h>
#endif

#include "SpinelNCPVendorCustom.h"

#include <syslog.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/socket.h>
#include <sys/select.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <ifaddrs.h>

#include "assert-macros.h"
#include "time-utils.h"
#include "any-to.h"
#include "spinel-extra.h"
#include "IPv6Helpers.h"
#include "SpinelNCPInstance.h"
#include "SpinelNCPTask.h"
#include "SpinelNCPTaskSendCommand.h"
#include "wpan-properties.h"

using namespace nl;
using namespace wpantund;

SpinelNCPVendorCustom::SpinelNCPVendorCustom(SpinelNCPInstance* instance):
	mInstance(instance)
	, mMQTTClient(NULL)
	, mDirectFd(-1)
{
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_TCPMode));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_TCPServerListen));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_TCPClientConnect));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_TCPSendAll));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_TCPSendTo));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_TCPStatus));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_TCPDisconnect));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_MQTTConnect));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_MQTTDisconnect));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_MQTTPublish));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_MQTTSubscribe));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_MQTTUnsubscribe));
	mSupportedProperties.insert(std::string(kWPANTUNDProperty_MQTTStatus));

	/* Create MQTT client with callbacks that issue TCP Spinel commands */
	mMQTTClient = new MQTTClient(
		/* SendDataFn */
		[this](const uint8_t *data, size_t len) {
			this->mqtt_tcp_send_data(data, len);
		},
		/* TcpConnectFn */
		[this](const std::string &addr, uint16_t port) -> bool {
			return this->mqtt_tcp_connect(addr, port);
		},
		/* TcpDisconnectFn */
		[this]() {
			this->mqtt_tcp_disconnect();
		}
	);
	// Warning: `instance` hasn't yet been fully constructed at this point.
}

SpinelNCPVendorCustom::~SpinelNCPVendorCustom()
{
	if (mDirectFd >= 0) {
		close(mDirectFd);
		mDirectFd = -1;
	}
	delete mMQTTClient;
	mMQTTClient = NULL;
	// Warning: `instance` has been partially destructed at this point.
}

bool
SpinelNCPVendorCustom::setup_property_supported_by_class(const std::string& prop_name)
{
	return false;
}

const std::set<std::string>&
SpinelNCPVendorCustom::get_supported_property_keys()const
{
	return mSupportedProperties;
}

bool
SpinelNCPVendorCustom::is_property_key_supported(const std::string& key)const
{
	return get_supported_property_keys().count(key) != 0;
}

/* Maps TCP property key strings to Spinel vendor property IDs.
 * MQTT properties are handled locally in wfantund and are NOT in this map. */
static spinel_prop_key_t vendor_key_to_spinel(const char *key)
{
	struct { const char *name; spinel_prop_key_t id; } map[] = {
		{ kWPANTUNDProperty_TCPMode,          SPINEL_PROP_VENDOR_TCP_MODE           },
		{ kWPANTUNDProperty_TCPServerListen,  SPINEL_PROP_VENDOR_TCP_SERVER_LISTEN  },
		{ kWPANTUNDProperty_TCPClientConnect, SPINEL_PROP_VENDOR_TCP_CLIENT_CONNECT },
		{ kWPANTUNDProperty_TCPSendAll,       SPINEL_PROP_VENDOR_TCP_SEND_ALL       },
		{ kWPANTUNDProperty_TCPSendTo,        SPINEL_PROP_VENDOR_TCP_SEND_TO        },
		{ kWPANTUNDProperty_TCPStatus,        SPINEL_PROP_VENDOR_TCP_STATUS         },
		{ kWPANTUNDProperty_TCPDisconnect,    SPINEL_PROP_VENDOR_TCP_DISCONNECT     },
	};
	for (size_t i = 0; i < sizeof(map)/sizeof(map[0]); i++) {
		if (strcaseequal(key, map[i].name)) return map[i].id;
	}
	return 0;
}

void
SpinelNCPVendorCustom::property_get_value(const std::string& key, CallbackWithStatusArg1 cb)
{
    /* ---- MQTT:Status — answered locally from MQTTClient state ---- */
    if (strcaseequal(key.c_str(), kWPANTUNDProperty_MQTTStatus)) {
        cb(kWPANTUNDStatus_Ok,
           boost::any(std::string(mMQTTClient->get_status_str())));
        return;
    }

    /* ---- All other MQTT properties are SET-only ---- */
    if (strcaseequal(key.c_str(), kWPANTUNDProperty_MQTTConnect)      ||
        strcaseequal(key.c_str(), kWPANTUNDProperty_MQTTDisconnect)   ||
        strcaseequal(key.c_str(), kWPANTUNDProperty_MQTTPublish)      ||
        strcaseequal(key.c_str(), kWPANTUNDProperty_MQTTSubscribe)    ||
        strcaseequal(key.c_str(), kWPANTUNDProperty_MQTTUnsubscribe)) {
        cb(kWPANTUNDStatus_FeatureNotSupported,
           boost::any(std::string("Property is SET-only: ") + key));
        return;
    }

    spinel_prop_key_t spinel_key = vendor_key_to_spinel(key.c_str());

    if (spinel_key == SPINEL_PROP_VENDOR_TCP_MODE) {
        CallbackWithStatusArg1 wrapper = [cb](int status, const boost::any& value) {
            if (status == 0) {
                int mode = any_to_int(value);
                std::string mode_str;
                switch (mode) {
                    case 0:  mode_str = "server";  break;
                    case 1:  mode_str = "client";  break;
                    default: mode_str = "stopped"; break;
                }
                cb(status, boost::any(mode_str));
            } else {
                cb(status, value);
            }
        };
        mInstance->start_new_task(SpinelNCPTaskSendCommand::Factory(mInstance)
            .set_callback(wrapper)
            .add_command(SpinelPackData(SPINEL_FRAME_PACK_CMD_PROP_VALUE_GET, spinel_key))
            .set_reply_format(SPINEL_DATATYPE_UINT8_S)
            .finish()
        );

    } else if (spinel_key == SPINEL_PROP_VENDOR_TCP_STATUS) {
        CallbackWithStatusArg1 wrapper = [cb](int status, const boost::any& value) {
            if (status == 0) {
                try {
                    Data data = boost::any_cast<Data>(value);
                    if (data.size() >= 3) {
                        uint8_t mode      = data[0];
                        uint8_t connected = data[1];
                        uint8_t clients   = data[2];
                        const char *mode_str;
                        switch (mode) {
                            case 0:  mode_str = "server";  break;
                            case 1:  mode_str = "client";  break;
                            default: mode_str = "stopped"; break;
                        }
                        char buf[128];
                        snprintf(buf, sizeof(buf), "mode=%s connected=%s clients=%d",
                                 mode_str, connected ? "yes" : "no", clients);
                        cb(status, boost::any(std::string(buf)));
                    } else {
                        cb(status, value);
                    }
                } catch (const boost::bad_any_cast&) {
                    cb(status, value);
                }
            } else {
                cb(status, value);
            }
        };
        mInstance->start_new_task(SpinelNCPTaskSendCommand::Factory(mInstance)
            .set_callback(wrapper)
            .add_command(SpinelPackData(SPINEL_FRAME_PACK_CMD_PROP_VALUE_GET, spinel_key))
            .set_reply_format(SPINEL_DATATYPE_DATA_S)
            .finish()
        );

    } else if (spinel_key != 0) {
        cb(kWPANTUNDStatus_FeatureNotSupported,
           boost::any(std::string("Property is SET-only: ") + key));
    } else {
        cb(kWPANTUNDStatus_FeatureNotSupported,
           boost::any(std::string("Unknown property: ") + key));
    }
}

void
SpinelNCPVendorCustom::property_set_value(const std::string& key, const boost::any& value, CallbackWithStatus cb)
{
    std::string str_value = any_to_string(value);

    /* ================================================================
     * MQTT properties — handled locally by MQTTClient in wfantund.
     * Transport is the existing TCP Spinel commands.
     * ================================================================ */

    if (strcaseequal(key.c_str(), kWPANTUNDProperty_MQTTConnect)) {
        /* Format: "ipv6_addr port client_id [keepalive]" */
        size_t sp1 = str_value.find(' ');
        if (sp1 == std::string::npos) { cb(kWPANTUNDStatus_InvalidArgument); return; }
        std::string addr_str = str_value.substr(0, sp1);
        std::string rest     = str_value.substr(sp1 + 1);

        size_t sp2 = rest.find(' ');
        if (sp2 == std::string::npos) { cb(kWPANTUNDStatus_InvalidArgument); return; }
        uint16_t port = (uint16_t)strtol(rest.c_str(), NULL, 10);
        rest = rest.substr(sp2 + 1);

        size_t sp3 = rest.find(' ');
        std::string client_id;
        uint16_t keepalive = 60;
        if (sp3 != std::string::npos) {
            client_id  = rest.substr(0, sp3);
            keepalive  = (uint16_t)strtol(rest.substr(sp3 + 1).c_str(), NULL, 10);
        } else {
            client_id = rest;
        }

        int ret = mMQTTClient->connect(addr_str, port, client_id, keepalive);
        if (ret != 0) {
            cb(kWPANTUNDStatus_InvalidArgument);
        } else {
            cb(kWPANTUNDStatus_Ok);
        }
        return;
    }

    if (strcaseequal(key.c_str(), kWPANTUNDProperty_MQTTDisconnect)) {
        mMQTTClient->disconnect();
        cb(kWPANTUNDStatus_Ok);
        return;
    }

    if (strcaseequal(key.c_str(), kWPANTUNDProperty_MQTTPublish)) {
        /* Format: "topic retain [payload]"
         * QoS field removed — implementation is QoS 0 only. */
        size_t sp1 = str_value.find(' ');
        if (sp1 == std::string::npos) { cb(kWPANTUNDStatus_InvalidArgument); return; }
        std::string topic = str_value.substr(0, sp1);
        std::string rest  = str_value.substr(sp1 + 1);

        size_t sp2 = rest.find(' ');
        uint8_t retain = (uint8_t)strtol(rest.c_str(), NULL, 10);
        std::string payload_str;
        if (sp2 != std::string::npos) {
            payload_str = rest.substr(sp2 + 1);
        }

        int ret = mMQTTClient->publish(topic,
                                       (const uint8_t *)payload_str.c_str(),
                                       payload_str.size(),
                                       retain);
        cb(ret == 0 ? kWPANTUNDStatus_Ok : kWPANTUNDStatus_InvalidForCurrentState);
        return;
    }

    if (strcaseequal(key.c_str(), kWPANTUNDProperty_MQTTSubscribe)) {
        /* Format: "topic"
         * QoS field removed — implementation is QoS 0 only. */
        int ret = mMQTTClient->subscribe(str_value, 0);
        cb(ret == 0 ? kWPANTUNDStatus_Ok : kWPANTUNDStatus_InvalidForCurrentState);
        return;
    }

    if (strcaseequal(key.c_str(), kWPANTUNDProperty_MQTTUnsubscribe)) {
        int ret = mMQTTClient->unsubscribe(str_value);
        cb(ret == 0 ? kWPANTUNDStatus_Ok : kWPANTUNDStatus_InvalidForCurrentState);
        return;
    }

    /* ================================================================
     * TCP properties — forward to NCP via Spinel commands (unchanged)
     * ================================================================ */

    spinel_prop_key_t spinel_key = vendor_key_to_spinel(key.c_str());

    if (spinel_key == 0) {
        cb(kWPANTUNDStatus_FeatureNotSupported);
        return;
    }

    if (spinel_key == SPINEL_PROP_VENDOR_TCP_SERVER_LISTEN) {
        uint16_t port = (uint16_t)strtol(str_value.c_str(), NULL, 10);
        mInstance->start_new_task(SpinelNCPTaskSendCommand::Factory(mInstance)
            .set_callback(cb)
            .add_command(SpinelPackData(
                SPINEL_FRAME_PACK_CMD_PROP_VALUE_SET(SPINEL_DATATYPE_UINT16_S),
                spinel_key, port))
            .finish()
        );

    } else if (spinel_key == SPINEL_PROP_VENDOR_TCP_CLIENT_CONNECT) {
        std::string addr_port = str_value;
        size_t last_colon = addr_port.rfind(':');
        if (last_colon == std::string::npos) { cb(kWPANTUNDStatus_InvalidArgument); return; }
        std::string addr_str = addr_port.substr(0, last_colon);
        uint16_t port = (uint16_t)strtol(addr_port.substr(last_colon + 1).c_str(), NULL, 10);
        struct in6_addr addr6;
        if (inet_pton(AF_INET6, addr_str.c_str(), &addr6) != 1) { cb(kWPANTUNDStatus_InvalidArgument); return; }
        mInstance->start_new_task(SpinelNCPTaskSendCommand::Factory(mInstance)
            .set_callback(cb)
            .add_command(SpinelPackData(
                SPINEL_FRAME_PACK_CMD_PROP_VALUE_SET(SPINEL_DATATYPE_IPv6ADDR_S SPINEL_DATATYPE_UINT16_S),
                spinel_key, &addr6, port))
            .finish()
        );

    } else if (spinel_key == SPINEL_PROP_VENDOR_TCP_SEND_ALL) {
        mInstance->start_new_task(SpinelNCPTaskSendCommand::Factory(mInstance)
            .set_callback(cb)
            .add_command(SpinelPackData(
                SPINEL_FRAME_PACK_CMD_PROP_VALUE_SET(SPINEL_DATATYPE_DATA_WLEN_S),
                spinel_key,
                (const uint8_t *)str_value.c_str(), (uint16_t)str_value.length()))
            .finish()
        );

    } else if (spinel_key == SPINEL_PROP_VENDOR_TCP_SEND_TO) {
        size_t colon = str_value.find(':');
        if (colon == std::string::npos) { cb(kWPANTUNDStatus_InvalidArgument); return; }
        uint8_t slot = (uint8_t)strtol(str_value.substr(0, colon).c_str(), NULL, 10);
        std::string data = str_value.substr(colon + 1);
        mInstance->start_new_task(SpinelNCPTaskSendCommand::Factory(mInstance)
            .set_callback(cb)
            .add_command(SpinelPackData(
                SPINEL_FRAME_PACK_CMD_PROP_VALUE_SET(SPINEL_DATATYPE_UINT8_S SPINEL_DATATYPE_DATA_WLEN_S),
                spinel_key, slot,
                (const uint8_t *)data.c_str(), (uint16_t)data.length()))
            .finish()
        );

    } else if (spinel_key == SPINEL_PROP_VENDOR_TCP_DISCONNECT) {
        mInstance->start_new_task(SpinelNCPTaskSendCommand::Factory(mInstance)
            .set_callback(cb)
            .add_command(SpinelPackData(
                SPINEL_FRAME_PACK_CMD_PROP_VALUE_SET(SPINEL_DATATYPE_VOID_S),
                spinel_key))
            .finish()
        );

    } else {
        cb(kWPANTUNDStatus_FeatureNotSupported);
    }
}

/* ---- Private helpers: TCP transport for MQTTClient ---- */

void SpinelNCPVendorCustom::mqtt_tcp_send_data(const uint8_t *data, size_t len)
{
    if (mDirectFd >= 0) {
        /* Direct Linux socket path (BR self-connection) */
        ssize_t sent = send(mDirectFd, data, len, MSG_NOSIGNAL);
        if (sent < 0) {
            syslog(LOG_ERR, "mqtt_direct: send() failed: %s", strerror(errno));
            close(mDirectFd);
            mDirectFd = -1;
            mMQTTClient->handle_tcp_disconnected();
        }
        return;
    }

    /* Spinel path (mesh node) */
    mInstance->start_new_task(SpinelNCPTaskSendCommand::Factory(mInstance)
        .set_callback(CallbackWithStatus([](int) {}))
        .add_command(SpinelPackData(
            SPINEL_FRAME_PACK_CMD_PROP_VALUE_SET(SPINEL_DATATYPE_DATA_WLEN_S),
            SPINEL_PROP_VENDOR_TCP_SEND_ALL,
            data, (uint16_t)len))
        .finish()
    );
}

bool SpinelNCPVendorCustom::try_direct_connect(const std::string &addr, uint16_t port)
{
    /* Open a non-blocking Linux TCP socket and wait up to 50 ms to see if a
     * broker is actually listening at addr:port via the Linux kernel's routing.
     *
     * Decision logic:
     *   connect() succeeds / SO_ERROR == 0  → broker is local, use this fd
     *   connect() fails with ECONNREFUSED   → address is reachable by the
     *                                          Linux kernel but nothing is
     *                                          listening; fall back to Spinel
     *   select() times out (50 ms)          → address is NOT locally reachable
     *                                          (would go through the mesh);
     *                                          fall back to Spinel
     *
     * Both ECONNREFUSED and success settle in < 1 ms on a local interface,
     * so the 50 ms timeout only fires for truly remote addresses. */

    struct sockaddr_in6 sa;
    memset(&sa, 0, sizeof(sa));
    sa.sin6_family = AF_INET6;
    sa.sin6_port   = htons(port);

    if (inet_pton(AF_INET6, addr.c_str(), &sa.sin6_addr) != 1) {
        return false;
    }

    int fd = socket(AF_INET6, SOCK_STREAM, 0);
    if (fd < 0) {
        syslog(LOG_DEBUG, "mqtt_direct: socket() failed: %s", strerror(errno));
        return false;
    }

    fcntl(fd, F_SETFL, fcntl(fd, F_GETFL, 0) | O_NONBLOCK);

    int ret = connect(fd, (struct sockaddr *)&sa, sizeof(sa));
    if (ret == 0) {
        /* Immediate success */
        syslog(LOG_INFO, "mqtt_direct: connected to [%s]:%u", addr.c_str(), port);
        mDirectFd = fd;
        mMQTTClient->handle_tcp_connected();
        return true;
    }

    if (errno != EINPROGRESS) {
        syslog(LOG_DEBUG, "mqtt_direct: connect() error: %s", strerror(errno));
        close(fd);
        return false;
    }

    /* Wait up to 50 ms for the result */
    fd_set wfds;
    FD_ZERO(&wfds);
    FD_SET(fd, &wfds);
    struct timeval tv = {0, 50000};   /* 50 ms */

    if (select(fd + 1, NULL, &wfds, NULL, &tv) <= 0) {
        /* Timed out — address is not locally reachable, fall back to Spinel */
        syslog(LOG_DEBUG, "mqtt_direct: timeout — broker not local, using Spinel");
        close(fd);
        return false;
    }

    int err = 0;
    socklen_t errlen = sizeof(err);
    getsockopt(fd, SOL_SOCKET, SO_ERROR, &err, &errlen);

    if (err != 0) {
        /* e.g. ECONNREFUSED — address reachable but no broker there */
        syslog(LOG_DEBUG, "mqtt_direct: connect settled with error: %s — using Spinel", strerror(err));
        close(fd);
        return false;
    }

    /* Broker accepted the connection */
    syslog(LOG_INFO, "mqtt_direct: connected to local broker [%s]:%u", addr.c_str(), port);
    mDirectFd = fd;
    mMQTTClient->handle_tcp_connected();
    return true;
}

bool SpinelNCPVendorCustom::mqtt_tcp_connect(const std::string &addr, uint16_t port)
{
    /* Always probe the direct Linux socket path first.
     * try_direct_connect() waits up to 50 ms and only returns true if a
     * broker is actually accepting connections — it returns false on both
     * ECONNREFUSED (address reachable, nothing listening) and timeout
     * (address not locally reachable at all).
     * This correctly handles every node type without any address checks:
     *   BR  → broker running locally  → succeeds in < 1 ms → direct path
     *   RN  → broker not local        → ECONNREFUSED < 1 ms → Spinel path */
    if (try_direct_connect(addr, port)) {
        return true;
    }

    syslog(LOG_INFO, "mqtt: direct probe failed, using Spinel TCP:ClientConnect");

    struct in6_addr addr6;
    if (inet_pton(AF_INET6, addr.c_str(), &addr6) != 1) {
        return false;
    }
    mInstance->start_new_task(SpinelNCPTaskSendCommand::Factory(mInstance)
        .set_callback(CallbackWithStatus([](int) {}))
        .add_command(SpinelPackData(
            SPINEL_FRAME_PACK_CMD_PROP_VALUE_SET(
                SPINEL_DATATYPE_IPv6ADDR_S
                SPINEL_DATATYPE_UINT16_S),
            SPINEL_PROP_VENDOR_TCP_CLIENT_CONNECT,
            &addr6, port))
        .finish()
    );
    return true;
}

void SpinelNCPVendorCustom::mqtt_tcp_disconnect()
{
    if (mDirectFd >= 0) {
        /* Direct Linux socket path */
        close(mDirectFd);
        mDirectFd = -1;
        return;
    }

    /* Spinel path */
    mInstance->start_new_task(SpinelNCPTaskSendCommand::Factory(mInstance)
        .set_callback(CallbackWithStatus([](int) {}))
        .add_command(SpinelPackData(
            SPINEL_FRAME_PACK_CMD_PROP_VALUE_SET(SPINEL_DATATYPE_VOID_S),
            SPINEL_PROP_VENDOR_TCP_DISCONNECT))
        .finish()
    );
}

void
SpinelNCPVendorCustom::property_insert_value(const std::string& key, const boost::any& value, CallbackWithStatus cb)
{
	cb(kWPANTUNDStatus_FeatureNotSupported);
}

void
SpinelNCPVendorCustom::property_remove_value(const std::string& key, const boost::any& value, CallbackWithStatus cb)
{
	cb(kWPANTUNDStatus_FeatureNotSupported);
}

cms_t
SpinelNCPVendorCustom::get_ms_to_next_event(void)
{
    /* When using the direct Linux socket, process() must be called
     * frequently to poll for incoming data and connect completion. */
    if (mDirectFd >= 0) {
        return 50;
    }

    if (mMQTTClient) {
        cms_t mqtt_next = mMQTTClient->get_ms_to_next_event();
        if (mqtt_next != CMS_DISTANT_FUTURE) {
            return mqtt_next;
        }
    }
    return CMS_DISTANT_FUTURE;
}

void
SpinelNCPVendorCustom::process(void)
{
    if (mMQTTClient) {
        mMQTTClient->process();
    }

    if (mDirectFd < 0) {
        return;
    }

    /* Read any available data from the direct socket */
    uint8_t buf[512];
    ssize_t n = recv(mDirectFd, buf, sizeof(buf), MSG_DONTWAIT);

    if (n > 0) {
        mMQTTClient->handle_tcp_rx(buf, (size_t)n);
    } else if (n == 0) {
        /* Remote end closed the connection */
        syslog(LOG_INFO, "mqtt_direct: connection closed by broker");
        close(mDirectFd);
        mDirectFd = -1;
        mMQTTClient->handle_tcp_disconnected();
    } else if (errno != EAGAIN && errno != EWOULDBLOCK) {
        /* Real error */
        syslog(LOG_ERR, "mqtt_direct: recv() error: %s", strerror(errno));
        close(mDirectFd);
        mDirectFd = -1;
        mMQTTClient->handle_tcp_disconnected();
    }
    /* EAGAIN / EWOULDBLOCK = no data available right now, that's fine */
}