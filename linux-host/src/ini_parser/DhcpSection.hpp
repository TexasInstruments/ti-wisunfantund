#ifndef DHCP_SECTION_HPP
#define DHCP_SECTION_HPP

#include "IniSection.hpp"
#include "ws_config.h"

class DhcpSection : public IniSection {
public:
    DhcpSection(const std::string& name);
    ~DhcpSection();

    bool parseItem(const std::string& key, const std::string& value) override;
    bool validate() const override;

    // Getters for DHCP configuration
    bool getExternalServerEnabled() const;
    in6_addr getExternalServerAddress() const;

private:
    bool externalServerEnabled_;
    in6_addr externalServerAddress_;
};

#endif // DHCP_SECTION_HPP