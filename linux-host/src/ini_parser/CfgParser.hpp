#ifndef CFG_PARSER_HPP
#define CFG_PARSER_HPP

#include <string>
#include <memory>
#include "IniFile.hpp"
#include "UartSection.hpp"
#include "SpiSection.hpp"
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
    // If spi_cfg_ptr is given and [spi-cfg] is present, *spi_cfg_ptr is set and *u_cfg_ptr is left untouched
    void applySettings(struct uart_cfg **u_cfg_ptr, uint16_t *ncp_socket_port, struct spi_cfg **spi_cfg_ptr = nullptr);
    // Applies general + BR-specific settings from the config file
    void applyBrSettings(struct uart_cfg **u_cfg_ptr, ti_br_config_t *ti_br_config, uint16_t *ncp_socket_port, struct spi_cfg **spi_cfg_ptr = nullptr);
    
    // Get specific section type
    template <typename T> std::shared_ptr<T> getTypedSection(const std::string& name) const;
};

#endif // CFG_PARSER_HPP
