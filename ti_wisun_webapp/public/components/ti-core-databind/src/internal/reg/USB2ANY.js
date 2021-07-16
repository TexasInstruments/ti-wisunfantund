var gc = gc || {};

(function()
{
    // packet types
    var COMMAND_PACKET = 1;
    var REPLY_PACKET = 2;
    var ERROR_PACKET = 3;
    var PAYLOAD_PACKET = 4;
    var INTERRUPT_PACKET = 5;

    // packet flags
    var FLAG_MOREDATA = 1;

    var PACKET_IDENTIFIER = 'T'.charCodeAt(0);

    var PACKET_ID = 0;
    var PACKET_PEC = 1;
    var PACKET_PAYLOAD_LEN = 2;
    var PACKET_TYPE = 3;
    var PACKET_FLAGS = 4;
    var PACKET_SEQ_NUM = 5;
    var PACKET_STATUS = 6;
    var PACKET_COMMAND = 7;
    var PACKET_PAYLOAD = 8;

    var MAX_PACKET_SIZE = 62; // size, in bytes, of a USB packet
    var PACKET_HEADER_SIZE = PACKET_PAYLOAD;
    var MAX_PAYLOAD = MAX_PACKET_SIZE - PACKET_HEADER_SIZE;

    var Command =
    {
        Cmd_LoopPacket : 0, // 0x00
        Cmd_I2C_Control : 1, // 0x01
        Cmd_I2C_Write : 2, // 0x02
        Cmd_I2C_Read : 3, // 0x03
        Cmd_I2CRead_WithAddress : 4, // 0x04
        Cmd_GPIO_Write_Control : 5, // 0x05
        Cmd_GPIO_Write_States : 6, // 0x06
        Cmd_GPIO_Read_States : 7, // 0x07
        Cmd_SPI_Control : 8, // 0x08
        Cmd_SPI_WriteAndRead : 9, // 0x09
        Cmd_FirmwareVersion_Read : 10, // 0x0A
        Cmd_MSP430_WordWrite : 11, // 0x0B
        Cmd_MSP430_WordRead : 12, // 0x0C
        Cmd_MSP430_ByteWrite : 13, // 0x0D
        Cmd_MSP430_ByteRead : 14, // 0x0E
        Cmd_UART_Control : 15, // 0x0F
        Cmd_MSP430_MemoryWrite : 16, // 0x10
        Cmd_MSP430_MemoryRead : 17, // 0x11
        Cmd_UART_Write : 18, // 0x12
        Cmd_UART_SetMode : 19, // 0x13
        Cmd_UART_Read : 20, // 0x14
        Cmd_Local_I2C_Write : 21, // 0x15
        Cmd_PWM_Write_Control : 22, // 0x16
        Cmd_Power_WriteControl : 23, // 0x17
        Cmd_Power_ReadStatus : 24, // 0x18
        Cmd_ADC_Control : 25, // 0x19
        Cmd_ADC_ConvertAndRead : 26, // 0x1A
        Cmd_LED_Control : 27, // 0x1B
        Cmd_Clock_Control : 28, // 0x1C
        Cmd_FEC_Control : 29, // 0x1D
        Cmd_FEC_CountAndRead : 30, // 0x1E
        Cmd_Interrupt_Control : 31, // 0x1F
        Cmd_Interrupt_Received : 32, // 0x20
        Cmd_EasyScale_Control : 33, // 0x21
        Cmd_EasyScale_Write : 34, // 0x22
        Cmd_EasyScale_Read : 35, // 0x23
        Cmd_EasyScale_ACK_Received : 36, // 0x24
        Cmd_GPIO_SetPort : 37, // 0x25
        Cmd_GPIO_WritePort : 38, // 0x26
        Cmd_GPIO_ReadPort : 39, // 0x27
        Cmd_Reserved_40 : 40, // 0x28 Reserved for end-user command **
        Cmd_Reserved_41 : 41, // 0x29 Reserved for end-user command **
        Cmd_Reserved_42 : 42, // 0x2A Reserved for end-user command **
        Cmd_Reserved_43 : 43, // 0x2B Reserved for end-user command **
        Cmd_Reserved_44 : 44, // 0x2C Reserved for end-user command **
        Cmd_Reserved_45 : 45, // 0x2D Reserved for end-user command **
        Cmd_Reserved_46 : 46, // 0x2E Reserved for end-user command **
        Cmd_Reserved_47 : 47, // 0x2F Reserved for end-user command **
        Cmd_Reserved_48 : 48, // 0x30 Reserved for end-user command **
        Cmd_Reserved_49 : 49, // 0x31 Reserved for end-user command **
        Cmd_SMBUS_SendByte : 50, // 0x32
        Cmd_SMBUS_WriteByte : 51, // 0x33
        Cmd_SMBUS_WriteWord : 52, // 0x34
        Cmd_SMBUS_WriteBlock : 53, // 0x35
        Cmd_SMBUS_ReceiveByte : 54, // 0x36
        Cmd_SMBUS_ReadByte : 55, // 0x37
        Cmd_SMBUS_ReadWord : 56, // 0x38
        Cmd_SMBUS_ReadBlock : 57, // 0x39
        Cmd_SMBUS_ProcessCall : 58, // 0x3A
        Cmd_SMBUS_BWBRProcessCall : 59, // 0x3B
        Cmd_SMBUS_Control : 60, // 0x3C
        Cmd_SMBUS_GetEchoBuffer : 61, // 0x3D
        Cmd_RFFE_RegZeroWrite : 62, // 0x3E
        Cmd_RFFE_RegWrite : 63, // 0x3F
        Cmd_RFFE_ExtRegWrite : 64, // 0x40
        Cmd_RFFE_ExtRegWriteLong : 65, // 0x41
        Cmd_RFFE_RegRead : 66, // 0x42
        Cmd_RFFE_ExtRegRead : 67, // 0x43
        Cmd_RFFE_ExtRegReadLong : 68, // 0x44
        Cmd_OneWire_SetMode : 69, // 0x45
        Cmd_OneWire_PulseSetup : 70, // 0x46
        Cmd_OneWire_PulseWrite : 71, // 0x47
        Cmd_OneWire_SetState : 72, // 0x48
        Cmd_Reserved_73 : 73, // 0x49 **
        Cmd_Reserved_74 : 74, // 0x4A **
        Cmd_Reserved_75 : 75, // 0x4B **
        Cmd_Reserved_76 : 76, // 0x4C **
        Cmd_Reserved_77 : 77, // 0x4D **
        Cmd_Reserved_78 : 78, // 0x4E **
        Cmd_Reserved_79 : 79, // 0x4F **
        Cmd_Reserved_80 : 80, // 0x50 **
        Cmd_Reserved_81 : 81, // 0x51 **
        Cmd_Reserved_82 : 82, // 0x52 **
        Cmd_Reserved_83 : 83, // 0x53 **
        Cmd_Packet : 84, // 0x54
        Cmd_GPIO_SetCustomPort : 85, // 0x55
        Cmd_GPIO_WriteCustomPort : 86, // 0x56
        Cmd_GPIO_ReadCustomPort : 87, // 0x57
        Cmd_GPIO_WritePulse : 88, // 0x58
        Cmd_Reserved_89 : 89, // 0x59 **
        Cmd_Reserved_90 : 90, // 0x5A **
        Cmd_Reserved_91 : 91, // 0x5B **
        Cmd_Reserved_92 : 92, // 0x5C **
        Cmd_Reserved_93 : 93, // 0x5D **
        Cmd_Reserved_94 : 94, // 0x5E **
        Cmd_Reserved_95 : 95, // 0x5F **
        Cmd_I2C_BlkWriteBlkRead : 96, // 0x60
        Cmd_InvokeBSL : 97, // 0x61
        Cmd_FirmwareDebugMode : 98, // 0x62
        Cmd_Restart : 99, // 0x63
        Cmd_I2C_ReadWithAddress : 100, // 0x64
        Cmd_I2C_ReadInternal : 101, // 0x65
        Cmd_I2C_WriteInternal : 102, // 0x66
        Cmd_GetErrorList : 103, // 0x67
        Cmd_LED_SetState : 104, // 0x68
        Cmd_Power_SetVoltageRef : 105, // 0x69
        Cmd_Status_GetControllerType : 106, // 0x6A
        Cmd_Power_Enable : 107, // 0x6B
        Cmd_ADC_Enable : 108, // 0x6C
        Cmd_ADC_Acquire : 109, // 0x6D
        Cmd_ADC_GetData : 110, // 0x6E
        Cmd_ADC_GetStatus : 111, // 0x6F
        Cmd_ADC_SetReference : 112, // 0x70
        Cmd_Status_GetBoardRevision : 113, // 0x71
        Cmd_Status_EVMDetect : 114, // 0x72
        Cmd_ADC_AcquireTriggered : 115, // 0x73
        Cmd_Power_Notify : 116, // 0x74
        Cmd_Digital_Capture : 117, // 0x75
        Cmd_Digital_GetData : 118, // 0x76
        Cmd_Digital_GetStatus : 119, // 0x77
        Cmd_EasyScale_WriteAndRead : 120, // 0x78
        Cmd_DisplayScale_Set : 121, // 0x79
        Cmd_DisplayScale_WriteReg : 122, // 0x7A
        Cmd_DisplayScale_ReadReg : 123, // 0x7B
        Cmd_DisplayScale_WriteAndRead : 124,// 0x7C
        Cmd_Reserved_125 : 125, // 0x7D **
        Cmd_Reserved_126 : 126, // 0x7E **
        Cmd_Invalid : 127, // 0x7F
        Cmd_Stream_Start : 128, // 0x80
        Cmd_Stream_Stop : 129, // 0x81
        Cmd_Stream_Status : 130, // 0x82
        Cmd_Stream_GetData : 131, // 0x83
        Cmd_Stream_Execute : 132, // 0x84
        Cmd_SPI_StreamOut : 133, // 0x85
        Cmd_SPI_StreamStop : 134, // 0x86
        Cmd_SPI_WriteAndReadEx : 135, // 0x87
        Cmd_Reserved_136 : 136, // 0x88 **
        Cmd_Reserved_137 : 137, // 0x89 **
        Cmd_Pegasus_Test : 138, // 0x8A
        Cmd_Reserved_139 : 139, // 0x8B **
        Cmd_Port_Setup : 140, // 0x8C
        Cmd_Port_Read : 141, // 0x8D
        Cmd_Port_Write : 142, // 0x8E
        Cmd_Port_WritePulse : 143, // 0x8F
        Cmd_END : 144
    // 0x90

    // ** = UNUSED COMMAND
    };

    var szCommandName =
    [
        "Cmd_LoopPacket", // 0x00
        "Cmd_I2C_Control", // 0x01
        "Cmd_I2C_Write", // 0x02
        "Cmd_I2C_Read", // 0x03
        "Cmd_I2CRead_WithAddress", // 0x04
        "Cmd_GPIO_Write_Control", // 0x05
        "Cmd_GPIO_Write_States", // 0x06
        "Cmd_GPIO_Read_States", // 0x07
        "Cmd_SPI_Control", // 0x08
        "Cmd_SPI_WriteAndRead", // 0x09
        "Cmd_FirmwareVersion_Read", // 0x0A
        "Cmd_MSP430_WordWrite", // 0x0B
        "Cmd_MSP430_WordRead", // 0x0C
        "Cmd_MSP430_ByteWrite", // 0x0D
        "Cmd_MSP430_ByteRead", // 0x0E
        "Cmd_UART_Control", // 0x0F
        "Cmd_Reserved_16", // 0x10 **
        "Cmd_Reserved_17", // 0x11 **
        "Cmd_UART_Write", // 0x12
        "Cmd_UART_SetMode", // 0x13
        "Cmd_UART_Read", // 0x14
        "Cmd_Local_I2C_Write", // 0x15
        "Cmd_PWM_Write_Control", // 0x16
        "Cmd_Power_WriteControl", // 0x17
        "Cmd_Power_ReadStatus", // 0x18
        "Cmd_ADC_Control", // 0x19
        "Cmd_ADC_ConvertAndRead", // 0x1A
        "Cmd_LED_Control", // 0x1B
        "Cmd_Clock_Control", // 0x1C
        "Cmd_FEC_Control", // 0x1D
        "Cmd_FEC_CountAndRead", // 0x1E
        "Cmd_Interrupt_Control", // 0x1F
        "Cmd_Interrupt_Received", // 0x20
        "Cmd_EasyScale_Control", // 0x21
        "Cmd_EasyScale_Write", // 0x22
        "Cmd_EasyScale_Read", // 0x23
        "Cmd_EasyScale_ACK_Received", // 0x24
        "Cmd_GPIO_SetPort", // 0x25
        "Cmd_GPIO_WritePort", // 0x26
        "Cmd_GPIO_ReadPort", // 0x27
        "Cmd_Reserved_40", // 0x28 Reserved for end-user command **
        "Cmd_Reserved_41", // 0x29 Reserved for end-user command **
        "Cmd_Reserved_42", // 0x2A Reserved for end-user command **
        "Cmd_Reserved_43", // 0x2B Reserved for end-user command **
        "Cmd_Reserved_44", // 0x2C Reserved for end-user command **
        "Cmd_Reserved_45", // 0x2D Reserved for end-user command **
        "Cmd_Reserved_46", // 0x2E Reserved for end-user command **
        "Cmd_Reserved_47", // 0x2F Reserved for end-user command **
        "Cmd_Reserved_48", // 0x30 Reserved for end-user command **
        "Cmd_Reserved_49", // 0x31 Reserved for end-user command **
        "Cmd_SMBUS_SendByte", // 0x32
        "Cmd_SMBUS_WriteByte", // 0x33
        "Cmd_SMBUS_WriteWord", // 0x34
        "Cmd_SMBUS_WriteBlock", // 0x35
        "Cmd_SMBUS_ReceiveByte", // 0x36
        "Cmd_SMBUS_ReadByte", // 0x37
        "Cmd_SMBUS_ReadWord", // 0x38
        "Cmd_SMBUS_ReadBlock", // 0x39
        "Cmd_SMBUS_ProcessCall", // 0x3A
        "Cmd_SMBUS_BWBRProcessCall", // 0x3B
        "Cmd_SMBUS_Control", // 0x3C
        "Cmd_SMBUS_GetEchoBuffer", // 0x3D
        "Cmd_RFFE_RegZeroWrite", // 0x3E
        "Cmd_RFFE_RegWrite", // 0x3F
        "Cmd_RFFE_ExtRegWrite", // 0x40
        "Cmd_RFFE_ExtRegWriteLong", // 0x41
        "Cmd_RFFE_RegRead", // 0x42
        "Cmd_RFFE_ExtRegRead", // 0x43
        "Cmd_RFFE_ExtRegReadLong", // 0x44
        "Cmd_OneWire_SetMode", // 0x45
        "Cmd_OneWire_PulseSetup", // 0x46
        "Cmd_OneWire_PulseWrite", // 0x47
        "Cmd_OneWire_SetState", // 0x48
        "Cmd_Reserved_73", // 0x49 **
        "Cmd_Reserved_74", // 0x4A **
        "Cmd_Reserved_75", // 0x4B **
        "Cmd_Reserved_76", // 0x4C **
        "Cmd_Reserved_77", // 0x4D **
        "Cmd_Reserved_78", // 0x4E **
        "Cmd_Reserved_79", // 0x4F **
        "Cmd_Reserved_80", // 0x50 **
        "Cmd_Reserved_81", // 0x51 **
        "Cmd_Reserved_82", // 0x52 **
        "Cmd_Reserved_83", // 0x53 **
        "Cmd_Packet", // 0x54
        "Cmd_GPIO_SetCustomPort", // 0x55
        "Cmd_GPIO_WriteCustomPort", // 0x56
        "Cmd_GPIO_ReadCustomPort", // 0x57
        "Cmd_GPIO_WritePulse", // 0x58 **
        "Cmd_Reserved_89", // 0x59 **
        "Cmd_Reserved_90", // 0x5A **
        "Cmd_Reserved_91", // 0x5B **
        "Cmd_Reserved_92", // 0x5C **
        "Cmd_Reserved_93", // 0x5D **
        "Cmd_Reserved_94", // 0x5E **
        "Cmd_Reserved_95", // 0x5F **
        "Cmd_I2C_BlkWriteBlkRead", // 0x60
        "Cmd_InvokeBSL", // 0x61
        "Cmd_FirmwareDebugMode", // 0x62
        "Cmd_Restart", // 0x63
        "Cmd_I2C_ReadWithAddress", // 0x64
        "Cmd_I2C_ReadInternal", // 0x65
        "Cmd_I2C_WriteInternal", // 0x66
        "Cmd_GetErrorList", // 0x67
        "Cmd_LED_SetState", // 0x68
        "Cmd_Power_SetVoltageRef", // 0x69
        "Cmd_Status_GetControllerType", // 0x6A
        "Cmd_Power_Enable", // 0x6B
        "Cmd_ADC_Enable", // 0x6C
        "Cmd_ADC_Acquire", // 0x6D
        "Cmd_ADC_GetData", // 0x6E
        "Cmd_ADC_GetStatus", // 0x6F
        "Cmd_ADC_SetReference", // 0x70
        "Cmd_Status_GetBoardRevision", // 0x71
        "Cmd_Status_EVMDetect", // 0x72
        "Cmd_ADC_AcquireTriggered", // 0x73
        "Cmd_Power_Notify", // 0x74
        "Cmd_Digital_Capture", // 0x75
        "Cmd_Digital_GetData", // 0x76
        "Cmd_Digital_GetStatus", // 0x77
        "Cmd_EasyScale_WriteAndRead", // 0x78
        "Cmd_DisplayScale_Set", // 0x79
        "Cmd_DisplayScale_WriteReg", // 0x7A
        "Cmd_DisplayScale_ReadReg", // 0x7B
        "Cmd_DisplayScale_WriteAndRead", // 0x7C
        "Cmd_Reserved_125", // 0x7D **
        "Cmd_Reserved_126", // 0x7E **
        "Cmd_Invalid", // 0x7F
        "Cmd_Stream_Start", // 0x80
        "Cmd_Stream_Stop", // 0x81
        "Cmd_Stream_Status", // 0x82
        "Cmd_Stream_GetData", // 0x83
        "Cmd_Stream_Execute", // 0x84
        "Cmd_SPI_StreamOut", // 0x85
        "Cmd_SPI_StreamStop", // 0x86
        "Cmd_SPI_WriteAndReadEx", // 0x87
        "Cmd_Reserved_136", // 0x88 **
        "Cmd_Reserved_137", // 0x89 **
        "Cmd_Pegasus_Test", // 0x8A
        "Cmd_Reserved_139", // 0x8B **
        "Cmd_Port_Setup", // 0x8C
        "Cmd_Port_Read", // 0x8D
        "Cmd_Port_Write", // 0x8E
        "Cmd_Port_ReadMultiple", // 0x8F
        "Cmd_END", // 0x90
        "" // for loop control
    ];

    // error code constants
    var ERR_OK                      =  0;
    var ERR_COM_RX_OVERFLOW         = -1;
    var ERR_COM_RX_BUF_EMPTY        = -2;
    var ERR_COM_TX_BUF_FULL         = -3;
    var ERR_COM_TX_STALLED          = -4;
    var ERR_COM_TX_FAILED           = -5;
    var ERR_COM_OPEN_FAILED         = -6;
    var ERR_COM_PORT_NOT_OPEN       = -7;
    var ERR_COM_PORT_IS_OPEN        = -8;
    var ERR_COM_READ_TIMEOUT        = -9;
    var ERR_COM_READ_ERROR          = -10;
    var ERR_COM_WRITE_ERROR         = -11;
    var ERR_DEVICE_NOT_FOUND        = -12;
    var ERR_COM_CRC_FAILED          = -13;
    
    var ERR_INVALID_PORT            = -20;
    var ERR_ADDRESS_OUT_OF_RANGE    = -21;
    var ERR_INVALID_FUNCTION_CODE   = -22;
    var ERR_BAD_PACKET_SIZE         = -23;
    var ERR_INVALID_HANDLE          = -24;
    var ERR_OPERATION_FAILED        = -25;
    var ERR_PARAM_OUT_OF_RANGE      = -26;
    var ERR_PACKET_OUT_OF_SEQUENCE  = -27;
    var ERR_INVALID_PACKET_HEADER   = -28;
    var ERR_UNIMPLEMENTED_FUNCTION  = -29;
    var ERR_TOO_MUCH_DATA           = -30;
    var ERR_INVALID_DEVICE          = -31;
    var ERR_UNSUPPORTED_FIRMWARE    = -32;
    var ERR_BUFFER_TOO_SMALL        = -33;
    var ERR_NO_DATA                 = -34;
    var ERR_RESOURCE_CONFLICT       = -35;
    var ERR_NO_EVM                  = -36;
    var ERR_COMMAND_BUSY            = -37;
    var ERR_ADJ_POWER_FAIL          = -38;
    var ERR_NOT_ENABLED             = -39;
    
    var ERR_I2C_INIT_ERROR          = -40;
    var ERR_I2C_READ_ERROR          = -41;
    var ERR_I2C_WRITE_ERROR         = -42;
    var ERR_I2C_BUSY                = -43;
    var ERR_I2C_ADDR_NAK            = -44;
    var ERR_I2C_DATA_NAK            = -45;
    var ERR_I2C_READ_TIMEOUT        = -46;
    var ERR_I2C_READ_DATA_TIMEOUT   = -47;
    var ERR_I2C_READ_COMP_TIMEOUT   = -48;
    var ERR_I2C_WRITE_TIMEOUT       = -49;
    var ERR_I2C_WRITE_DATA_TIMEOUT  = -50;
    var ERR_I2C_WRITE_COMP_TIMEOUT  = -51;
    var ERR_I2C_NOT_MASTER          = -52;
    var ERR_I2C_ARBITRATION_LOST    = -53;
    var ERR_I2C_NO_PULLUP_POWER     = -54;
    
    var ERR_SPI_INIT_ERROR          = -60;
    var ERR_SPI_WRITE_READ_ERROR    = -61;
    
    var ERR_DATA_WRITE_ERROR        = -70;
    var ERR_DATA_READ_ERROR         = -71;
    var ERR_TIMEOUT                 = -72;
    var ERR_DATA_CRC_FAILED         = -73;
    var ERR_INVALID_PARAMETER       = -74;
    var ERR_NOT_INITIALIZED         = -75;
    
    var getErrorString = function(code)
    {
        switch (code)
        {
        case ERR_OK:                         return "No error";                             //  0
        case ERR_COM_RX_OVERFLOW:            return "Receiver overflowed";                  // -1
        case ERR_COM_RX_BUF_EMPTY:           return "Receive buffer is empty";              // -2
        case ERR_COM_TX_BUF_FULL:            return "Transmit buffer is full";              // -3
        case ERR_COM_TX_STALLED:             return "Transmit is stalled";                  // -4
        case ERR_COM_TX_FAILED:              return "Transmit failed";                      // -5
        case ERR_COM_OPEN_FAILED:            return "Failed to open communications port";   // -6
        case ERR_COM_PORT_NOT_OPEN:          return "Communications port is not open";      // -7
        case ERR_COM_PORT_IS_OPEN:           return "Communications port is open";          // -8
        case ERR_COM_READ_TIMEOUT:           return "Receive timeout";                      // -9
        case ERR_COM_READ_ERROR:             return "Communications port read error";       // -10
        case ERR_COM_WRITE_ERROR:            return "Communications port write error";      // -11
        case ERR_DEVICE_NOT_FOUND:           return "Communications device not found";      // -12
        case ERR_COM_CRC_FAILED:             return "Communications CRC failed";            // -13

        case ERR_INVALID_PORT:               return "Invalid port";                         // -20
        case ERR_ADDRESS_OUT_OF_RANGE:       return "Address is out of accepted range";     // -21
        case ERR_INVALID_FUNCTION_CODE:      return "Invalid function code";                // -22
        case ERR_BAD_PACKET_SIZE:            return "Invalid packet size";                  // -23
        case ERR_INVALID_HANDLE:             return "Invalid handle";                       // -24
        case ERR_OPERATION_FAILED:           return "Operation failed";                     // -25
        case ERR_PARAM_OUT_OF_RANGE:         return "Parameter is out of range";            // -26
        case ERR_PACKET_OUT_OF_SEQUENCE:     return "Packet is out of sequence";            // -27
        case ERR_INVALID_PACKET_HEADER:      return "Invalid packet header";                // -28
        case ERR_UNIMPLEMENTED_FUNCTION:     return "Function not implemented";             // -29
        case ERR_TOO_MUCH_DATA:              return "Too much data";                        // -30 
        case ERR_INVALID_DEVICE:             return "Invalid device";                       // -31
        case ERR_UNSUPPORTED_FIRMWARE:       return "Unsupported firmware version";         // -32
        case ERR_BUFFER_TOO_SMALL:           return "Buffer is too small";                  // -33
        case ERR_NO_DATA:                    return "No data available";                    // -34
        case ERR_RESOURCE_CONFLICT:          return "Resource conflict";                    // -35
        case ERR_NO_EVM:                     return "EVM is required for external power";   // -36
        case ERR_COMMAND_BUSY:               return "Command is busy";                      // -37
        case ERR_ADJ_POWER_FAIL:             return "Adjustable power supply failure";      // -38
        case ERR_NOT_ENABLED:                return "Not enabled";                          // -39

        case ERR_I2C_INIT_ERROR:             return "I2C initialization failed";            // -40
        case ERR_I2C_READ_ERROR:             return "I2C read error";                       // -41
        case ERR_I2C_WRITE_ERROR:            return "I2C write error";                      // -42
        case ERR_I2C_BUSY:                   return "I2C busy (transfer is pending)";       // -43
        case ERR_I2C_ADDR_NAK:               return "Address not acknowledged (NAK)";       // -44
        case ERR_I2C_DATA_NAK:               return "Data not acknowledged (NAK)";          // -45
        case ERR_I2C_READ_TIMEOUT:           return "Read timeout";                         // -46
        case ERR_I2C_READ_DATA_TIMEOUT:      return "Read data timeout";                    // -47
        case ERR_I2C_READ_COMP_TIMEOUT:      return "Timeout waiting for read complete";    // -48
        case ERR_I2C_WRITE_TIMEOUT:          return "Write timeout";                        // -49
        case ERR_I2C_WRITE_DATA_TIMEOUT:     return "Write data timeout";                   // -50
        case ERR_I2C_WRITE_COMP_TIMEOUT:     return "Timeout waiting for write complete";   // -51
        case ERR_I2C_NOT_MASTER:             return "I2C not in Master mode";               // -52
        case ERR_I2C_ARBITRATION_LOST:       return "I2C arbitration lost";                 // -53
        case ERR_I2C_NO_PULLUP_POWER:        return "I2C pullups require 3.3V power";       // -54

        case ERR_SPI_INIT_ERROR:             return "SPI initialization failed";            // -60
        case ERR_SPI_WRITE_READ_ERROR:       return "SPI write/read error";                 // -61

        case ERR_DATA_WRITE_ERROR:           return "Data write error";                     // -70
        case ERR_DATA_READ_ERROR:            return "Data read error";                      // -71
        case ERR_TIMEOUT:                    return "Operation timeout";                    // -72
        case ERR_DATA_CRC_FAILED:            return "Data CRC failed";                      // -73

        default:
            if (code > 0)
            {
                return "Success";                              // any positive value
            }
            break;
        }
    };

    var INTERRUPT_INT0 = 0; // Interrupt pin INT0
    var INTERRUPT_INT1 = 1; // Interrupt pin INT1
    var INTERRUPT_INT2 = 2; // Interrupt pin INT2
    var INTERRUPT_INT3 = 3; // Interrupt pin INT3
    var INTERRUPT_EVM = 4; // Interrupt pin EVM_DETECT
    var INTERRUPT_POWER = 5; // Interrupt for power event
    var INTERRUPT_ADC = 6; // Interrupt for ADC event
    var INTERRUPT_DIGITAL = 7; // Interrupt for Digital Capture event
    var INTERRUPT_ASYNC_IO = 8; // Interrupt for asynchronous I/O
    var INTERRUPT_CALLBACK_101 = 9; // Callback for Cmd_I2C_ReadInternal
    var INTERRUPT_CALLBACK_102 = 10; // Callback for Cmd_I2C_WriteInternal
    var INTERRUPT_SOURCES = 11; // Total number of interrupt sources

    // Controller Type constants
    var CTRLR_UNKNOWN = 0x0000;
    var CTRLR_USB2ANY = 0x0001;
    var CTRLR_ONEDEMO = 0x0002;
    var CTRLR_UNSUPPORTED = 0x0004;

    var VERSION_SIZE_IN_BYTES = 4;
    var VERSION_TO_DWORD = function(packet, offset)
    {
        var version = 0;
        for (var i = 0; i < VERSION_SIZE_IN_BYTES; i++)
        {
            version = (version << 8) | packet[offset + i];
        }
        return version;
    };

    var VER_MAJOR = 2;
    var VER_MINOR = 8;
    var VER_REVISION = 0;
    var VER_BUILD = 0;

    var MIN_FIRMWARE_REQUIRED = VERSION_TO_DWORD([2, 6, 2, 20], 0);

    var CRC8TABLE =
        [
            0x00, 0x07, 0x0E, 0x09, 0x1C, 0x1B, 0x12, 0x15, 0x38, 0x3F, 0x36, 0x31, 0x24, 0x23, 0x2A, 0x2D, 0x70, 0x77, 0x7E, 0x79, 0x6C, 0x6B, 0x62, 0x65, 0x48, 0x4F, 0x46, 0x41, 0x54, 0x53, 0x5A, 0x5D, 0xE0, 0xE7, 0xEE, 0xE9, 0xFC, 0xFB, 0xF2, 0xF5, 0xD8, 0xDF, 0xD6, 0xD1, 0xC4, 0xC3, 0xCA, 0xCD, 0x90, 0x97, 0x9E,
            0x99, 0x8C, 0x8B, 0x82, 0x85, 0xA8, 0xAF, 0xA6, 0xA1, 0xB4, 0xB3, 0xBA, 0xBD, 0xC7, 0xC0, 0xC9, 0xCE, 0xDB, 0xDC, 0xD5, 0xD2, 0xFF, 0xF8, 0xF1, 0xF6, 0xE3, 0xE4, 0xED, 0xEA, 0xB7, 0xB0, 0xB9, 0xBE, 0xAB, 0xAC, 0xA5, 0xA2, 0x8F, 0x88, 0x81, 0x86, 0x93, 0x94, 0x9D, 0x9A, 0x27, 0x20, 0x29, 0x2E, 0x3B, 0x3C,
            0x35, 0x32, 0x1F, 0x18, 0x11, 0x16, 0x03, 0x04, 0x0D, 0x0A, 0x57, 0x50, 0x59, 0x5E, 0x4B, 0x4C, 0x45, 0x42, 0x6F, 0x68, 0x61, 0x66, 0x73, 0x74, 0x7D, 0x7A, 0x89, 0x8E, 0x87, 0x80, 0x95, 0x92, 0x9B, 0x9C, 0xB1, 0xB6, 0xBF, 0xB8, 0xAD, 0xAA, 0xA3, 0xA4, 0xF9, 0xFE, 0xF7, 0xF0, 0xE5, 0xE2, 0xEB, 0xEC, 0xC1,
            0xC6, 0xCF, 0xC8, 0xDD, 0xDA, 0xD3, 0xD4, 0x69, 0x6E, 0x67, 0x60, 0x75, 0x72, 0x7B, 0x7C, 0x51, 0x56, 0x5F, 0x58, 0x4D, 0x4A, 0x43, 0x44, 0x19, 0x1E, 0x17, 0x10, 0x05, 0x02, 0x0B, 0x0C, 0x21, 0x26, 0x2F, 0x28, 0x3D, 0x3A, 0x33, 0x34, 0x4E, 0x49, 0x40, 0x47, 0x52, 0x55, 0x5C, 0x5B, 0x76, 0x71, 0x78, 0x7F,
            0x6A, 0x6D, 0x64, 0x63, 0x3E, 0x39, 0x30, 0x37, 0x22, 0x25, 0x2C, 0x2B, 0x06, 0x01, 0x08, 0x0F, 0x1A, 0x1D, 0x14, 0x13, 0xAE, 0xA9, 0xA0, 0xA7, 0xB2, 0xB5, 0xBC, 0xBB, 0x96, 0x91, 0x98, 0x9F, 0x8A, 0x8D, 0x84, 0x83, 0xDE, 0xD9, 0xD0, 0xD7, 0xC2, 0xC5, 0xCC, 0xCB, 0xE6, 0xE1, 0xE8, 0xEF, 0xFA, 0xFD, 0xF4,
            0xF3
        ];

    var calculateCRC = function(buf, offset, len)
    {
        var crc = 0;

        len = len || buf.length;
        for (var i = offset; i < len; i++)
        {
            crc = CRC8TABLE[buf[i] ^ crc];
        }

        return crc;
    };
    
    /***
     * Helper functions for USB2ANY sub-modules, like I2C, Power, GPIO, and SPI
     ***/
    
    var setBytes = function(array, size, value, offset)
    {
        for(var i = size; i-- >0; )
        {
            array[offset + i] = value & 0xff;
            value = value >>> 8;
        }
    };
    
    var setBytesLSB = function(array, size, value, offset)
    {   // little endian
        for(var i = 0; i < size; i++)
        {
            array[offset + i] = value & 0xff;
            value = value >>> 8;
        }
    };

    var concatenateResults = function(results)
    {
        return Array.prototype.concat.apply([], results);
    };
    
    var getMultipleRegisterReadResult = function(array)
    {
        return array.slice(PACKET_PAYLOAD);
    };
    
    var getResult = function(array)
    {
        var result = 0;
        var size = PACKET_PAYLOAD + (array[PACKET_PAYLOAD_LEN] || 0);
        for(var i = PACKET_PAYLOAD; i < size; i++)
        {
            result = (result << 8) | (array[i] & 0xff);
        }
        return result;
    };
    
    var getResultLSB = function(array)
    {   // little endian
        var result = 0;
        var size = PACKET_PAYLOAD + (array[PACKET_PAYLOAD_LEN] || 0);
        for(var i = size-1; i >= PACKET_PAYLOAD; i--)
        {
            result = (result << 8) | (array[i] & 0xff);
        }
        return result;
    };

    var getPayload = function(array) 
    {
        return array.slice(PACKET_PAYLOAD, PACKET_PAYLOAD + (array[PACKET_PAYLOAD_LEN] || 0));
    };
    
    var TheValue = 'The value "';
    var ForEntry = '", for entry ';
    var InRegDefs = ', in the system.json file';
    
    var parseNumberProperty = function(message, value, min, max)
    {
        var result = +value;
        if (isNaN(result))
        {
            throw TheValue + value + ForEntry + message + InRegDefs + ' is not a number.';
        }
        if (min && result < min)
        {
            throw TheValue + value + ForEntry + message + InRegDefs + ' must be greater than ' + min + '.';
        }
        if (max && result > max)
        {
            throw TheValue + value + ForEntry + message + InRegDefs + ' must be less than ' + max + '.';
        }
        return result;
    };
    
    var parseStringProperty = function(message, value, valueMap)
    {
        var stringValue = ("" + value).toLowerCase();
        if (valueMap.hasOwnProperty(stringValue))
        {
            return valueMap[stringValue];
        }
        else
        {
            message = TheValue + value + ForEntry + message + InRegDefs + ' is not supported.  Valid entries are';
            var delimiter = ' "';
            var lastOption;
            for(var option in valueMap)
            {
                if (valueMap.hasOwnProperty(option))
                {
                    if (lastOption)
                    {
                        message = message + delimiter + lastOption;
                        delimiter = '", "';
                    }
                    lastOption = option;
                }
            }
            throw message + '", or "' + lastOption + '".';
        }
    };

    /***
     * Interface for Sub-modules like I2C, Power, GPIO, and SPI
     ***/
    
    var ICommInterface = function()
    {
    };
    
    ICommInterface.prototype.control = function(u2a, settings) 
    {
    };
    
    ICommInterface.prototype.read = function(u2a, registerInfo, registerModel, coreIndex)
    {
    };
    
    ICommInterface.prototype.write = function(u2a, registerInfo, value, registerModel, coreIndex)
    {
    };
    
    ICommInterface.prototype.initSymbolsForDevice = function(config, registerModel)
    {
    };
    
    /***
     * I2C Interface sub-module definition
     ***/
    
    var I2C_100kHz = 0;
    var I2C_400kHz = 1;
    var I2C_10kHz  = 2;
    var I2C_800kHz = 3;
    
    var I2C_7Bits = 0;
    var I2C_10Bits = 1;

    var I2C_PullUps_OFF = 0;
    var I2C_PullUps_ON = 1;
    
    var I2C_Interface = function(settings, registerModel, u2a) 
    {
        this._registerModel = registerModel;
        
        var i2cAddressHi = (settings.deviceAddrs >> 8) & 0xff;
        var i2cAddressLo = settings.deviceAddrs & 0xff;
        
        this.readData = [ i2cAddressHi, i2cAddressLo ];
        this.writeData = [ i2cAddressHi, i2cAddressLo ];
        
        this.sequentialRead = settings.sequentialRead;
        this.readWithAddress = settings.readWithAddress;
        this.blockWriteBlockRead = settings.blockWriteBlockRead;
        
        this.u2a = u2a;

        if (settings.crc) {
            this.crc = new gc.databind.CRC(settings.crc);
        }
        if (settings.dataEndian === 'little') {
            this._setBytes = setBytesLSB;
            this._getResult = getResultLSB;
            this._dataEndian = settings.dataEndian;
        } else {
            this._setBytes = setBytes;
            this._getResult = getResult;
        }
    };
    
    I2C_Interface.prototype = new ICommInterface();
    
    I2C_Interface.prototype.control = function(u2a, settings)
    {
        var speed = I2C_10kHz;
        switch(settings.speed)
        {
            case 100:
                speed = I2C_100kHz;
                break;
            case 400:
                speed = I2C_400kHz;
                break;
            case 800:
                speed = I2C_800kHz;
                break;
        }
        
        var addrsBits = I2C_7Bits;
        switch(settings.addrsBits)
        {
            case 10:
                addrsBits = I2C_10Bits;
                break;
        }

        var internalAddrsBits = parseNumberProperty('internalAddrsBits', settings.internalAddrsBits || 8, 1, 16);
        this.internalAddrsBytes = Math.ceil(internalAddrsBits/8);
        
        var pullUps = settings.pullup ? I2C_PullUps_ON : I2C_PullUps_OFF;
        
        u2a.sendCommandPacket(Command.Cmd_I2C_Control,
        [
            speed, addrsBits, pullUps
        ]);
    };

	var setDeviceAddress = function(registerModel, buffer, info)
	{
        var deviceAddrs;
	    if (info.deviceAddrs && !isNaN(info.deviceAddrs))
	    {
            deviceAddrs = +info.deviceAddrs;
            buffer[0] = (deviceAddrs >> 8) & 0xff;
            buffer[1] = deviceAddrs & 0xff;
        }
	    else if (registerModel)
        {
            deviceAddrs = registerModel.getDeviceAddrsForRegister(info);
            buffer[0] = (deviceAddrs >> 8) & 0xff;
            buffer[1] = deviceAddrs & 0xff;
        }
	};

    I2C_Interface.prototype.read = function(u2a, info, registerModel, coreIndex)
    {
        setDeviceAddress(this._registerModel, this.readData, info);
        var numBytes = info.nBytes !== undefined ? info.nBytes : Math.ceil(info.size !== undefined ? info.size/8 : 1);

        if(this.readWithAddress) {
            // Using I2C ReadWithAddress API
            this.readData[2] = info.addr || 0;
            this.readData[3] = numBytes;
        }

        else {
            // Using I2C ReadInternal API
            // readData[0-1] - device address
            // readData[2] - size of internal address, in bytes (must be 0, 1, or 2)
            this.readData[2] = this.internalAddrsBytes; 
    
            // readData[3-4] - number of bytes of data
            this.readData[3] = (numBytes >> 8) & 0xff;
            this.readData[4] = numBytes & 0xff; 
    
            // readData[5-6] - Internal address of the data to read
            if(this.internalAddrsBytes == 1) {
                // 1 byte register address
                this.readData[5] = info.addr || 0;
            }
            else {
                // 2 byte register address
                this.readData[5] = info.addr ? (info.addr >> 8) & 0xff : 0;
                this.readData[6] = info.addr ? info.addr & 0xff : 0;
            }
        }

        var cmd = this.readWithAddress ? Command.Cmd_I2C_ReadWithAddress : Command.Cmd_I2C_ReadInternal;

        if (this.crcUser && this.crc) {
            var data = this.readData.slice();
            var crcData = this.crcUser.embed_crc_data(this.crc, {
                write: false,
                deviceAddr: (this.readData[0] << 8) | (this.readData[1] & 0xff),
                registerAddr: info.addr,
                payload: data,
                numBytes: numBytes
            });

            data = (crcData && crcData.payload) || data;

            if (crcData && crcData.numBytes) {
                if (this.readWithAddress) {
                    data[3] = crcData.numBytes;
                } else {
                    data[3] = (crcData.numBytes >> 8) & 0xff;
                    data[4] = crcData.numBytes & 0xff;
                }
            }
            var self = this;
            return u2a.readResponse(u2a.sendCommandPacket(cmd, data)).then(function(result) {
                var payload = getPayload(result);
                var crcData = this.crcUser.verify_crc_data(this.crc, {
                    payload: payload
                });

                if (crcData && crcData.valid === false) {
                    return Q.reject('Invalid CRC');
                }

                return (crcData && crcData.payload) || payload;
            }.bind(this)).then(function(array) {
                var result = 0;
                if (self._dataEndian === 'little') {
                    for(var i = array.length-1; i >= 0; i--)
                    {
                        result = (result << 8) | (array[i] & 0xff);
                    }
                } else {
                    for(var i = 0; i < array.length; i++)
                    {
                        result = (result << 8) | (array[i] & 0xff);
                    }
                }
                return result;
            });
        } else {
            return u2a.readResponse(u2a.sendCommandPacket(cmd, this.readData)).then(this._getResult);
        }
    };
    
    var MAX_COUNT = MAX_PAYLOAD - 6;
    
    I2C_Interface.prototype.multiRegisterRead = function(u2a, startRegisterInfo, count, registerModel, coreIndex)
    {
        registerModel = registerModel || this._registerModel;
        setDeviceAddress(registerModel, this.readData, startRegisterInfo);
        var numBytesPerRegister = startRegisterInfo.nBytes !== undefined ? startRegisterInfo.nBytes : Math.ceil(startRegisterInfo.size !== undefined ? startRegisterInfo.size/8 : 1);
        // BTW, for Cmd_I2C_BlkWriteBlkRead, the c code says 'if numWriteBytes + numReadBytes > 32, return error 'too much data'
        // This is much fewer than MAX_COUNT (48) and MAX_PAYLOAD (54).
        // If the cases, which expect to use Cmd_I2C_BlkWriteBlkRead, work well with Cmd_I2C_ReadInternal,
        // I suggest to drop the support of Cmd_I2C_BlkWriteBlkRead, unless we code in the limit of 32 for this special case.
        var maxRegisterCountPerPacket = Math.floor(MAX_PAYLOAD / numBytesPerRegister);
        var startAddrs = startRegisterInfo.addr || 0;
        if (count > maxRegisterCountPerPacket)
        {
            // need to split into two or more hid packets.
            var promises = [];
            while(count > maxRegisterCountPerPacket)
            {
                promises.push(this.multiRegisterReadOnePacketHelper(u2a, startAddrs, maxRegisterCountPerPacket, numBytesPerRegister, registerModel, coreIndex));
                count -= maxRegisterCountPerPacket;
                startAddrs += maxRegisterCountPerPacket;
            }
            promises.push(this.multiRegisterReadOnePacketHelper(u2a, startAddrs, count, numBytesPerRegister, registerModel, coreIndex));
            return Q.all(promises).then(concatenateResults);
        }
        else
        {
            return this.multiRegisterReadOnePacketHelper(u2a, startAddrs, count, numBytesPerRegister, registerModel, coreIndex);
        }
    };

    I2C_Interface.prototype.multiRegisterReadOnePacketHelper = function(u2a, startAddrs, regCount, numBytesPerRegister, registerModel, coreIndex) {
        var cmd = Command.Cmd_I2C_ReadWithAddress;
        var numReadBytes = regCount * numBytesPerRegister;
        if (this.readWithAddress) {
            this.readData[2] = startAddrs;
            this.readData[3] = numReadBytes;
        } else if (this.blockWriteBlockRead) {
            cmd = Command.Cmd_I2C_BlkWriteBlkRead;
            this.readData[2] = this.internalAddrsBytes;  // number of write bytes
            this.readData[3] = numReadBytes & 0xff; // number of read bytes
            // bytes to write is register address in this case
            if(this.internalAddrsBytes === 1) {
                this.readData[4] = startAddrs;
            } else {
                this.readData[4] = (startAddrs >> 8) & 0xff;
                this.readData[5] = startAddrs & 0xff;
            }
         } else {
            cmd = Command.Cmd_I2C_ReadInternal;
            // readData[2] - size of internal address, in bytes (must be 0, 1, or 2)
            this.readData[2] = this.internalAddrsBytes;
            // readData[3-4] - number of bytes of data
            this.readData[3] = (numReadBytes >> 8) & 0xff;
            this.readData[4] = numReadBytes & 0xff;
            // readData[5-6] - Internal address of the data to read
            if(this.internalAddrsBytes === 1) {
                // 1 byte register address
                this.readData[5] = startAddrs;
            } else {
                // 2 byte register address
                this.readData[5] = (startAddrs >> 8) & 0xff;
                this.readData[6] = startAddrs & 0xff;
            }
        }
        return u2a.readResponse(u2a.sendCommandPacket(cmd, this.readData)).then(getPayload).then((payload) => {
            var array = [];
            if (this._dataEndian === 'little') {
                for (var reg = 0; reg < regCount; reg++) {
                    var result = 0;
                    for (var i = numBytesPerRegister - 1; i >= 0; i--) {
                        result = (result << 8) | (payload[reg * numBytesPerRegister + i] & 0xff);
                    }
                    array[reg] = result;
                }
            } else {
                for (var reg = 0; reg < regCount; reg++) {
                    var result = 0;
                    for (var i = 0; i < numBytesPerRegister; i++) {
                        result = (result << 8) | (payload[reg * numBytesPerRegister + i] & 0xff);
                    }
                    array[reg] = result;
                }
            }
            return array;
        })
    }
    
    var writePromise = Q(true); 
    
    I2C_Interface.prototype.write = function(u2a, info, value, registerModel, coreIndex)
    {
        var nBytes = info.nBytes !== undefined ? info.nBytes : Math.ceil(info.size !== undefined ? info.size/8 : 1);
        var size = 4 + nBytes;
        if (size <= this.writeData.length)
        {
            this.writeData = this.writeData.slice(0, size);
        }
        registerModel = registerModel || this._registerModel;
        setDeviceAddress(registerModel, this.writeData, info);

        this.writeData[2] = nBytes+1;
        this.writeData[3] = (info.writeAddr === undefined ? info.addr : info.writeAddr) || 0;
        this._setBytes(this.writeData, nBytes, value, 4);

        var data = this.writeData.slice();
        if (this.crcUser && this.crc) {
            var crcData = this.crcUser.embed_crc_data(this.crc, {
                write: true,
                deviceAddr: (this.writeData[0] << 8) | (this.writeData[1] & 0xff),
                registerAddr: this.writeData[3],
                writeData: value,
                payload: data,
                numBytes: nBytes
            });

            data = (crcData && crcData.payload) || data;

            if (crcData && crcData.numBytes) {
                data[2] = Math.min(crcData.numBytes+1, data.length-3); // GC-2381
            }
        }

        u2a.sendCommandPacket(Command.Cmd_I2C_Write, data);
        return writePromise;
    };
    
    I2C_Interface.prototype.initSymbolsForDevice = function(settings, registerModel)
    {
        registerModel.readDeviceAddrsMap('I2C', settings);
    };
    
    I2C_Interface.prototype.I2C_Read = function(slaveAddr, numBytes)
    {
        var buffer = [(slaveAddr >> 8) & 0xff, slaveAddr & 0xff, numBytes & 0xff];
        return this.u2a.readResponse(this.u2a.sendCommandPacket(Command.Cmd_I2C_Read, buffer)).then(getPayload);
    };
    
    I2C_Interface.prototype.I2C_Write = function(slaveAddr, pDataBuffer)
    {
        pDataBuffer = pDataBuffer instanceof Array ? pDataBuffer : [pDataBuffer];
        var buffer = [(slaveAddr >> 8) & 0xff, slaveAddr & 0xff, pDataBuffer.length & 0xff];
        buffer.push.apply(buffer, pDataBuffer);
        return this.u2a.readResponse(this.u2a.sendCommandPacket(Command.Cmd_I2C_Write, buffer));
    };
    
    /***
     * GPIO sub-module implementation
     ***/
    var GPIO_Interface = function(settings, registerModel) {
        this._registerModel = registerModel;
        
    };
    
    GPIO_Interface.prototype = new ICommInterface();
    
    GPIO_Interface.prototype._modeMap = { "output": 1, "input": 2 };
    GPIO_Interface.prototype._resistorMap = { "pullup": 1, "pulldown": 2 };
    GPIO_Interface.prototype._pinStateMap = { "high": 2, "low": 1 };
    
    GPIO_Interface.prototype.control = function(u2a, gpioPin)
    {
        if (gpioPin.hasOwnProperty('bindName'))
        {
            this._registerModel.getRegisterInfo('u2a.gpio.'+gpioPin.bindName).comm = this;
        }
        if (gpioPin.hasOwnProperty('pin'))
        {
            var pin = parseNumberProperty('pin, in the GPIO interface', gpioPin.pin, 0, 12);
            this._pin = pin;
            if (gpioPin.hasOwnProperty('mode'))
            {
                var pinFunction = parseStringProperty('mode', gpioPin.mode, this._modeMap);
                if (gpioPin.hasOwnProperty('resistor'))
                {
                    if (pinFunction === this._modeMap.input)
                    {
                        pinFunction += parseStringProperty('resistor', gpioPin.resistor, this._resistorMap);
                    }
                    else
                    {
                        throw 'GPIO pin ' + pin + '  with "output" mode, ' + InRegDefs + ' cannot have a "resistor" field.';
                    }
                }
                u2a.sendCommandPacket(Command.Cmd_GPIO_SetPort, [ pin, pinFunction ]);
            }
            if (gpioPin.hasOwnProperty('state'))
            {
                
                var state = parseStringProperty('state, in the GPIO interface', gpioPin.state, this._pinStateMap);
                u2a.sendCommandPacket(Command.Cmd_GPIO_WritePort, [ pin, state ]);
            }
        }
        else
        {
            throw 'GPIO interface is missing a pin field to identify the specific gpio pin instance.';
        }
    };

    GPIO_Interface.prototype.read = function(u2a, info, registerModel, coreIndex)
    {
        return u2a.readResponse(u2a.sendCommandPacket(Command.Cmd_GPIO_ReadPort, [this._pin])).then(getResult);
    };

    GPIO_Interface.prototype.write = function(u2a, info, value, registerModel, coreIndex)
    {
        u2a.sendCommandPacket(Command.Cmd_GPIO_WritePort, [this._pin, value ? 2 : 1]);
        return writePromise;
    };

    GPIO_Interface.prototype.writePulse = function(u2a, info, isPulseHigh, microSeconds, registerModel, coreIndex)
    {
        u2a.sendCommandPacket(Command.Cmd_GPIO_WritePulse, [this._pin, isPulseHigh ? 1 : 0, (microSeconds >> 8) & 0xff, microSeconds & 0xff]);
        return writePromise;
    };

    GPIO_Interface.prototype.initSymbolsForDevice = function(settings, registerModel)
    {
        if(settings.hasOwnProperty('bindName')) {
            var registerInfo = {
                comm: undefined, 
                uri: 'u2a.gpio.' + settings.bindName,
            };
            if(settings.mode && settings.mode === 'input') {
                registerInfo.type = 'readonly';
            }
            else if(settings.mode && settings.mode === 'output') {
                registerInfo.type = 'nonvolatile';
            }

            registerModel.addPseudoRegister(registerInfo.uri, registerInfo);
        }
    };

    /***
     * UART sub-module implementation
     ***/
    var UART_Interface = function(settings, registerModel) {
        registerModel._comm = this;
        this._registerModel = registerModel;

        this._getResult = function(array) 
        {
            var result = 0;
            for(var i = 0; i < array.length; i++)
            {
                result = (result << 8) | (array[i] & 0xff);
            }
            return result;
        };
    };
    
    UART_Interface.prototype = new ICommInterface();

    var UART_9600_bps   = 0;
    var UART_19200_bps  = 1;
    var UART_38400_bps  = 2;
    var UART_57600_bps  = 3;
    var UART_115200_bps = 4;
    var UART_230400_bps = 5;
    var UART_300_bps    = 6;
    var UART_320_bps    = 7;
    var UART_600_bps    = 8;
    var UART_1200_bps   = 9;
    var UART_2400_bps   = 10;
    var UART_4800_bps   = 11;

    UART_Interface.prototype._parityMap = { "none": 0, "even": 1, "odd": 2 };
    UART_Interface.prototype._bitDirectionMap = { "lsb": 0, "msb": 1 };

    UART_Interface.prototype.initSymbolsForDevice = function(settings, registerModel)
    {
        var c = gc.databind.PacketCodecFactory.getConstructor(settings.codec);
        if (c && c.prototype && c.prototype.initSymbolsForDevice)
        {
            c.prototype.initSymbolsForDevice(settings, registerModel);
        }
    };

    UART_Interface.prototype.control = function(u2a, settings)
    {
        this.uartCodec = gc.databind.internal.PacketCodecFactory.create(settings.codec, u2a.sendCommandPacket.bind(u2a, Command.Cmd_UART_Write));

        var baudRate = UART_9600_bps;
        switch(+settings.baudRate) {
            case 19200:
                baudRate = UART_19200_bps;
                break;
            case 38400:
                baudRate = UART_38400_bps;
                break;
            case 57600:
                baudRate = UART_57600_bps;
                break;
            case 115200:
                baudRate = UART_115200_bps;
                break;
            case 230400:
                baudRate = UART_230400_bps;
                break;
            case 300:
                baudRate = UART_300_bps;
                break;
            case 320:
                baudRate = UART_320_bps;
                break;
            case 600:
                baudRate = UART_600_bps;
                break;
            case 1200:
                baudRate = UART_1200_bps;
                break;
            case 2400:
                baudRate = UART_2400_bps;
                break;
            case 4800:
                baudRate = UART_4800_bps;
                break;
        }

        var parity = parseStringProperty('parity', settings.parity, this._parityMap);
        var bitDirection = parseStringProperty('bitDirection', settings.bitDirection, this._bitDirectionMap);
        var characterLength = 8 - parseNumberProperty('characterLength', settings.characterLength || 8, 7, 8);
        var stopBits = parseNumberProperty('stopBits', settings.stopBits || 1, 1, 2) === 1 ? 0 : 1;

        u2a.sendCommandPacket(Command.Cmd_UART_Control,
            [
                baudRate, parity, bitDirection, characterLength, stopBits
            ]);


        u2a.sendCommandPacket(Command.Cmd_UART_SetMode, [0]);

        return this.uartCodec.connect(settings);

    };

    UART_Interface.prototype.read = function(u2a, info, registerModel, coreIndex)
    {
        var that = this;
        registerModel = registerModel || this._registerModel;
        return this.uartCodec.readValue(info, registerModel, coreIndex).then(function(data)
        {
            var numBits = (info.nBytes !== undefined ? info.nBytes : info.size !== undefined ? Math.ceil(info.size/8) : 1)*8;
            var mask = (1 << numBits) - 1;
            var command = that._getResult(data);

            return command & mask;
        });
    };

    UART_Interface.prototype.write = function(u2a, info, value, registerModel, coreIndex)
    {
        registerModel = registerModel || this._registerModel;
        return this.uartCodec.writeValue(info, value, registerModel, coreIndex);
    };

    UART_Interface.prototype.rxUartData = function(data) {
        var size = data[PACKET_PAYLOAD_LEN];
        var payload = data.slice(PACKET_PAYLOAD, PACKET_PAYLOAD + size);
        
        this.uartCodec.decoder(payload);
    };

    /***
     * PWM sub-module implementation
     ***/
    var PWM_Interface = function(settings, registerModel) {
        this._registerModel = registerModel;
    };
    
    PWM_Interface.prototype = new ICommInterface();

    PWM_Interface.prototype._modeControlMap = {"stop": 0, "up": 1, "continuous": 2, "up_down": 3};
    PWM_Interface.prototype._outputMode1Map = {"bit_value": 0, "set": 1, "toggle_reset": 2, "set_reset": 3, "toggle": 4, "reset": 5, "toggle_set": 6, "reset_set": 7};

    PWM_Interface.prototype.control = function(u2a, settings)
    {
        // whichPWM is required to send the control command
        // if it is not provided, no control is sent
        if(settings.whichPWM === undefined)
        {
            return;
        }
        
        var modeControl = parseStringProperty('modeControl', settings.modeControl || "up", this._modeControlMap);
        var whichPWM = parseNumberProperty('whichPWM', settings.whichPWM, 0, 3);
        var compareRegister0 = parseNumberProperty('compareRegister0', settings.compareRegister0 || 0, 0);
        var outputMode1 = parseStringProperty('outputMode1', settings.outputMode1 || "reset_set", this._outputMode1Map);
        var compareRegister1 = parseNumberProperty('compareRegister1', settings.compareRegister1 || 0, 0);
        var inputDividerEX = parseNumberProperty('inputDividerEX', settings.inputDividerEX || 1, 1, 8) - 1;
        var inputDivider = parseNumberProperty('inputDivider', settings.inputDivider || 1);

        switch(inputDivider) {
            case 1:
                inputDivider = 0;
                break;
            case 2:
                inputDivider = 1;
                break;
            case 4:
                inputDivider = 2;
                break;
            case 8:
                inputDivider = 3;
                break;
            default:
                throw "Invalid value for inputDivider. Value must be 1, 2, 4 or 8.";
        }
        
        u2a.sendCommandPacket(Command.Cmd_PWM_Write_Control,
            [
                whichPWM, modeControl, inputDivider, 
                (compareRegister0 >> 8) & 0xff, compareRegister0 & 0xff,
                outputMode1, 
                (compareRegister1 >> 8) & 0xff, compareRegister1 & 0xff, 
                inputDividerEX
            ]);

    };

    /***
     * Power sub-module implementation
     ***/
    var Power_Interface = function() 
    {
    };
    
    Power_Interface.prototype = new ICommInterface();
    
    Power_Interface.prototype.control = function(u2a, settings)
    {
        var v33power = settings['V3.3'] ? 1 : 0;
        var v50power = settings['V5.0'] ? 1 : 0;
        var vadjpower = settings['Vadj'] ? 1 : 0;
        u2a.sendCommandPacket(Command.Cmd_Power_Enable, [ v33power, v50power, vadjpower, 0 ]);
        return u2a.u2aPower_ReadStatus().then(function(status) 
        {
            if ((status & 7) !== 0)
            {
                throw 'USB2ANY power fault detected for ' + (status & 1) ? '3.3V.' : (status & 2) ? '5.0V.' : 'Vadj.';
            }
        });
    };
    
    var computeParity = function(data, bits)
    {
        var parity = 0;
        bits = bits || 8;
        for (var i = 0; i < bits; i++)
        {
            parity = parity ^ (data & 1);
            data = data >> 1;
        }
        return parity;
    };
    
    /***
     * SPI Interface sub-module definition
     ***/

    var SPI_Interface = function(settings) 
    {
        var dataBits = settings.dataBits !== undefined ? settings.dataBits : 8;
        this.dataBitsMask = (1 << dataBits) -1;
        this.dataBitsOffset = settings.dataBitsOffset || 0;
        
        var addrsBits = settings.addrsBits !== undefined ? settings.addrsBits : 6;
        this.addrsBitsMask = (1 << addrsBits) - 1;
        this.addrsBitsOffset = settings.addrsBitsOffset || 8;
        
        var parityMap = { "even": 0, "odd": 1 };
        if (settings.parity)
        {
            this.parity = parseStringProperty('parity', settings.parity || 'even', parityMap);
        }
        this.parityBitsOffset = settings.parityBitsOffset || 0;
        
        var bitSize;
        this.writeFlag = 0;
        this.readFlag = 0;
        if (settings.readBitOffset !== undefined)
        {
            bitSize = settings.readBitOffset;
            this.readFlag = 1 << bitSize;
        }
        else if (settings.writeBitOffset !== undefined)
        {
            bitSize = settings.writeBitOffset;
            this.writeFlag = 1 << bitSize;
        }
        else
        {
            bitSize = 14;
            this.writeFlag = 1 << bitSize;
        }
        
        this.readWriteData = [0];
        bitSize = Math.max(bitSize, 
                    addrsBits + this.addrsBitsOffset, dataBits + this.dataBitsOffset, this.parityBitsOffset);
        var size = 0;
        for(var i = 0; i < bitSize; i += 8)
        {
            this.readWriteData.push(0);
            size++;
        }
        this.readWriteData[0] = size;
        
        var shift = this.dataBitsOffset;
        var mask = this.dataBitsMask;
        var parity = this.parity;
        
        this._getResult = function(data) 
        {
            var command = getResult(data);
            if (parity !== undefined && parity !== computeParity(command, size * 8))
            {
                throw "parity error on register data received";
            }
            return (command >>> shift) & mask;
        };
    };
    
    SPI_Interface.prototype = new ICommInterface();
    
    SPI_Interface.prototype.control = function(u2a, settings)
    {
        var clockPhaseMap = { "following": 0, "first": 1 };
        var clockPolarityMap = { "low": 0, "high": 1 };
        var bitDirectionMap = { "lsb": 0, "msb": 1 };
        var latchTypeMap = { "byte": 0, "packet": 1, "word": 2, "no_cs": 3, "pulse_after_packet": 255 };
        var latchPolarityMap = { "high": 0, "low": 1 };
        
        var clockPhase = parseStringProperty('clockPhase', settings.clockPhase || 'first', clockPhaseMap);
        var clockPolarity = parseStringProperty('clockPolarity', settings.clockPolarity || 'low', clockPolarityMap);
        var bitDirection = parseStringProperty('bitDirection', settings.bitDirection || 'MSB', bitDirectionMap);
        var characterLength = 8 - parseNumberProperty('characterLength', settings.characterLength || 8, 7, 8);
        var latchType = parseStringProperty('latchType', settings.latchType || 'packet', latchTypeMap);
        var latchPolarity = parseStringProperty('latchPolarity', settings.latchPolarity || 'low', latchPolarityMap);
        
        var divider = settings.clockDivider || 1;
        var dividerHigh = (divider >>> 8 ) & 0xFF;
        var dividerLow = divider & 0xFF;
        
        u2a.sendCommandPacket(Command.Cmd_SPI_Control,
        [
            clockPhase, clockPolarity, bitDirection, characterLength, latchType, latchPolarity, dividerHigh, dividerLow
        ]);
    };

    SPI_Interface.prototype.read = function(u2a, info, registerModel, coreIndex)
    {
        var command = this.readFlag | (((info.addr || 0) & this.addrsBitsMask) << this.addrsBitsOffset);
        if (this.parity !== undefined)
        {
            var parity = this.parity ^ computeParity(command, this.readWriteData[0] * 8);
            command = command | (parity << this.parityBitsOffset);
        }
        
        setBytes(this.readWriteData, this.readWriteData[0], command, 1);
        
        return u2a.readResponse(u2a.sendCommandPacket(Command.Cmd_SPI_WriteAndRead, this.readWriteData)).then(this._getResult);
    };
    
    SPI_Interface.prototype.write = function(u2a, info, value, registerModel, coreIndex)
    {
        var command = this.writeFlag | 
                        (((info.addr || 0) & this.addrsBitsMask) << this.addrsBitsOffset) |
                        ((value & this.dataBitsMask) << this.dataBitsOffset);
                        
        if (this.parity !== undefined)
        {
            var parity = this.parity ^ computeParity(command,  this.readWriteData[0] * 88);
            command = command | (parity << this.parityBitsOffset);
        }
        
        setBytes(this.readWriteData, this.readWriteData[0], command, 1);
        u2a.sendCommandPacket(Command.Cmd_SPI_WriteAndRead, this.readWriteData);
        return writePromise;
    };

    /***
     * DisplayScale Interface sub-module definition
     ***/
    var DisplayScale_Interface = function(settings, registerModel) 
    {
    };

    DisplayScale_Interface.prototype = new ICommInterface();
    
    DisplayScale_Interface.prototype.control = function(u2a, settings)
    {
        var speed = parseNumberProperty('speed', settings.speed || 100);
        var options = parseNumberProperty('options', settings.options || 0, 0, 2);

        if (speed !== 15 && speed !== 50 && speed !== 100) {
            throw "Invalid value for speed. Value must be 15, 50 or 100.";
        }

        u2a.sendCommandPacket(Command.Cmd_DisplayScale_Set, 
            [
                (options >> 8) & 0xff,
                options & 0xff,
                (speed >> 8) & 0xff,
                speed & 0xff
            ]);
    };

    DisplayScale_Interface.prototype.read = function(u2a, info, registerModel, coreIndex)
    {
        return u2a.readResponse(u2a.sendCommandPacket(Command.Cmd_DisplayScale_ReadReg, [info.addr & 0xff])).then(getResult);
    };

    DisplayScale_Interface.prototype.write = function(u2a, info, value, registerModel, coreIndex)
    {
        var writeData = [info.addr & 0xff, value & 0xff];
        u2a.sendCommandPacket(Command.Cmd_DisplayScale_WriteReg, writeData);

        return writePromise;
    };

    /***
     * EasyScale Interface sub-module definition
     ***/
    var EasyScale_Interface = function(settings, registerModel) 
    {
        this._registerModel = registerModel;
        this.speed = 0;
        switch (settings.speed) {
            case 50:
                this.speed = 1;
                break;
            case 100:
                this.speed = 2;
                break;
            case 200:
                this.speed = 3;
                break;
            case 400:
                this.speed = 4;
                break;
        }

        this.numBytes = Math.floor(settings.dataBits/8);
        this.numBits = settings.dataBits - 8*this.numBytes;
        this.ack = settings.ack ? 1 : 0;
    };

    EasyScale_Interface.prototype = new ICommInterface();

    EasyScale_Interface.prototype.initSymbolsForDevice = function(settings, registerModel)
    {
        if (settings.hasOwnProperty('bindName')) {
            var registerInfo = {
                comm: undefined, 
                uri: 'u2a.easyscale.' + settings.bindName,
                type: 'nonvolatile'
            };

            registerModel.addPseudoRegister(registerInfo.uri, registerInfo);
        }
    };

    EasyScale_Interface.prototype.control = function(u2a, settings)
    {
        if (settings.hasOwnProperty('bindName'))
        {
            this._registerModel.getRegisterInfo('u2a.easyscale.' + settings.bindName).comm = this;
        }

        var upperThreshold = parseNumberProperty('upperThreshold', settings.upperThreshold || 0, 0, 3.3);
        var lowerThreshold = parseNumberProperty('lowerThreshold', settings.lowerThreshold || 0, 0, 3.3);

        var upperHex = Math.round((upperThreshold / 3.3) * 255);
        var lowerHex = Math.round((lowerThreshold / 3.3) * 255);

        u2a.sendCommandPacket(Command.Cmd_EasyScale_Control, [upperHex, lowerHex]);
    };

    EasyScale_Interface.prototype.read = function(u2a, info, registerModel, coreIndex)
    {
        return u2a.readResponse(u2a.sendCommandPacket(Command.Cmd_EasyScale_Read, [this.speed, this.numBytes, this.numBits])).then(getResult);
    };

    EasyScale_Interface.prototype.write = function(u2a, info, value, registerModel, coreIndex)
    {
        var writeData = [];
        var valueBytes = [];
        var valueNumBytes = value.toString(16).length/2;
        // Split the value into an array of bytes
        setBytes(valueBytes, valueNumBytes, value, 0);

        // Write data should contain the following:
        // [numBytes, value[0:numBytes]..., numBits, value[numBytes:numBytes+numBits]..., speed, ack]
        writeData.push(this.numBytes);
        for(var i = 0; i < this.numBytes + this.numBits; i++) {
            if (i === this.numBytes) {
                writeData.push(this.numBits);
            }
            writeData.push(valueBytes[i] ? valueBytes[i] : 0);
        }
        writeData.push(this.speed);
        writeData.push(this.ack);

        u2a.sendCommandPacket(Command.Cmd_EasyScale_Write, writeData);

        return writePromise;
    };

    /***
     * ADC Interface sub-module definition
     ***/
    var ADC_Interface = function(settings, registerModel) 
    {
    };

    ADC_Interface.prototype = new ICommInterface();

    ADC_Interface.prototype.initSymbolsForDevice = function(settings, registerModel)
    {
        this._registerModel = registerModel;
        var registerInfo = {
            comm: undefined,
            uri: 'u2a.adc.read',
            type: 'nonvolatile'
        }
        // pseudo reg used to trigger ADC read
        registerModel.addPseudoRegister(registerInfo.uri, registerInfo);
    };

    ADC_Interface.prototype.control = function(u2a, settings)
    {
        this._registerModel.getRegisterInfo('u2a.adc.read').comm = this;

        this.interval = parseNumberProperty('interval', settings.interval || 1000, 5, 32767);
        this.samples = parseNumberProperty('samples', settings.samples || 1, 1);
        this.enabledChannels = [];
        for(var i = 0; i < 4; i++)
        {
            if (settings['adc' + i])
                this.enabledChannels.push(i);
        }

        var nChannel = (settings['adc0'] ? 1:0) | (settings['adc1'] ? 2:0) | (settings['adc2'] ? 4:0) | (settings['adc3'] ? 8:0);
        var voltageReferenceMap = {"1v5": 0, "2v5": 1, "3v3": 2, "external": 3};
        var vref = parseStringProperty('voltageReference', settings.voltageReference || '2V5', voltageReferenceMap);
        
        // Enable/disable specified ADC channels - ADC_Enable(nChannel, nMode)
        // Set reference voltage used for ADC conversion - ADC_SetReference(vRef)
        return u2a.readResponse(u2a.sendCommandPacket(Command.Cmd_ADC_Enable, [nChannel, 2])).then(function() {
            return u2a.readResponse(u2a.sendCommandPacket(Command.Cmd_ADC_SetReference, [vref]));
        }.bind(this));
    };

    ADC_Interface.prototype.read = function(u2a, info)
    {
        this.acquiredData = [];

        // Trigger ADC conversions on the enabled channels - ADC_Acquire(interval1, interval2, interval3, numSamples1, numSamples2)
        u2a.sendCommandPacket(Command.Cmd_ADC_Acquire, [
            (this.interval >> 16) & 0xff,
            (this.interval >> 8) & 0xff, 
            this.interval & 0xff,
            (this.samples >> 8) & 0xff,
            this.samples & 0xff
        ]);

        return Q.resolve();
    }

    ADC_Interface.prototype.write = function(u2a, info, value)
    {
        // do nothing
        return writePromise;
    }

    ADC_Interface.prototype.rxADCData = function(target, data)
    {
        if (!this.acquiredData)
            return;

        this.acquiredData = this.acquiredData.concat(data);

        // Expected total payload length = 2 bytes/sample * numSamples * numChannels
        if (this.acquiredData.length === 2 * this.samples * this.enabledChannels.length)
        {
            var channel = 0;
            var result = {};
            for (var i = 0; i < this.acquiredData.length; i+=2)
            {
                var adcChannel = 'adc' + this.enabledChannels[channel];
                result[adcChannel] = result[adcChannel] ? result[adcChannel] : [];
                result[adcChannel].push((this.acquiredData[i+1] << 8) | this.acquiredData[i]);
                channel = (channel+1) >= this.enabledChannels.length ? 0 : channel+1; 
            }

            target(result);
        }
    }

    /***
     * Interrupt Interface sub-module definition
     ***/
    var Interrupt_Interface = function(settings, registerModel) 
    {
        this._registerModel = registerModel;
    };

    Interrupt_Interface.prototype = new ICommInterface();

    Interrupt_Interface.prototype.NUM_CHANNELS = 4;
    Interrupt_Interface.prototype.MAP_CONFIG_PINFUNCTION = 
    {
        '': 0, // default: no change
        'falling': 1, // enabled on falling edge
        'rising': 2, // enabled on rising edge
        'disabled': 3 // interrupt pin disabled
    };
    Interrupt_Interface.prototype.PSEUDOREG_PREFIX = 'u2a.interrupt.checkreceived.int';
    Interrupt_Interface.prototype.PSEUDOREG_RESET_SUFFIX = 'reset';

    Interrupt_Interface.prototype.initSymbolsForDevice = function(settings, registerModel) {
        for (let i = 0; i < this.NUM_CHANNELS; i++)
        {
            let registerInfo = {
                comm: undefined, 
                uri: this.PSEUDOREG_PREFIX + i,
                type: 'readonly'
            };
            // pseudo register to read interrupt count on this pin
            registerModel.addPseudoRegister(registerInfo.uri, registerInfo);

            registerInfo = {
                comm: undefined, 
                uri: this.PSEUDOREG_PREFIX + i + this.PSEUDOREG_RESET_SUFFIX,
                type: 'readonly'
            };
            // pseudo register to read interrupt count on this pin, and then reset count to zero
            registerModel.addPseudoRegister(registerInfo.uri, registerInfo);
        }
    };

    Interrupt_Interface.prototype.control = function(u2a, settings)
    {   
        for (let i = 0; i < this.NUM_CHANNELS; i++)
        {
            this._registerModel.getRegisterInfo(this.PSEUDOREG_PREFIX + i).comm = this;
            this._registerModel.getRegisterInfo(this.PSEUDOREG_PREFIX + i + this.PSEUDOREG_RESET_SUFFIX).comm = this;
        }

        // set pin functions: send command to U2A controller
        const payload = [];
        for (let i = 0; i < this.NUM_CHANNELS; i++)
        {
            let configState = settings['int' + i + '_state'];
            if (!this.MAP_CONFIG_PINFUNCTION.hasOwnProperty(configState)) // invalid or undefined
            {
                configState = ''; // default: no change
            }
            const pinFunction = parseStringProperty('interruptPinState', configState, this.MAP_CONFIG_PINFUNCTION);
            payload.push(pinFunction);
        }
        return u2a.readResponse(u2a.sendCommandPacket(Command.Cmd_Interrupt_Control, payload)).then(function(response) {
            return response;
        }.bind(this));
    };

    Interrupt_Interface.prototype.read = function(u2a, registerInfo, registerModel, coreIndex) {
        if (registerInfo && registerInfo.uri && registerInfo.uri.indexOf(this.PSEUDOREG_PREFIX) === 0) {
            let uriRemaining = registerInfo.uri.slice(this.PSEUDOREG_PREFIX.length);
            const reset = uriRemaining.endsWith(this.PSEUDOREG_RESET_SUFFIX) ? 1 : 0;
            if (reset) {
                uriRemaining = uriRemaining.slice(0, uriRemaining.length - this.PSEUDOREG_RESET_SUFFIX.length);
            }
            const pin = parseInt(uriRemaining);

            if (isNaN(pin) || pin < 0 || pin >= this.NUM_CHANNELS) {
                return Q.reject('Interrupt interface cannot read invalid pin: INT' + pin);
            }

            // send checkReceived command to read interrupt count of pin, and reset count if needed
            return u2a.readResponse(u2a.sendCommandPacket(Command.Cmd_Interrupt_Received, [pin, reset])).then(function(response) {
                return getResult(response);
            }.bind(this));
        }
        else {
            return Q.reject('Interrupt interface cannot read unrecognized register: ' + (registerInfo && registerInfo.uri));
        }
    };

    Interrupt_Interface.prototype.write = function(u2a, registerInfo, value, registerModel, coreIndex) {
        // do nothing
        return writePromise;
    };
    
    /***
     * SMBus Interface sub-module definition
     ***/

    var SMBus_Interface = function(settings, registerModel, u2a)
    {
        this._registerModel = registerModel;

        this.u2a = u2a;

        var dataEndian = settings.dataEndian;
        dataEndian = typeof dataEndian === 'string' ? dataEndian.trim().toLowerCase() : '';
        if(dataEndian === 'little') {
            this._setBytes = setBytesLSB;
            this._getResult = getResultLSB;
        } else {
            this._setBytes = setBytes;
            this._getResult = getResult;
        }
    };

    SMBus_Interface.prototype = new ICommInterface();

    SMBus_Interface.prototype.control = function(u2a, settings)
    {
        var regAddrSize = parseInt(settings.regAddrSize);
        regAddrSize = isNaN(regAddrSize) ? 1 : regAddrSize;
        regAddrSize = (regAddrSize >= 0 && regAddrSize <= 2) ? regAddrSize : 1;
        this.regAddrSize = regAddrSize;

        var pec = 1; // No CRC support

        u2a.sendCommandPacket(Command.Cmd_SMBUS_Control,
        [
            pec
        ]);
    };

    SMBus_Interface.prototype.initSymbolsForDevice = function(settings, registerModel)
    {
        registerModel.readDeviceAddrsMap('SMBus', settings);
    };

    SMBus_Interface.prototype.read = function(u2a, info, registerModel, coreIndex) {

        // Dev Addr Arr
        var devAddrArr = [0, 0];
        setDeviceAddress(registerModel, devAddrArr, info);

        // No. of Regs Arr
        var noOfRegArr = [0x00, 0x00], nBytes = info.nBytes ? info.nBytes : 1;
        noOfRegArr[0] = (nBytes & 0xFF00) >> 8;
        noOfRegArr[1] = nBytes & 0xFF;

        // Reg Addr Arr
        var regAddrArr = [], noOfShifts;
        for(var i=0; i<this.regAddrSize; i++) {
            noOfShifts = 8 * (this.regAddrSize - i -1);
            regAddrArr[i] = (info.addr & (0xFF << noOfShifts)) >> noOfShifts;
        }

        var data = [];
        data.push.apply(data, devAddrArr);
        data.push(this.regAddrSize);
        data.push.apply(data, noOfRegArr);
        data.push.apply(data, regAddrArr);

        return u2a.readResponse(u2a.sendCommandPacket(Command.Cmd_I2C_ReadInternal, data))
        .then(this._getResult);

    };

    SMBus_Interface.prototype.write = function(u2a, info, value, registerModel, coreIndex) {

        // Dev Addr Arr
        var devAddrArr = [0, 0];
        setDeviceAddress(registerModel, devAddrArr, info);

        // Reg Addr Arr
        var regAddrArr = [], noOfShifts;
        for(var i=0; i<this.regAddrSize; i++) {
            noOfShifts = 8 * (this.regAddrSize - i -1);
            regAddrArr[i] = (info.addr & (0xFF << noOfShifts)) >> noOfShifts;
        }

        // Value Arr
        var valueArr = [], noOfShifts;
        var noOfBytes = info.nBytes ? info.nBytes : 1;
        this._setBytes(valueArr, noOfBytes, value, 0);

        var data = [];
        data.push.apply(data, devAddrArr);
        data.push(noOfBytes + this.regAddrSize);
        data.push.apply(data, regAddrArr);
        data.push.apply(data, valueArr);

        return u2a.readResponse(u2a.sendCommandPacket(Command.Cmd_I2C_Write, data));

    };

    /***
     * Unknown sub-modules implementation that shows error meessages
     ***/
    
    var UnknownCommInterface = function() 
    {
    };
    
    UnknownCommInterface.prototype = new ICommInterface();
    
    UnknownCommInterface.prototype.read = function(u2a, info, registerModel, coreIndex)
    {
        var deviceName = info && info.parentGroup && info.parentGroup.parentDevice && info.parentGroup.parentDevice.info && info.parentGroup.parentDevice.info.name;
        throw "Unknow usb2any i/f for device " + deviceName;
    };
    
    UnknownCommInterface.prototype.write = UnknownCommInterface.prototype.read;

    /***
     * USB2ANY packet codec implementation
     ***/
    
    var USB2ANY = function()
    {
        gc.databind.AbstractMessageBasedCodec.call(this, 'USB2ANY');
        this.numPacketsReceived = 0;
        this._packetErrorCount = 0;
    };

    USB2ANY.prototype = new gc.databind.AbstractMessageBasedCodec('USB2ANY');

    USB2ANY.prototype._analytics_info = {};

    USB2ANY.prototype._send_analytics = function(data) 
    {
        if (!this._analytics_info.action) 
        {
			return;
		}
        var req = new XMLHttpRequest();
        req.open('POST', '/analytics');
        req.setRequestHeader("Content-Type", "application/json");
        // add viewurl, appname, action here
        var x = 
        {
            action: this._analytics_info.action,
            data: Object.assign({}, this._analytics_info.data, data)
        };
        req.send(JSON.stringify(x));
    };

    USB2ANY.prototype.initSymbolsForDevice = function(config, registerModel)
    {
        // save registerModel in config for use later.
        config._registerModel = registerModel;

        try {
            var pathname = window.location.pathname.replace(/(^\/)|(\/$)/g, '');
            var desktop = gc.desktop && gc.desktop.isDesktop();
            var x = 'gallery/view/';
            if (desktop === false && pathname && pathname.indexOf(x) === 0) 
            {
                this._analytics_info.action = 'gc_app_aevm_usb2any';
                x = pathname.slice(x.length).split('/');
                this._analytics_info.data = 
                {
                    view_url: window.location.href,
                    app_owner: x[0],
                    app_name: x[1],
                    app_ver: x.length >= 3 ? x[3] : '1.0.0'
                };
            }
        } 
        catch (e) 
        {
        }
        
        var interfaces = config.interfaceList;
        if (interfaces)
        {
            for(var j = 0; j < interfaces.length; j++)
            {
                var interfaceSettings = interfaces[j];
                var name = interfaceSettings.name;
                if (name)
                { 
                    name = name.toLowerCase();
                    switch(name)
                    {
                        case 'power':
                            Power_Interface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                            break;
                        case 'i2c':
                            I2C_Interface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                            break;
                        case 'spi':
                            SPI_Interface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                            break;
                        case 'gpio':
                            GPIO_Interface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                            break;
                        case 'uart':
                            UART_Interface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                            break;
                        case 'pwm':
                            PWM_Interface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                            break;
                        case 'displayscale':
                            DisplayScale_Interface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                            break;
                        case 'easyscale':
                            EasyScale_Interface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                            break;
                        case 'adc':
                            ADC_Interface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                            break;
                        case 'interrupt':
                            Interrupt_Interface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                            break;
                        case 'smbus':
                            SMBus_Interface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                            break;
                        default:
                            var customCommInterface = this[name.toUpperCase()+'_Interface'];
                            if (typeof customCommInterface === 'function')
                            {
                                if (customCommInterface.prototype && customCommInterface.prototype.initSymbolsForDevice)
                                {
                                    customCommInterface.prototype.initSymbolsForDevice(interfaceSettings, registerModel);
                                }
                            }
                            else 
                            {
                                console.error('The interface named "' + name + '" in the system-info-file is not supported.  Please remove this entry and try again.');
                            }
                    }
                }
                else
                {
                    console.error('Missing "name" entry in InterfaceList[' + j + '], of configuration "' + config.name + ' within the system-info-file.');  
                }
            }
        }
    };
    
    USB2ANY.prototype.checkFirmware = function(info, behaviorControl) { // Ask Paul - put this as a base method in AbstractMessageBasedCode, IPollingPacketCode, or IPacketCode?
        var promises = [];
        for (x in firmwareChecks) {
            promises.push(firmwareChecks[x](info, behaviorControl));
        }
        return Q.all(promises);
    };

    USB2ANY.prototype.connect = function(settings, behaviorControl)
    {
        settings = settings instanceof Array ? settings : [ settings ];
        gc.databind.AbstractMessageBasedCodec.prototype.connect.call(this, settings);
        
        var that = this;
        this._interfaceMap = {};
        
        // There was one timout for the entire connect sequence (u2aOpen, Interface(s).control ).
        // Since checkFirmware will wait for user's input, it should have no timeout. Hence u2aOpen has one timeout,
        // and the sequence of Interface(s).control has another timeout.
        return this.u2aOpen().timeout(250, "No response from USB2ANY controller.").then(function()
        {
            // Let the logic compare version, prompt user and wait for user's decision, and update firmware if needed. Hence there is no timeout.
            return that.checkFirmware({detectedFirmwareVersion: that.version, modelID: settings.length && settings[0]._registerModel._id, codec: that, controller: 'usb2any'}, behaviorControl);
        }).then(function()
        {
            var timeoutInMs = 1000;
            that.sendCommandPacket(Command.Cmd_LED_SetState, [2, 0]);  // turn on the green LED
            
            var defaultInterface = new UnknownCommInterface();
            that._comm = defaultInterface;
            var promises = [];
            for(var i = 0; i < settings.length; i++ )
            {
                var config = settings[i];
                config._comm = defaultInterface;
                var interfaces = config.interfaceList;
                if (config.connection_timeout && (config.connection_timeout > timeoutInMs)) {
                    timeoutInMs = config.connection_timeout;
                }
                that.maxOutstandingCommands = parseNumberProperty('maxOutstandingCommands', config.maxOutstandingCommands || that.maxOutstandingCommands, 1);

                if (interfaces)
                {
                    for(var j = 0; j < interfaces.length; j++)
                    {
                        var interfaceSettings = interfaces[j];
                        var name = interfaceSettings.name;
                        if (name)
                        { 
                            var commInterface;
                            
                            name = name.toLowerCase();
                            var id = interfaceSettings.id || name;
                            switch(name)
                            {
                                case 'power':
                                    that._interfaceMap[id] = commInterface = new Power_Interface(interfaceSettings, config._registerModel);
                                    break;
                                case 'i2c':
                                    that._interfaceMap[id] = that._comm = config._comm = commInterface = new I2C_Interface(interfaceSettings, config._registerModel, that);
                                    commInterface.crcUser = that._crcUsers[id];
                                    break;
                                case 'spi':
                                    that._interfaceMap[id] = that._comm = config._comm = commInterface = new SPI_Interface(interfaceSettings, config._registerModel);
                                    break;
                                case 'gpio':
                                    that._interfaceMap[id] = commInterface = new GPIO_Interface(interfaceSettings, config._registerModel);
                                    break;
                                case 'uart':
                                    that._interfaceMap[id] = that.uartInterface = that._comm = config._comm = commInterface = new UART_Interface(interfaceSettings, config._registerModel);
                                    break;
                                case 'pwm':
                                    that._interfaceMap[id] = commInterface = new PWM_Interface(interfaceSettings, config._registerModel);
                                    break;
                                case 'displayscale':
                                    that._interfaceMap[id] = that._comm = config._comm = commInterface = new DisplayScale_Interface(interfaceSettings, config._registerModel);
                                    break;
                                case 'easyscale':
                                    that._interfaceMap[id] = commInterface = new EasyScale_Interface(interfaceSettings, config._registerModel);
                                    break;
                                case 'adc':
                                    that._interfaceMap[id] = that.adcInterface = commInterface = new ADC_Interface(interfaceSettings, config._registerModel);
                                    break;
                                case 'interrupt':
                                    that._interfaceMap[id] = commInterface = new Interrupt_Interface(interfaceSettings, config._registerModel);
                                    break;
                                case 'smbus':
                                    that._interfaceMap[id] = that._comm = config._comm = commInterface = new SMBus_Interface(interfaceSettings, config._registerModel, that);
                                    break;
                                default:
                                    var customCommInterface = that[name.toUpperCase()+'_Interface'];
                                    if (typeof customCommInterface === 'function')
                                    {
                                        that._interfaceMap[id] = that._comm = config._comm = commInterface = new customCommInterface(interfaceSettings, config._registerModel);
                                    }
                                    else
                                    {
                                        throw 'The interface named "' + name + '" in the system-info-file is not supported.  Please remove this entry and try again.';
                                    }
                            }
                            promises.push(Q(commInterface.control(that, interfaceSettings)));
                        }
                        else
                        {
                            throw 'Missing "name" entry in InterfaceList[' + i + '], of configuration "' + config.name + ' within the system-info-file.';  
                        }
                    }
                }
            }
            
            return Q.all(promises).timeout(timeoutInMs, "No response from USB2ANY controller.");
        });
    };

    USB2ANY.prototype.disconnect = function()
    {
		gc.databind.AbstractMessageBasedCodec.prototype.disconnect.call(this);

		if (this.m_bPacketSeqNum === undefined) 
		{
			this.m_bPacketSeqNum = 1;
		}
        this.rxRecivedPacketSeqNo = 0;
        this._packetErrorCount = 0;
        this.nControllerType = CTRLR_UNKNOWN;
    };

    USB2ANY.prototype.sendControlCommand = function(id, settings, registerModel) 
    {
        var _comm = this._interfaceMap[id];
        if(_comm)
        {
            _comm.control(this, settings);
        }
    };
    
    USB2ANY.prototype._crcUsers = {};
    USB2ANY.prototype.register_crc_user = function(impl, name)
    {
        this._crcUsers[name] = impl;
    };

    var firmwareChecks = {};
    USB2ANY.registerFirmwareCheck = function(impl, name)
    {
        firmwareChecks[name] = impl; // impl: function(info) -> Q.Promise
    };

    USB2ANY.prototype.getInterfaces = function()
    {
        return this._interfaceMap;
    };

    USB2ANY.prototype.readValue = function(registerInfo, registerModel, coreIndex)
    {
        var _comm = registerInfo.comm || (registerModel && registerModel._comm) || this._comm;
        if (_comm !== null) 
        {
            return _comm.read(this, registerInfo, registerModel, coreIndex);
        } 
        else 
        {
            return Q.reject('Cannot read value for undefined USB2ANY interface.');
        }
    };
    
    USB2ANY.prototype.multiRegisterRead = function(startRegisterInfo, count, registerModel, coreIndex)
    {
        var _comm = startRegisterInfo.comm || (registerModel && registerModel._comm) || this._comm;
        if (_comm !== null) 
        {
            if (_comm && _comm.sequentialRead) 
            {
                return _comm.multiRegisterRead(this, startRegisterInfo, count, registerModel, coreIndex);
            }
            else
            {
                return this.doMultiRegisterRead(startRegisterInfo, count, registerModel, coreIndex);
            }
        }
        else 
        {
            return Q.reject('Cannot read register values for undefined USB2ANY interface.');
        }
    };

    USB2ANY.prototype.writeValue = function(registerInfo, value, registerModel, coreIndex)
    {
        var _comm = registerInfo.comm || (registerModel && registerModel._comm) || this._comm;
        if (_comm !== null) 
        {
            this._send_analytics(
            {
                action: 'write_register',
                reg_name: registerInfo.name,
                reg_addr: registerInfo.addr,
                reg_value: value
            });
            return _comm.write(this, registerInfo, value, registerModel, coreIndex);
        } 
        else 
        {
            return Q.reject('Cannot write value for undefined USB2ANY interface.');
        }
    };

    USB2ANY.prototype.decode = function(target, rawData)
    {
        try
        {
            var nRead = rawData.length;
            
            if (nRead < PACKET_HEADER_SIZE)
            {
                this._packetErrorCount++;
                throw getErrorString(ERR_BAD_PACKET_SIZE);
            }
            if (rawData[PACKET_ID] !== PACKET_IDENTIFIER || rawData[PACKET_PAYLOAD_LEN] > MAX_PAYLOAD)
            {
                // Possible firmware bug causing garbage data to send instead of the expected status packet
                // indicating ADC data is ready. Check if we are using ADC interface before throwing error.
                if (this.adcInterface)
                {
                    // ignore error
                }
                else
                {
                    throw getErrorString(ERR_INVALID_PACKET_HEADER);
                }
            }
            var crc = calculateCRC(rawData, PACKET_PAYLOAD_LEN, rawData[PACKET_PAYLOAD_LEN] + PACKET_HEADER_SIZE);
            if (rawData[PACKET_PEC] !== crc)
            {
                gc.console.warning('USB2ANY', 'ignoring USB2ANY error: ' + getErrorString(ERR_COM_CRC_FAILED));
                return true;
            }
            var cmd = rawData[PACKET_COMMAND];
            var type = rawData[PACKET_TYPE];
            
            if (type === INTERRUPT_PACKET)
            {
                this.onInterruptPacketReceived(target, rawData[PACKET_PAYLOAD], rawData[PACKET_PAYLOAD + 1]);
            }
            else if (type === PAYLOAD_PACKET)
            {
                switch (cmd)
                {
                    case Command.Cmd_ADC_GetStatus:
                        var param = rawData[PACKET_PAYLOAD + 3];
                        if (param !== 0)
                        {
                            // Received ADC_GetStatus packet indicating data is ready
                        }
                        break;
                    case Command.Cmd_ADC_GetData:
                        // Received payload data for ADC_Acquire
                        this.adcInterface.rxADCData(target, getPayload(rawData));
                        break;
                    case Command.Cmd_UART_Read:
                        this.uartInterface.rxUartData(rawData);
                        break;

                    default:
                        this.onPayloadPacketReceived(target, cmd, rawData.slice(PACKET_PAYLOAD), rawData, PACKET_PAYLOAD_LEN, PACKET_PAYLOAD);
                }
            }
            else if (type === REPLY_PACKET)
            {
                this.rxRecivedPacketSeqNo = rawData[PACKET_SEQ_NUM] || this.rxRecivedPacketSeqNo;
                this.addResponse(rawData, rawData[PACKET_COMMAND], rawData[PACKET_SEQ_NUM]);
                this._packetErrorCount = 0;
            }
            else if (type === ERROR_PACKET)
            {
                var errorCode = rawData[PACKET_STATUS];
                var errorMsg = getErrorString(errorCode - 256);
                
                this.rxRecivedPacketSeqNo = rawData[PACKET_SEQ_NUM] || this.rxRecivedPacketSeqNo;
                this.addErrorResponse(errorMsg, rawData[PACKET_COMMAND], rawData[PACKET_SEQ_NUM]);
                if (this._packetErrorCount++ > 0)
                {
                    throw errorMsg;
                }
                gc.console.error('USB2ANY', `error packet received: ${errorMsg} for command ${rawData[PACKET_COMMAND]}, seq# ${rawData[PACKET_SEQ_NUM]}`);
            }
            this.numPacketsReceived++;
            return true;
        }
        catch (e)
        {
            gc.console.error('USB2ANY', 'USB2ANY error: ' + e);
            return false;
        }
        finally 
        {
            gc.databind.AbstractMessageBasedCodec.prototype.decode.call(this, target, rawData);
        }
    };

    USB2ANY.prototype.sendCommandPacket = function(cmd, buffer)
    {
        if (buffer.length > MAX_PAYLOAD)
        {
            throw "Too much payload data for a single packet.";
        }
        if (this.m_bPacketSeqNum === 255) 
        {
            this.m_bPacketSeqNum = 1;   // seq_num 0 is reserved for
                                        // asynchronous packets
        }
        var packet =
        [
            PACKET_IDENTIFIER, 0, buffer.length, COMMAND_PACKET, 0, this.m_bPacketSeqNum++, 0, cmd
        ];
        for (var i = 0; i < buffer.length; i++)
        {
            packet.push(buffer[i]);
        }
        packet[PACKET_PEC] = calculateCRC(packet, PACKET_PAYLOAD_LEN);

        this.encoder(packet);
        return packet;
    };
    
    USB2ANY.prototype.readResponse = function(forPacket)
    {
        return this.addCommand(forPacket[PACKET_COMMAND], forPacket[PACKET_SEQ_NUM]).fail(err => 
        {
            if (err.includes('missing response')) 
            {
                err = 'missing response';
            }
            // retry one time
            gc.console.log('USB2ANY', `Retrying command due to ${err} for command ${forPacket[PACKET_COMMAND]}, seq# ${forPacket[PACKET_SEQ_NUM]}`);
            const retryPacket = this.sendCommandPacket(forPacket[PACKET_COMMAND], forPacket.slice(PACKET_PAYLOAD));
            return this.addCommand(retryPacket[PACKET_COMMAND], retryPacket[PACKET_SEQ_NUM]);
        });
    };

    USB2ANY.prototype.invokeBSL = function()
    {
        return this.readResponse(this.sendCommandPacket(Command.Cmd_InvokeBSL, []));
    };

    USB2ANY.prototype.u2aOpen = function()
    {
        this.sendCommandPacket(Command.Cmd_Status_GetControllerType,[ 0, 0, 0, 0 ]);
        return this.readResponse(this.sendCommandPacket(Command.Cmd_FirmwareVersion_Read, [ 0,0,0,0 ])).then(function(responsePacket)
        {
            var nReceived = responsePacket[PACKET_PAYLOAD_LEN];
            if (nReceived !== VERSION_SIZE_IN_BYTES)
            {
                this.dwFirmwareVersion = 0;
                this.version = 'UNKNOWN';
            }
            else
            {
                this.dwFirmwareVersion = VERSION_TO_DWORD(responsePacket, PACKET_PAYLOAD);
                this.version = responsePacket[PACKET_PAYLOAD] + '.' + responsePacket[PACKET_PAYLOAD + 1] + '.' + responsePacket[PACKET_PAYLOAD + 2] + '.' + responsePacket[PACKET_PAYLOAD + 3];
            }

            return this.readResponse(this.sendCommandPacket(Command.Cmd_Status_GetControllerType,
            [
                0, 0, 0, 0
            ]));
        }.bind(this)).then(function(responsePacket)
        {
            this.nControllerType = responsePacket[PACKET_PAYLOAD];
            switch (this.nControllerType)
            {
                case CTRLR_USB2ANY:
                    this.controllerName = "USB2ANY";
                    break;
                case CTRLR_ONEDEMO:
                    this.controllerName = "OneDemo";
                    break;
                default:
                    this.nControllerType = this.dwFirmwareVersion === 0 ? CTRLR_UNKNOWN : CTRLR_USB2ANY;
                    this.controllerName = this.dwFirmwareVersion === 0 ? "<unknown device?" : "USB2ANY";
                    break;
            }

            if (this.dwFirmwareVersion < MIN_FIRMWARE_REQUIRED)
            {
                this.nControllerType = CTRLR_UNSUPPORTED;
                throw "Unsupported USB2ANY controller";
            }
        }.bind(this));
    };

    USB2ANY.prototype.u2aStatus_GetControllerType = function()
    {
        return this.nControllerType;
    };
    
    var onPowerStatusRead = function(packet)
    {
        return packet[PACKET_PAYLOAD] | (packet[PACKET_PAYLOAD+1] << 1) | (packet[PACKET_PAYLOAD+2] << 2) | (packet[PACKET_PAYLOAD+3] << 3);
    };
    
    USB2ANY.prototype.u2aPower_ReadStatus = function()
    {
        return this.readResponse(this.sendCommandPacket(Command.Cmd_Power_ReadStatus, [0, 0, 0x5a, 0x5a])).then(onPowerStatusRead);
    };
    
    var pingController = function(reason) 
    {
        var that = this;
        return Q.promise(function(resolve, reject) 
        {
            var timer = setTimeout(function() 
                {
                    reject(reason);
                }, 250);
                
            that.readResponse(that.sendCommandPacket(Command.Cmd_FirmwareVersion_Read, [ 0,0,0,0 ])).then(function() 
            {
                clearTimeout(timer);
                resolve(true);
            });
        });
    };
    
    USB2ANY.prototype.isStillConnected = function()
    {
        return gc.databind.AbstractMessageBasedCodec.prototype.isStillConnected.call(this).then(pingController.bind(this));
    };
    
    USB2ANY.prototype.maxOutstandingCommands = 30;
    
    USB2ANY.prototype.shouldPauseTransmission = function(txPacket)
    {
        var seqNo = txPacket[PACKET_SEQ_NUM];
        if (seqNo)  // non zero sequence number
        {
            var diff = seqNo - this.rxRecivedPacketSeqNo;
            if (diff < 0)
            {
                diff += 254; // seqNo = 0, and 0xFF are both reserved and are not used, so don't count when rolling over.
            }
            return diff > this.maxOutstandingCommands; 
        }
    };
    
    USB2ANY.prototype.onInterruptPacketReceived = function(target, interruptId, param) 
    {
        gc.console.debug('USB2ANY', 'Ignoring Interrupt Packet for interupt #' + interruptId);
    };
    
    USB2ANY.prototype.onPayloadPacketReceived = function(target, commandId, payload, rawData, PACKET_PAYLOAD_LEN, PACKET_PAYLOAD)
    {
        gc.console.debug('USB2ANY', 'Ignoring Payload Packet for command #', commandId);
    };
    
    // create a frame decoder for serial USB communication where the frames are not automatically aligned.
    var USB2ANY_FrameDecoder = function() 
    {
    };
    USB2ANY_FrameDecoder.prototype = new gc.databind.AbstractFrameDecoder(PACKET_IDENTIFIER);
    
    USB2ANY_FrameDecoder.prototype.getPacketLength = function(buffer, offset) 
    {
        return buffer.length - offset < PACKET_HEADER_SIZE ? 0 : buffer[offset + PACKET_PAYLOAD_LEN] + PACKET_HEADER_SIZE;
    };

    // register USB2ANY packet codec with optional frame decoder (for use with USB transport, that is not HID).
    gc.databind.registerCustomCodec('USB2ANY', USB2ANY, null, USB2ANY_FrameDecoder);
    
    // add USB2ANY and ICommInterface to the gc.databind public namespace.
    gc.databind.USB2ANY = USB2ANY;
    gc.databind.USB2ANY.ICommInterface = ICommInterface;

}());
