#include "RadiusSection.hpp"

#define TRACE_GROUP "inir"

RadiusSection::RadiusSection(const std::string& name) : IniSection(name) {
    externalServerEnabled_ = false;
    externalServerAddress_ = in6addr_any;
    sharedSecret_ = "";
}

RadiusSection::~RadiusSection() {}

bool RadiusSection::validate() const {
    // If external server is not enabled, then everythings ok. Otherwise make sure a secret is set
    if (!externalServerEnabled_) {
        return true;
    }
    else if (sharedSecret_.empty()){
        return false;
    }
    else
    {
        if (sharedSecret_.length() > EXTERNAL_RADIUS_SERVER_MAX_SHARED_SECRET_LENGTH) {
            tr_err("Shared secret set in the radius-cfg section is too long! Max length: %d", EXTERNAL_RADIUS_SERVER_MAX_SHARED_SECRET_LENGTH);
            throw std::runtime_error("Shared secret set in the radius-cfg section is too long! Max length: " + std::to_string(EXTERNAL_RADIUS_SERVER_MAX_SHARED_SECRET_LENGTH));
        }
        return true;
    }
}

bool RadiusSection::parseItem(const std::string& key, const std::string& value) {
    // Store in the base class map
    IniSection::parseItem(key, value);

    if (key == "external-server-enabled") {
        externalServerEnabled_ = getBoolValue(key);
    } else if (key == "external-server-address") {
        externalServerAddress_ = getIPv6AddressBytesValue(key);
    } else if (key == "shared-secret") {
        sharedSecret_ = value;
    }
    return true;
}

bool RadiusSection::getExternalServerEnabled() const {
    return externalServerEnabled_;
}

in6_addr RadiusSection::getExternalServerAddress() const {
    return externalServerAddress_;
}

std::string RadiusSection::getSharedSecret() const {
    return sharedSecret_;
}