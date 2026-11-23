# BeagleBone Black to CC1407 SPI wiring (Early Access)

> **Early access only. Not for production use.** CC1407 support is still in development and is being improved continuously. Existing CC13xx support is unaffected.

This is part of step 3 in the main [README](README.md). Wire the boards here, then continue with [BBB.md](BBB.md).

Use the **P9 header** on BeagleBone Black and the IC DIO signals listed below. BBB is the SPI master; the IC is the SPI slave.

## Connections

| Signal | BBB P9 header pin | IC signal | Direction |
| --- | --- | --- | --- |
| Interrupt, active low | **P9_12** | **DIO_1 (SPI_INT)** | IC → BBB |
| SPI clock | **P9_22** | **DIO_8 (SPI_CLK)** | BBB → IC |
| Chip select, active low | **P9_17 (CS_N)** | **DIO_9** | BBB → IC |
| MOSI / PICO | **P9_18** | **DIO_11 (PICO)** | BBB → IC |
| MISO / POCI | **P9_21** | **DIO_10 (POCI)** | IC → BBB |
| Common ground | **P9_1 or P9_2** | **Board GND** | Common reference |

**The remaining SPI data pin is P9_21: connect it to DIO_10.** “P18” here means P9_18, not P8_18.

```text
BeagleBone Black                  CC1407 board

P9_12  INT input  <--------------- DIO_1  INT_n
P9_22  SCLK       ---------------> DIO_8  SCLK
P9_17  CS0        ---------------> DIO_9  nCS
P9_18  MOSI       ---------------> DIO_11 PICO
P9_21  MISO       <--------------- DIO_10 POCI
P9_1/2 GND       ---------------- Board GND
```

## Before powering on

- Confirm the actual IC DIO locations on your board schematic. DIO numbers are not physical board-header pin numbers.
- Verify compatible I/O voltages. BBB digital pins use 3.3 V and are **not 5 V tolerant**.
- Connect ground and use short signal wires. Do not drive either board's I/O while it is unpowered.
- Power the radio board through its approved supply. This table does not prescribe a power-rail connection between the boards.
- RESET_N is optional and is not included in this wiring. Use the board's verified reset method; do not guess a DIO for reset.

## Required configuration

- SPI0 pins must be configured for SPI, and P9_12 for GPIO input.
- SPI mode **0**, eight-bit words, MSB first, active-low CS.
- Start at **1 MHz**; the current host limit is **4 MHz**.
- This data-pin mapping assumes default McSPI **D0 input / D1 output**. If the device tree sets `ti,pindir-d0-out-d1-in`, MOSI and MISO roles reverse. Verify the live configuration before wiring.
- P9_12 is GPIO1_28. On the traditional BBB sysfs mapping it is global GPIO **60**; confirm the actual mapping before setting `int-gpio = 60`.
- Confirm which `/dev/spidevB.C` corresponds to SPI0/CS0 on your image; do not rely solely on the node's name.

See [BBB.md](BBB.md) for build and run steps. Correct wiring alone does not establish chip-ready timing or reliable SPI operation.
