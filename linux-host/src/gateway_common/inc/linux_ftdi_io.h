/******************************************************************************
 @file linux_ftdi_io.h

 @brief libftdi1 implementation of struct mpsse_io for an FT232H.
        Compiled only when ENABLE_FTDI_SPI is defined (libftdi1 available).
 *****************************************************************************/
#if !defined(LINUX_FTDI_IO_H)
#define LINUX_FTDI_IO_H

#include "mpsse_spi.h"

#ifdef __cplusplus
extern "C" {
#endif

struct ftdi_io;

/*! Opens the FT232H (vid/pid, optional serial), resets it, sets a 1 ms latency timer and
 *  switches it to MPSSE mode. Returns NULL on failure (reason is traced). */
struct ftdi_io *ftdi_io_open(int vid, int pid, const char *serial);
void ftdi_io_close(struct ftdi_io *io);

/*! The mpsse_io callbacks; pass the struct ftdi_io * as the io ctx */
extern const struct mpsse_io ftdi_io_ops;

#ifdef __cplusplus
}
#endif
#endif
