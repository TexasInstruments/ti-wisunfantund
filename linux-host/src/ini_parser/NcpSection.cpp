#include "NcpSection.hpp"

#define TRACE_GROUP "test"

NcpSection::NcpSection(const std::string& name) : IniSection(name) {
    socketPort_ = 4903;
}

NcpSection::~NcpSection() {}

bool NcpSection::validate() const {
    /* Any port other than 0 should be valid. Some ports are reserved for Linux,
     * but let's assume if a user tries to use one of those they know what they're doing.
     */
    // return socketPort_ != 0;
    return true;
}

bool NcpSection::parseItem(const std::string& key, const std::string& value) {
    // Store in the base class map
    IniSection::parseItem(key, value);

    if (key == "port") {
        socketPort_ = getIntValue(key);
    }
    return true;
}

uint16_t NcpSection::getSocketPort() const {
    return socketPort_;
}