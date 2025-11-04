#include "UartSection.hpp"
#include <cstring>
#include <cstdlib>

UartSection::UartSection(const std::string& name) : IniSection(name) {
    // Initialize the uart_cfg structure
    memset(&config, 0, sizeof(config));
    config.open_flags = STREAM_UART_FLAG_default;
}

UartSection::~UartSection() {
    // Free any allocated memory
    if (config.devname) {
        free((void*)config.devname);
        config.devname = nullptr;
    }
}

bool UartSection::parseItem(const std::string& key, const std::string& value) {
    // Store in the base class map
    IniSection::parseItem(key, value);
    
    // Process for the uart_cfg structure
    if (key == "devname") {
        if (config.devname) {
            free((void*)config.devname);
        }
        config.devname = strdup(value.c_str());
    } else if (key == "baudrate") {
        try {
            config.baudrate = std::stoi(value);
        } catch (...) {
            return false;
        }
    } else if (key == "flag") {
        if (value == "default") {
            config.open_flags = STREAM_UART_FLAG_default;
        } else if (value == "rd_thread") {
            config.open_flags |= STREAM_UART_FLAG_rd_thread;
        } else if (value == "hw_handshake") {
            config.open_flags |= STREAM_UART_FLAG_hw_handshake;
        } else if (value == "not-rd_thread") {
            config.open_flags &= ~STREAM_UART_FLAG_rd_thread;
        } else if (value == "not-hw_handshake") {
            config.open_flags &= ~STREAM_UART_FLAG_hw_handshake;
        } else {
            return false;
        }
    }
    
    return true;
}

bool UartSection::validate() const {
    // Check that required fields are set
    return config.devname != nullptr && config.baudrate > 0;
}

struct uart_cfg* UartSection::getConfig() {
    return &config;
}
