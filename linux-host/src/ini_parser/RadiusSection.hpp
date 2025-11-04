#ifndef RADIUS_SECTION_HPP
#define RADIUS_SECTION_HPP

#include "IniSection.hpp"
#include "ws_config.h"

class RadiusSection : public IniSection {
public:
    RadiusSection(const std::string& name);
    ~RadiusSection();

    bool parseItem(const std::string& key, const std::string& value) override;
    bool validate() const override;

    // Getters for RADIUS configuration
    bool getExternalServerEnabled() const;
    in6_addr getExternalServerAddress() const;
    std::string getSharedSecret() const;

private:
    bool externalServerEnabled_;
    in6_addr externalServerAddress_;
    std::string sharedSecret_;
};

#endif // RADIUS_SECTION_HPP