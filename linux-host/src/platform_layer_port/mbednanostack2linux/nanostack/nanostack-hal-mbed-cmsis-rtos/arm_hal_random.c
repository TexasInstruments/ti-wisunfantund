/*
 * Copyright (c) 2015, 2018, Arm Limited and affiliates.
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
#include "arm_hal_random.h"

//randLIB.c *should* already use /dev/urandom on Linux without invoking the HAL, but went ahead and implemented it here just in case. Will still fall back on rand() if /dev/urandom is not available.

#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

const char *filename = "/dev/urandom";
bool use_urandom = false;

void arm_random_module_init(void)
{
    if (access(filename, F_OK) != -1) {
        use_urandom = true;
    } 
    else 
    {
        use_urandom = false;
        srand(time(NULL));
    }

    return;
}

uint32_t arm_random_seed_get(void)
{
    if (use_urandom)
    {
        int fd = open("/dev/urandom", O_RDONLY);
        if (fd == -1) {
            // Handle error
            return 0;
        }

        uint32_t seed;
        ssize_t result = read(fd, &seed, sizeof(seed));
        close(fd);

        if (result != sizeof(seed)) {
            // Handle error
            return 0;
        }

        return seed;
    }
    else
    {
        return rand();
    }
}
