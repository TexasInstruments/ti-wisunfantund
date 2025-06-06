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

#include <arm_hal_interrupt.h>
#include <pthread.h>
#include <stdio.h>
#include <string.h>

#include <mutex>

std::recursive_mutex mutex;

volatile uint32_t enter_critical_count = 0;
volatile uint32_t exit_critical_count = 0;
volatile uint32_t highest_recursion = 0;

void platform_critical_init(void)
{
}

void platform_enter_critical(void)
{
    /* Enter critical section */
    mutex.lock();
    enter_critical_count++;
    uint32_t current_recursion = mutex.native_handle()->__data.__count; // check for highest count here
    if (current_recursion > highest_recursion) {
        highest_recursion = current_recursion;
    }
}

void platform_exit_critical(void)
{
    /* Exit critical section */
    mutex.unlock();
    exit_critical_count++;
}
