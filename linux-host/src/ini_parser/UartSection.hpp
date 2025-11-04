#ifndef UART_SECTION_HPP
#define UART_SECTION_HPP

#include "IniSection.hpp"
#include "stream_uart.h"

class UartSection : public IniSection {
private:
    struct uart_cfg config;
    
public:
    UartSection(const std::string& name);
    ~UartSection();
    
    bool parseItem(const std::string& key, const std::string& value) override;
    bool validate() const override;
    
    struct uart_cfg* getConfig();
};

#endif // UART_SECTION_HPP
