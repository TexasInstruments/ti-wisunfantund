#include "CfgParser.hpp"
#include <iostream>
#include <cstring>
#include <algorithm>

#include "ws_config.h"

#define TRACE_GROUP "cfgp"

CfgParser::CfgParser() {
    iniFile = nullptr;
}

CfgParser::~CfgParser() {
    if (iniFile) {
        iniFile.reset();
    }
}

template <typename T>
std::shared_ptr<T> CfgParser::getTypedSection(const std::string& name) const {
    static_assert(std::is_base_of<IniSection, T>::value, "getTypedSection() can only be called with a subclass of IniSection");
    if (!iniFile) {
        return nullptr;
    }
    
    auto section = iniFile->getSection(name);
    if (!section) {
        return nullptr;
    }
    
    return std::dynamic_pointer_cast<T>(section);
}

bool CfgParser::parse(int argc, char** argv) {
    if (argc < 2) {
        tr_err("No configuration file provided!");
        return false;
    }
    
    // Create a new IniFile Object and parse the config file
    iniFile = std::make_unique<IniFile>(argv[1]);
    
    // Register section handlers
    iniFile->registerSection("uart-cfg", std::make_shared<UartSection>("uart-cfg"));
    iniFile->registerSection("ncp-cfg", std::make_shared<NcpSection>("ncp-cfg"));
    iniFile->registerSection("dhcp-cfg", std::make_shared<DhcpSection>("dhcp-cfg"));
    iniFile->registerSection("radius-cfg", std::make_shared<RadiusSection>("radius-cfg"));
    
    // Parse the INI file
    return iniFile->parse();
}

void CfgParser::applySettings(struct uart_cfg **u_cfg_ptr, uint16_t *ncp_socket_port) {
    auto uartSection = getTypedSection<UartSection>("uart-cfg");
    if (uartSection) {
        // change the uart pointer to point at the newly parsed config
        const struct uart_cfg* config = uartSection->getConfig();
        *u_cfg_ptr = const_cast<struct uart_cfg*>(config);
    }

    auto ncpSection = getTypedSection<NcpSection>("ncp-cfg");
    if (ncpSection) {
        // set the socket port to the provided value
        *ncp_socket_port = ncpSection->getSocketPort();
    }
}

void CfgParser::applyBrSettings(struct uart_cfg **u_cfg_ptr, ti_br_config_t *ti_br_config, uint16_t *ncp_socket_port) {
    applySettings(u_cfg_ptr, ncp_socket_port);

    auto dhcpSection = getTypedSection<DhcpSection>("dhcp-cfg");
    if (dhcpSection) {
        // update the relevant settings in ti_br_config
        ti_br_config->use_external_dhcp_server = dhcpSection->getExternalServerEnabled();

        const in6_addr& dhcp_ipv6_addr = dhcpSection->getExternalServerAddress();
        std::copy(std::begin(dhcp_ipv6_addr.s6_addr), std::end(dhcp_ipv6_addr.s6_addr), ti_br_config->external_dhcp_server_addr);
    }

    auto radiusSection = getTypedSection<RadiusSection>("radius-cfg");
    if (radiusSection) {
        // update the relevant settings in ti_br_config
        ti_br_config->use_external_radius_server = radiusSection->getExternalServerEnabled();
        
        const in6_addr& radius_ipv6_addr = radiusSection->getExternalServerAddress();
        std::copy(std::begin(radius_ipv6_addr.s6_addr), std::end(radius_ipv6_addr.s6_addr), ti_br_config->external_radius_server_addr);
        
        const std::string& radius_shared_secret = radiusSection->getSharedSecret();
        std::copy(std::begin(radius_shared_secret), std::end(radius_shared_secret), ti_br_config->external_radius_server_shared_secret);
        ti_br_config->external_radius_server_shared_secret_length = radius_shared_secret.length();
    }
}