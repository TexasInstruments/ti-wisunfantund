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

extern "C" {
#include "ns_trace.h"
#define TRACE_GROUP "arm_hal_timer"
}

/* convert slots to ticks */
#define US_PER_SLOT 50

#define US_TO_SLOTS(us)    (us / US_PER_SLOT)
#define SLOTS_TO_US(slots) (slots * US_PER_SLOT)

static void (*arm_hal_callback)(void) = NULL;
pthread_t timer_thread_id;

// Time in microseconds
static uint64_t clockStartTime;

// Time before sleeping
static std::atomic<uint64_t> preSleepTimestamp = 0;
std::atomic<std::chrono::high_resolution_clock::time_point> preSleepTimestampTest = std::chrono::high_resolution_clock::now();

/*
 *  ======== clk0Fxn =======
 */
static void clk0Fxn(uintptr_t arg0)
{
    if(arm_hal_callback)
    {
        arm_hal_callback();
    }
    else
    {
        tr_warn("No arm_hal_callback function set!");
    }
}
static uint64_t get_time_in_us() {
    struct timespec currentTime;
    clock_gettime(CLOCK_MONOTONIC, &currentTime);
    return (currentTime.tv_sec * 1000000 + currentTime.tv_nsec / 1000);
}

static void *thread_func(void *arg)
{
    // Sleep for 10 milliseconds, then call clock function
    while (true)
    {
        // directly doing a 10 ms sleep here - could also save before and after clk0Fxn timestamp
        // and sleep for 10 ms minus the time it took to run clk0Fxn. Sticking with this for now.
        preSleepTimestamp = get_time_in_us();
        preSleepTimestampTest = std::chrono::high_resolution_clock::now();
        usleep(10000); // 10 milliseconds
        tr_info("calling clk0Fxn");
        clk0Fxn((uintptr_t)NULL);
    }
}

static void *thread_func_2(void *arg)
{
    // Sleep for 10 milliseconds, then call clock function
    while (true)
    {
        
    }
}

// Called once at boot
void platform_timer_enable(void)
{
    pthread_attr_t      attrs;
    struct sched_param  priParam;
    int                 retc;

    /* Initialize the attributes structure with default values */
    pthread_attr_init(&attrs);

    /* Set the scheduling policy to Round Robin */
    struct sched_param  schedParam;
    schedParam.sched_priority = 0;
    retc = pthread_attr_setschedpolicy(&attrs, SCHED_RR);
    if (retc != 0) {
        /* failed to set scheduling policy */
        tr_err("Failed to set scheduling policy. retc: %i\n", retc);
        while (1) {}
    }

    int minPriority = sched_get_priority_min(SCHED_RR);
    int maxPriority = sched_get_priority_max(SCHED_RR);

    /* Set priority, detach state, and stack size attributes */
    priParam.sched_priority = 1;
    retc = pthread_attr_setschedparam(&attrs, &priParam);

    if (retc != 0) {
        /* failed to set attributes */
        while (1) {}
    }

    retc = pthread_create(&timer_thread_id, &attrs, thread_func, NULL);
}

// Actually cancels a timer, not the opposite of enable
void platform_timer_disable(void)
{
    return;
}

// Not called while running, fortunately
void platform_timer_set_cb(void (*new_fp)(void))
{
    arm_hal_callback = new_fp;
    return;
}

// This is called from inside platform_enter_critical - IRQs can't happen
void platform_timer_start(uint16_t slots)
{
    // ooh new option here -- start the thread in this function, force stopping it if it's already running!
    // When starting the thread, pass in the time we want to sleep for as an argument then do that sleeping in the thread

    // just updating the start time, since we're not stopping and starting a timer instance
    struct timespec currentTime;
    clock_gettime(CLOCK_MONOTONIC, &currentTime);
    clockStartTime = currentTime.tv_sec * 1000000 + currentTime.tv_nsec / 1000;
    return;
}

// This is called from inside platform_enter_critical - IRQs can't happen
uint16_t platform_timer_get_remaining_slots(void)
{
    uint64_t elapsedTime = 0;
    uint64_t timeoutTime = 0;
    uint64_t currentTime = 0;

    struct timespec currentTimespec;
    clock_gettime(CLOCK_MONOTONIC, &currentTimespec);
    currentTime = currentTimespec.tv_sec * 1000000 + currentTimespec.tv_nsec / 1000;

    
    if(currentTime > clockStartTime)
    {
        elapsedTime = currentTime - clockStartTime;
    }
    else
    {
        elapsedTime = currentTime + (UINT64_MAX - clockStartTime);
    }

    // I think this timeout should be based on when we last went to sleep and how long we've slept for so far
    // timeoutTime = ClockP_getTimeout(hal_timer);
    timeoutTime = 0;

    return US_TO_SLOTS(timeoutTime - elapsedTime);
}

