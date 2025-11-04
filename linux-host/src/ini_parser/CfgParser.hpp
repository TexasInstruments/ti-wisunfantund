#ifndef CFG_PARSER_HPP
#define CFG_PARSER_HPP

#include <string>
#include <memory>
#include "IniFile.hpp"
#include "UartSection.hpp"
#include "NcpSection.hpp"
#include "DhcpSection.hpp"
#include "RadiusSection.hpp"

class CfgParser {
private:
    std::unique_ptr<IniFile> iniFile;
    
public:
    CfgParser();
    ~CfgParser();
    
    // Reads in all settings in the config file
    bool parse(int argc, char** argv);
    // Applies the general settings from the config file
    void applySettings(struct uart_cfg **u_cfg_ptr, uint16_t *ncp_socket_port);
    // Applies general + BR-specific settings from the config file
    void applyBrSettings(struct uart_cfg **u_cfg_ptr, ti_br_config_t *ti_br_config, uint16_t *ncp_socket_port);
    
    // Get specific section type
    template <typename T> std::shared_ptr<T> getTypedSection(const std::string& name) const;
};

#endif // CFG_PARSER_HPP
