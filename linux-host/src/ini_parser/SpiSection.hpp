#ifndef SPI_SECTION_HPP
#define SPI_SECTION_HPP

#include "IniSection.hpp"
#include "stream_spi.h"

/*
 * [spi-cfg] section: selects the TRX SPI link to the RCP instead of the UART.
 *
 *   backend    = spidev | ftdi    ; default spidev
 *   speed      = 4000000          ; Hz, 4 MHz max
 * backend = spidev (BeagleBone Black, Linux spidev + sysfs GPIO):
 *   devname    = /dev/spidev0.0
 *   int-gpio   = 60               ; Linux GPIO number of the TRX INT line
 *   reset-gpio = 49               ; optional, omit if RESET is not wired
 * backend = ftdi (FT232H USB adapter, MPSSE):
 *   ftdi-vid = 0x0403, ftdi-pid = 0x6014, ftdi-serial = <optional>
 *   ftdi-int-pin = 4              ; ADBUS bit 4..7 wired to TRX INT
 *   ftdi-reset-pin = 5            ; optional ADBUS bit 4..7 wired to TRX RESET
 *   ftdi-wait-poci = false        ; wait for POCI low after CS falls
 * Diagnostics (both backends):
 *   log-level      = info         ; error | warn | info | debug | trace (or 0..4)
 *   stats-interval = 60           ; seconds between statistics lines, 0 = only on close
 */
class SpiSection : public IniSection {
private:
    struct spi_cfg config;

public:
    SpiSection(const std::string& name);
    ~SpiSection();

    bool parseItem(const std::string& key, const std::string& value) override;
    bool validate() const override;

    /* true if the section appeared in the ini file (any key parsed) */
    bool isConfigured() const;

    struct spi_cfg* getConfig();

private:
    bool configured_;
    bool parseError_;
};

#endif // SPI_SECTION_HPP
