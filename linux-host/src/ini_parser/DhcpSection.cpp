#include "DhcpSection.hpp"

DhcpSection::DhcpSection(const std::string& name) : IniSection(name) {
    externalServerEnabled_ = false;
    externalServerAddress_ = in6addr_any;
}

DhcpSection::~DhcpSection() {}

bool DhcpSection::validate() const {
    // If IP address isn't parsed properly, then an exception will be thrown during the reading. If we get here, then everything's okay.
    return true;
}

bool DhcpSection::parseItem(const std::string& key, const std::string& value) {
    // Store in the base class map
    IniSection::parseItem(key, value);

    if (key == "external-server-enabled") {
        externalServerEnabled_ = getBoolValue(key);
    } else if (key == "external-server-address") {
        externalServerAddress_ = getIPv6AddressBytesValue(key);
    }
    return true;
}

bool DhcpSection::getExternalServerEnabled() const {
    return externalServerEnabled_;
}

in6_addr DhcpSection::getExternalServerAddress() const {
    return externalServerAddress_;
}