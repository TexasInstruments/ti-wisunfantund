#include "IniSection.hpp"
#include <algorithm>
#include <cctype>
#include <cstdlib>

#define TRACE_GROUP "inis"

IniSection::IniSection(const std::string& name) : sectionName(name) {}

IniSection::~IniSection() {}

bool IniSection::parseItem(const std::string& key, const std::string& value) {
    tr_info("Setting item: %s to value: %s", key.c_str(), value.c_str());
    values[key] = value;
    return true;
}

bool IniSection::validate() const {
    return true;
}

std::string IniSection::getName() const {
    return sectionName;
}

void IniSection::printAllValues() const {
    tr_info("Section: %s", sectionName.c_str());
    for (const auto& pair : values) {
        tr_info("%s = %s", pair.first.c_str(), pair.second.c_str());
    }
}

std::string IniSection::getValue(const std::string& key, const std::string& defaultValue) const {
    auto it = values.find(key);
    if (it != values.end()) {
        return it->second;
    }
    return defaultValue;
}

int IniSection::getIntValue(const std::string& key, int defaultValue) const {
    auto it = values.find(key);
    if (it != values.end()) {
        try {
            return std::stoi(it->second);
        } catch (...) {
            return defaultValue;
        }
    }
    return defaultValue;
}

bool IniSection::getBoolValue(const std::string& key, bool defaultValue) const {
    auto it = values.find(key);
    if (it != values.end()) {
        std::string value = it->second;
        std::transform(value.begin(), value.end(), value.begin(), 
                      [](unsigned char c){ return std::tolower(c); });
        
        if (value == "true" || value == "yes" || value == "1" || value == "y") {
            return true;
        } else if (value == "false" || value == "no" || value == "0" || value == "n") {
            return false;
        }
    }
    return defaultValue;
}

in6_addr IniSection::getIPv6AddressBytesValue(const std::string& key) const {
    struct in6_addr in6;
    auto it = values.find(key);
    if (it != values.end()) {
        std::string address = it->second;
        if (inet_pton(AF_INET6, address.c_str(), &in6) == 1) {
            return in6;
        } else {
            throw std::runtime_error("Tried to parse invalid IPv6 address during config section parsing: " + address);
        }
    }
    else
    {
        throw std::runtime_error("No address found in " + getName() + " section when looking for key: " + key); 
    }
}