/*
 * Copyright (c) 2018-2019, Arm Limited and affiliates.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
#include "ns_types.h"
#include "fhss_api.h"
#include "fhss_config.h"
#include "ns_trace.h"
#include "platform/arm_hal_interrupt.h"

#define TRACE_GROUP "fhdr"
#ifndef NUMBER_OF_SIMULTANEOUS_TIMEOUTS
#define NUMBER_OF_SIMULTANEOUS_TIMEOUTS  2
#endif //NUMBER_OF_SIMULTANEOUS_TIMEOUTS

/* convert slots to ticks */
#define US_PER_SLOT 50

typedef void (*fhss_timer_callback_t)(const fhss_api_t *fhss_api, uint16_t);

typedef struct {
} fhss_timeout_s;

static fhss_timeout_s fhss_timeout[NUMBER_OF_SIMULTANEOUS_TIMEOUTS] = {};
static fhss_api_t *fhss_active_handle;
static bool timer_initialized = false;

static uint32_t read_current_time(void)
{
    return 0;
}

static fhss_timeout_s *find_timeout(void (*callback)(const fhss_api_t *api, uint16_t))
{
    return NULL;
}

static fhss_timeout_s *allocate_timeout(void)
{
    return NULL;
}

static void fhss_timeout_handler(void)
{

}

static void timer_callback(void)
{
#if 1 //MBED_CONF_NANOSTACK_HAL_CRITICAL_SECTION_USABLE_FROM_INTERRUPT
    fhss_timeout_handler();
#else
    equeue->call(fhss_timeout_handler);
#endif
}

static int platform_fhss_timer_start(uint32_t slots, void (*callback)(const fhss_api_t *api, uint16_t), const fhss_api_t *callback_param)
{
    int ret_val = -1;
    return ret_val;
}

static int platform_fhss_timer_stop(void (*callback)(const fhss_api_t *api, uint16_t), const fhss_api_t *api)
{
    return 0;
}

static uint32_t platform_fhss_get_remaining_slots(void (*callback)(const fhss_api_t *api, uint16_t), const fhss_api_t *api)
{
    return 0;
}

static uint32_t platform_fhss_timestamp_read(const fhss_api_t *api)
{
    return 0;
}

fhss_timer_t fhss_functions = {
    .fhss_timer_start = platform_fhss_timer_start,
    .fhss_timer_stop = platform_fhss_timer_stop,
    .fhss_get_remaining_slots = platform_fhss_get_remaining_slots,
    .fhss_get_timestamp = platform_fhss_timestamp_read,
    .fhss_resolution_divider = 1
};

