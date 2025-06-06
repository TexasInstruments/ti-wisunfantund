/*
 * Copyright (c) 2016-2018, Arm Limited and affiliates.
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
#include <stdio.h>
#include <stdint.h>
#include <signal.h>
#include <time.h>
#include <unistd.h>
#include <stdbool.h>

#include <pthread.h>
#include <atomic>
#include <chrono>
#include <cmath>

extern "C" {
#include "ns_trace.h"
#define TRACE_GROUP "arm_hal_timer"
}

#include "linux_polling_timer.hpp"


Linux_Polling_Timer* timer;

// Called once at boot, starts the timer thread
void platform_timer_enable(void)
{
    // Initialize our Timer object
    timer = new Linux_Polling_Timer();
}

// Actually cancels a timer, not the opposite of enable
void platform_timer_disable(void)
{
    timer->stop();
}

// Not called while running, fortunately
void platform_timer_set_cb(void (*new_fp)(void))
{
    timer->set_cb(new_fp);
}

// This is called from inside hal_layer_timer_enter_critical - IRQs can't happen
void platform_timer_start(uint16_t slots)
{
    timer->start(slots);
}

// This is called from inside hal_layer_timer_enter_critical - IRQs can't happen
uint16_t platform_timer_get_remaining_slots(void)
{
    return timer->get_remaining_slots();
}

