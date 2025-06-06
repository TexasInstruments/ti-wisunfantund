/******************************************************************************
 
 Group: WCS LPC
 $Target Device: DEVICES $

 ******************************************************************************
 $License: BSD3 2016 $
 ******************************************************************************
 $Release Name: PACKAGE NAME $
 $Release Date: PACKAGE RELEASE DATE $
 *****************************************************************************/

#ifndef LINUX_POLLING_TIMER_HPP
#define LINUX_POLLING_TIMER_HPP

#include <atomic>
#include <chrono>
#include <functional>
#include <pthread.h>
#include <mutex>

/**
 *    A class representing a Linux polling timer.
 *    
 *    This class provides functionality for creating and managing a Linux polling timer.
 *    
 *    @author    Texas Instruments
 */
class Linux_Polling_Timer {
private:
    // Member variables
    std::chrono::steady_clock::time_point clockStartTime;
    std::chrono::steady_clock::time_point clockStopTime;
    // if true, event will fire when current time passes clockStopTime and this will be set back to false
    std::atomic<bool> clockActive;
    std::recursive_mutex mutex;
    pthread_t timer_thread_id;
    std::function<void()> arm_hal_callback;
    uint16_t us_per_slot;
    
    /**
     *    Enters a critical section.
     *    
     *    This function locks the mutex to prevent concurrent access.
     */
    void hal_layer_timer_enter_critical(void);

    /**
     *    Exits a critical section.
     *    
     *    This function unlocks the mutex to allow concurrent access.
     */
    void hal_layer_timer_exit_critical(void);

    
    /**
     *    Converts microseconds to slots.
     *    
     *    @param us    the number of microseconds to convert
     *    
     *    @return    the number of slots equivalent to the given microseconds
     */
    inline uint16_t US_TO_SLOTS(uint16_t us);

    /**
     *    Converts slots to microseconds.
     *    
     *    @param slots    the number of slots to convert
     *    
     *    @return    the number of microseconds equivalent to the given slots
     */
    inline uint16_t SLOTS_TO_US(uint16_t slots);

    /**
     *    The clk0 function.
     *    
     *    @param arg0    an argument for the clk0 function (currently unused)
     */
    void clk0Fxn(uintptr_t arg0);

public:

    /**
     *    Constructor for the Linux_Polling_Timer class.
     *    
     *    This function is responsible for initializing the clockStartTime,
     *    clockStopTime, clockActive, mutex, timer_thread_id, arm_hal_callback,
     *    and ms_per_slot members.
     */
    Linux_Polling_Timer();
    
    /**
     *    Destructor for the Linux_Polling_Timer class.
     *    
     *    This function is responsible for tearing down the timer thread.
     */
    ~Linux_Polling_Timer();

    /**
     *    The thread function for the timer.
     *    
     *    @param arg    an argument for the thread function (currently unused)
     *    
     *    @return    a pointer to NULL
     */
    void* thread_func(void* arg);
    
    /**
     *    A wrapper function for the thread function.
     *    
     *    @param arg    a pointer to a Linux_Polling_Timer object
     *    
     *    @return    a pointer to NULL
     */
    static void* thread_func_wrapper(void* arg);

    /**
     *    Sets a callback function.
     *    
     *    @param new_fp    the new callback function to set
     */
    void set_cb(void (*new_fp)(void));

    /**
     *    Starts the timer.
     *    
     *    @param slots    the number of slots to start the timer for
     */
    void start(uint16_t slots);

    /**
     *    Stops the timer.
     */
    void stop(void);

    /**
     * Retrieves the remaining slots for the timer.
     *
     * @return the remaining slots
     */
    uint16_t get_remaining_slots(void);
};

#endif  // LINUX_POLLING_TIMER_HPP