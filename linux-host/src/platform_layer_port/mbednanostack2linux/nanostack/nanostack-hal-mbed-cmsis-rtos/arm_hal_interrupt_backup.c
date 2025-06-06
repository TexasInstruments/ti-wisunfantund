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

pthread_mutex_t mutex;

volatile uint32_t enter_critical_count = 0;
volatile uint32_t exit_critical_count = 0;

void platform_critical_init(void)
{
    // Mutex must be recursive, as the same thread can call lock() multiple times before unlocking the same number of times
    pthread_mutexattr_t attr;
    int err;

    err = pthread_mutexattr_init(&attr);
    if (err) {
        printf("Failed to initialize mutex attributes: %s\n", strerror(err));
        return;
    }

    err = pthread_mutexattr_settype(&attr, PTHREAD_MUTEX_RECURSIVE_NP);
    if (err) {
        printf("Failed to set mutex type: %s\n", strerror(err));
        while(1);
        return;
    }

    err = pthread_mutex_init(&mutex, &attr);
    if (err) {
        printf("Failed to initialize mutex: %s\n", strerror(err));
        while(1);
        return;
    }
}

void platform_enter_critical(void)
{
    enter_critical_count++;
    /* Enter critical section */
    pthread_mutex_lock( &mutex );
}

void platform_exit_critical(void)
{
    exit_critical_count++;
    /* Exit critical section */
    pthread_mutex_unlock( &mutex );
}
