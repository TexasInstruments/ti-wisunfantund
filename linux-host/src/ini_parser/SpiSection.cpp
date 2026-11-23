#include "SpiSection.hpp"
#include <cstring>
#include <cstdlib>
#include "ns_trace.h"

#define TRACE_GROUP "spic"

SpiSection::SpiSection(const std::string& name) : IniSection(name), configured_(false), parseError_(false) {
    memset(&config, 0, sizeof(config));
    config.devname = strdup(SPI_CFG_DEFAULT_DEVNAME);
    config.speed_hz = SPI_CFG_DEFAULT_SPEED_HZ;
    config.int_gpio = SPI_CFG_DEFAULT_INT_GPIO;
    config.reset_gpio = SPI_CFG_GPIO_NONE;
    config.backend = SPI_BACKEND_SPIDEV;
    config.ftdi_vid = SPI_CFG_DEFAULT_FTDI_VID;
    config.ftdi_pid = SPI_CFG_DEFAULT_FTDI_PID;
    config.ftdi_serial = nullptr;
    config.ftdi_int_pin = SPI_CFG_DEFAULT_FTDI_INT_PIN;
    config.ftdi_reset_pin = SPI_CFG_GPIO_NONE;
    config.ftdi_wait_poci = false;
    config.log_level = SPI_CFG_DEFAULT_LOG_LEVEL;
    config.stats_interval_s = SPI_CFG_DEFAULT_STATS_S;
}

SpiSection::~SpiSection() {
    if (config.devname) {
        free((void*)config.devname);
        config.devname = nullptr;
    }
    if (config.ftdi_serial) {
        free((void*)config.ftdi_serial);
        config.ftdi_serial = nullptr;
    }
}

bool SpiSection::parseItem(const std::string& key, const std::string& value) {
    IniSection::parseItem(key, value);
    configured_ = true;

    // IniFile::parse() ignores the return value of parseItem(), so a bad value is
    // remembered here and makes validate() fail instead of silently using a default.
    struct ErrorLatch {
        bool& flag;
        bool ok = false;
        ~ErrorLatch() { if (!ok) flag = true; }
    } latch{parseError_};

    try {
        if (key == "devname") {
            if (config.devname) {
                free((void*)config.devname);
            }
            config.devname = strdup(value.c_str());
        } else if (key == "speed") {
            config.speed_hz = (uint32_t)std::stoul(value);
        } else if (key == "int-gpio") {
            config.int_gpio = std::stoi(value);
        } else if (key == "reset-gpio") {
            config.reset_gpio = std::stoi(value);
        } else if (key == "backend") {
            if (value == "spidev") {
                config.backend = SPI_BACKEND_SPIDEV;
            } else if (value == "ftdi") {
                config.backend = SPI_BACKEND_FTDI;
            } else {
                tr_err("[spi-cfg] backend='%s' is not valid (use spidev or ftdi)", value.c_str());
                return false;
            }
        } else if (key == "ftdi-vid") {
            config.ftdi_vid = (int)std::stoul(value, nullptr, 0);   // accepts 0x0403
        } else if (key == "ftdi-pid") {
            config.ftdi_pid = (int)std::stoul(value, nullptr, 0);
        } else if (key == "ftdi-serial") {
            if (config.ftdi_serial) {
                free((void*)config.ftdi_serial);
            }
            config.ftdi_serial = strdup(value.c_str());
        } else if (key == "ftdi-int-pin") {
            config.ftdi_int_pin = std::stoi(value);
        } else if (key == "ftdi-reset-pin") {
            config.ftdi_reset_pin = std::stoi(value);
        } else if (key == "log-level") {
            if (value == "error") { config.log_level = 0; }
            else if (value == "warn") { config.log_level = 1; }
            else if (value == "info") { config.log_level = 2; }
            else if (value == "debug") { config.log_level = 3; }
            else if (value == "trace") { config.log_level = 4; }
            else { config.log_level = std::stoi(value); }
        } else if (key == "stats-interval") {
            config.stats_interval_s = std::stoi(value);
        } else if (key == "ftdi-wait-poci") {
            config.ftdi_wait_poci = (value == "true" || value == "1" || value == "yes");
        } else {
            tr_err("[spi-cfg] unknown key '%s' (value '%s') ignored: check spelling against docs/SPI_FT232H_BACKEND.md",
                   key.c_str(), value.c_str());
            return false;
        }
    } catch (...) {
        tr_err("[spi-cfg] cannot parse %s = '%s' (not a number?)", key.c_str(), value.c_str());
        return false;
    }
    latch.ok = true;
    return true;
}

bool SpiSection::validate() const {
    bool ok = true;

    if (!configured_) {
        /* Section absent: the UART configuration is used */
        return true;
    }
    if (parseError_) {
        tr_err("[spi-cfg] rejected: an earlier line could not be parsed (see the messages above)");
        return false;
    }
    if (config.speed_hz == 0 || config.speed_hz > 4000000U) {
        tr_err("[spi-cfg] speed=%u Hz is outside 1..4000000 (the TRX SPI slave limit)", (unsigned)config.speed_hz);
        ok = false;
    }
    if (config.log_level < 0 || config.log_level > 4) {
        tr_err("[spi-cfg] log-level=%d is outside 0..4 (error|warn|info|debug|trace)", config.log_level);
        ok = false;
    }
    if (config.stats_interval_s < 0) {
        tr_err("[spi-cfg] stats-interval=%d must be >= 0", config.stats_interval_s);
        ok = false;
    }
    if (config.backend == SPI_BACKEND_FTDI) {
        if (config.ftdi_int_pin < 4 || config.ftdi_int_pin > 7) {
            tr_err("[spi-cfg] ftdi-int-pin=%d must be 4..7 (AD4..AD7; AD0..AD3 are SCLK/MOSI/MISO/CS)",
                   config.ftdi_int_pin);
            ok = false;
        }
        if (config.ftdi_reset_pin != SPI_CFG_GPIO_NONE &&
            (config.ftdi_reset_pin < 4 || config.ftdi_reset_pin > 7 || config.ftdi_reset_pin == config.ftdi_int_pin)) {
            tr_err("[spi-cfg] ftdi-reset-pin=%d must be 4..7 and different from ftdi-int-pin=%d",
                   config.ftdi_reset_pin, config.ftdi_int_pin);
            ok = false;
        }
        if (config.ftdi_vid <= 0 || config.ftdi_pid <= 0) {
            tr_err("[spi-cfg] ftdi-vid=0x%04x ftdi-pid=0x%04x must both be non-zero (FT232H is 0x0403:0x6014)",
                   config.ftdi_vid, config.ftdi_pid);
            ok = false;
        }
        return ok;
    }
    if (config.devname == nullptr) {
        tr_err("[spi-cfg] backend=spidev needs devname (for example /dev/spidev0.0)");
        ok = false;
    }
    if (config.int_gpio < 0) {
        tr_err("[spi-cfg] backend=spidev needs int-gpio (the sysfs GPIO number wired to the TRX INT pin)");
        ok = false;
    }
    return ok;
}

bool SpiSection::isConfigured() const {
    return configured_;
}

struct spi_cfg* SpiSection::getConfig() {
    return &config;
}
