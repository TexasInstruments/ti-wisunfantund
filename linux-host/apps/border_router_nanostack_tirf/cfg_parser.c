/*
 * Copyright (c) 2016 ARM Limited. All rights reserved.
 */

#include <string.h>
#include "cfg_parser.h"
#include "ini_file.h"
#include "stream_uart.h"

/******************************************************************************
 Global Variables
 *****************************************************************************/
extern struct uart_cfg  uart_cfg;


/******************************************************************************
 Function definitions
 *****************************************************************************/
const char *cfg_string(conf_t *conf, const char *key, const char *default_value)
{
    for (; (conf && conf->name); conf++) {
        if (0 == strcmp(conf->name, key)) {
            return conf->svalue;
        }
    }
    return default_value;
}

int cfg_int(conf_t *conf, const char *key, int default_value)
{
    for (; (conf && conf->name); conf++) {
        if (0 == strcmp(conf->name, key)) {
            return conf->ivalue;
        }
    }
    return default_value;
}

/*!
 * @brief Handle any config file settings for the uart.
 *
 * @param pINI - ini file parse info
 * @param handled - set to true if the item was handled
 * @return 0 success, -1 error
 */
static int my_UART_INI_settings(struct ini_parser *pINI, bool *handled)
{
    int r;

    r = 0;
    if(INI_itemMatches(pINI, "uart-cfg", NULL))
    {
        r = UART_INI_settingsOne(pINI, handled, &uart_cfg);
    }
    return r;
}

/* Callback for parsing the INI file. */
static int cfg_callback(struct ini_parser *pINI, bool *handled)
{
    int x;
    int r;

    static ini_rd_callback * const ini_cb_table[] = {
        my_UART_INI_settings,
        /* Terminate list */
        NULL
    };

    for(x = 0 ; ini_cb_table[x] ; x++)
    {
        r = (*(ini_cb_table[x]))(pINI, handled);
        if(*handled)
        {
            return r;
        }
    }
    /* Let the system handle it */
    return 0;
}

int parse_cfg_file(int _argc, char **_argv)
{
    int r;
    int x;

    /* Read all configuration files */
    for( x = 1 ; x < _argc ; x++ ){
        r = INI_read(_argv[x], cfg_callback, 0);
        if(r != 0)
        {
            return(-1);
        }
    }

    //all good
    return(0);
}