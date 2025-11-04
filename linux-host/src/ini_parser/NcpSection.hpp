#ifndef NCP_SECTION_HPP
#define NCP_SECTION_HPP

#include "IniSection.hpp"
#include "ws_config.h"

class NcpSection : public IniSection {
public:
    NcpSection(const std::string& name);
    ~NcpSection();

    bool parseItem(const std::string& key, const std::string& value) override;
    bool validate() const override;

    // Getters for NCP configuration
    uint16_t getSocketPort() const;

private:
    uint16_t socketPort_;
};

#endif // NCP_SECTION_HPP