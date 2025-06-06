/******************************************************************************
 
 Group: WCS LPC
 Target Device: Linux

 ******************************************************************************
 
 Copyright (c) 2016-2025, Texas Instruments Incorporated
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions
 are met:

 *  Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.

 *  Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.

 *  Neither the name of Texas Instruments Incorporated nor the names of
    its contributors may be used to endorse or promote products derived
    from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 ******************************************************************************
 
 
 *****************************************************************************/

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
#include <functional>
#include "linux_polling_timer.hpp"
#include <mutex>

extern "C" {
#include "ns_trace.h"
#define TRACE_GROUP "polling_timer"
}

volatile uint32_t timer_enter_critical_count = 0;
volatile uint32_t timer_exit_critical_count = 0;

/* convert slots to microseconds */
#define US_PER_SLOT 50


    inline uint16_t Linux_Polling_Timer::US_TO_SLOTS(uint16_t us) {
        return us / us_per_slot;
    }

    inline uint16_t Linux_Polling_Timer::SLOTS_TO_US(uint16_t us) {
        return us * us_per_slot;
    }

    void Linux_Polling_Timer::hal_layer_timer_enter_critical(void)
    {
        /* Enter critical section */
        mutex.lock();
        timer_enter_critical_count++;
    }

    void Linux_Polling_Timer::hal_layer_timer_exit_critical(void)
    {
        /* Exit critical section */
        mutex.unlock();
        timer_exit_critical_count++;
    }

    void Linux_Polling_Timer::clk0Fxn(uintptr_t arg0)
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

std::chrono::steady_clock::time_point maximum_drift;

    void* Linux_Polling_Timer::thread_func(void *arg)
    {
        // Check every 1 ms for a clock expiration
        while (true)
        {
            if(clockActive)
            {
                // critical section may not be needed or could cause a lockup, check later
                hal_layer_timer_enter_critical();
                std::chrono::steady_clock::time_point currentTime = std::chrono::steady_clock::now();
                if (currentTime >= clockStopTime)
                {
                    // if (maximum_drift < )
                    // tr_info("Timer callback with %lu microsecond diff between currentTime and clockStopTime!", std::chrono::duration_cast<std::chrono::microseconds>(currentTime.time_since_epoch() - clockStopTime.time_since_epoch()).count());
                    clockActive = false; // the clock function below can start a timer, rendering this true!
                    clk0Fxn((uintptr_t)NULL);
                }
                hal_layer_timer_exit_critical();
            }
            usleep(1000);
        }
    }

    /**
     * Wraps the thread function and calls the thread_func of the Linux_Polling_Timer
     * object.
     *
     * @param arg a pointer to a Linux_Polling_Timer object
     *
     * @return a pointer to NULL
     *
     * @throws None
     */
    void* Linux_Polling_Timer::thread_func_wrapper(void* arg) {
        Linux_Polling_Timer* timer = static_cast<Linux_Polling_Timer*>(arg);
        timer->thread_func(nullptr);
        return NULL;
    }

    // Constructor
    Linux_Polling_Timer::Linux_Polling_Timer() {
        clockStartTime = std::chrono::steady_clock::now();
        clockStopTime = std::chrono::steady_clock::now();
        clockActive = false;
        us_per_slot = US_PER_SLOT;
        // This is intended to be set *after* the object is created
        arm_hal_callback = nullptr;

        // Create pthread
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

        retc = pthread_create(&timer_thread_id, &attrs, thread_func_wrapper, this);
    }

    // Destructor
    Linux_Polling_Timer::~Linux_Polling_Timer() {
        //teardown thread
    }

    // Member functions
    void Linux_Polling_Timer::set_cb(void (*new_fp)(void))
    {
        arm_hal_callback = new_fp;
        return;
    }

    void Linux_Polling_Timer::stop(void)
    {
        hal_layer_timer_enter_critical();
        clockActive = false;
        hal_layer_timer_exit_critical();
        return;
    }

    void Linux_Polling_Timer::start(uint16_t slots)
    {
        hal_layer_timer_enter_critical();
        uint16_t timeout = SLOTS_TO_US(slots);
        clockStartTime = std::chrono::steady_clock::now();
        clockStopTime = clockStartTime + std::chrono::microseconds(timeout);
        clockActive = true;
        hal_layer_timer_exit_critical();
        return;
    }

    uint16_t Linux_Polling_Timer::get_remaining_slots(void)
    {
        // This might need to be bumped up to uint32_t?
        uint16_t timeoutTime;

        // critical section likely not necessary, may need to make a timer specific critical sectiont tho
        // don't think platform_timer functions should be preempted by another platform_timer function call though
        hal_layer_timer_enter_critical();
        
        std::chrono::steady_clock::time_point currentTime = std::chrono::steady_clock::now();

        if(currentTime < clockStopTime && clockActive)
        {
            // calculate difference between clock end time and right now, rounded to nearest millisecond
            timeoutTime = std::lround(std::chrono::duration<double, std::milli>(clockStopTime-currentTime).count());
        }
        else
        {
            // clock has already expired!! Don't think this should happen
            tr_error("Clock has expired or is inactive!!!");
            timeoutTime = 0;
        }
        hal_layer_timer_exit_critical();

        return US_TO_SLOTS(timeoutTime);
    }
