#ifndef INI_SECTION_HPP
#define INI_SECTION_HPP

#include <string>
#include <map>
#include <array>
#include <arpa/inet.h>
#include <stdexcept>

extern "C" {
#include "ns_trace.h"
}

class IniSection {
protected:
    std::string sectionName;
    std::map<std::string, std::string> values;
    
public:
    IniSection(const std::string& name);
    virtual ~IniSection();
    
    virtual bool parseItem(const std::string& key, const std::string& value);
    virtual bool validate() const;
    
    std::string getName() const;
    std::string getValue(const std::string& key, const std::string& defaultValue = "") const;
    void printAllValues() const;
    int getIntValue(const std::string& key, int defaultValue = 0) const;
    bool getBoolValue(const std::string& key, bool defaultValue = false) const;
    in6_addr getIPv6AddressBytesValue(const std::string& address) const;
};

#endif // INI_SECTION_HPP
