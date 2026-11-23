/******************************************************************************
 @file stream_spi.h

 @brief Header for streams that are a TRX SPI link to a Wi-SUN RCP.

 This is the SPI counterpart of stream_uart.h. A spi stream behaves like the
 uart stream (it carries the MT byte stream), so everything above the STREAM_
 API (mt_msg, api_mac, nanostack glue) is unchanged.
 *****************************************************************************/
#if !defined(STREAM_SPI_H)
#define STREAM_SPI_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define SPI_CFG_DEFAULT_DEVNAME   "/dev/spidev0.0"
#define SPI_CFG_DEFAULT_SPEED_HZ  4000000   /* TRX maximum */
#define SPI_CFG_DEFAULT_INT_GPIO  60        /* BeagleBone Black P9_12 = GPIO1_28 */
#define SPI_CFG_GPIO_NONE         (-1)

enum spi_backend {
    SPI_BACKEND_SPIDEV = 0,   /* Linux spidev + sysfs GPIO (BeagleBone Black) */
    SPI_BACKEND_FTDI   = 1    /* FT232H in MPSSE mode through libftdi (USB) */
};

#define SPI_CFG_DEFAULT_FTDI_VID  0x0403
#define SPI_CFG_DEFAULT_FTDI_PID  0x6014   /* FT232H */
#define SPI_CFG_DEFAULT_FTDI_INT_PIN 4     /* ADBUS4 */

struct spi_cfg {
    /*! which bus driver to use */
    enum spi_backend backend;
    /*! spidev node, linux example: "/dev/spidev0.0" */
    const char *devname;
    /*! SPI clock, 4000000 max for the TRX */
    uint32_t speed_hz;
    /*! Linux (sysfs) GPIO number of the TRX INT line (active low) */
    int int_gpio;
    /*! Linux (sysfs) GPIO number of the TRX RESET line, or SPI_CFG_GPIO_NONE */
    int reset_gpio;

    /* ---- backend = ftdi only ---- */
    /*! USB vendor / product id of the FT232H */
    int ftdi_vid;
    int ftdi_pid;
    /*! USB serial number to select one of several adapters, or NULL for the first */
    const char *ftdi_serial;
    /*! ADBUS bit (4..7) wired to the TRX INT line (active low) */
    int ftdi_int_pin;
    /*! ADBUS bit (4..7) wired to the TRX RESET line, or SPI_CFG_GPIO_NONE */
    int ftdi_reset_pin;
    /*! wait for POCI low after CS falls (chip-ready handshake of loki-trx-host) */
    bool ftdi_wait_poci;

    /* ---- diagnostics (both backends) ---- */
    /*! 0 error, 1 warn, 2 info (default), 3 debug, 4 trace. See trx_spi_log.h */
    int log_level;
    /*! print a statistics line every N seconds at info level, 0 = only on close */
    int stats_interval_s;
};
#define SPI_CFG_DEFAULT_LOG_LEVEL   2
#define SPI_CFG_DEFAULT_STATS_S     60

/*! Create a stream on the TRX SPI link. Returns 0 on failure. */
intptr_t STREAM_createSpi(const struct spi_cfg *pCFG);

/*! true if the stream is a spi stream */
bool STREAM_isSpi(intptr_t h);

#ifdef __cplusplus
}
#endif
#endif /* STREAM_SPI_H */
