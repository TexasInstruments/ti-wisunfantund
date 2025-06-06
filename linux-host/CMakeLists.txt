cmake_minimum_required(VERSION 3.15)
include(CMakeSources.cmake)

project(BorderRouter VERSION 1.0
                  DESCRIPTION "TI Wi-SUN FAN Border Router"
                  LANGUAGES C CXX)

# Add your source files here
set(SOURCES
    apps/border_router_nanostack_tirf/main.c
    apps/border_router_nanostack_tirf/application.c
    apps/border_router_nanostack_tirf/borderrouter_ws.c
    apps/border_router_nanostack_tirf/borderrouter_helpers.c

    # RCP Code
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/rcp/rcp_host.c
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/rcp/rcp_mcps_sap.c
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/rcp/rcp_mlme.c
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/rcp/rcp_queue.c

    # NV Code
    src/nv/nv_linux.c

    # Gateway Common Code
    src/gateway_common/linux/linux_specific.c
    src/gateway_common/linux/linux_uart.c
    src/gateway_common/src/debug_helpers.c
    src/gateway_common/src/fatal.c
    src/gateway_common/src/fifo.c
    src/gateway_common/src/hexline.c
    src/gateway_common/src/ini_file.c
    src/gateway_common/src/log.c
    src/gateway_common/src/log_ini.c
    src/gateway_common/src/mutex.c
    src/gateway_common/src/rand_data.c
    src/gateway_common/src/stream_common.c
    src/gateway_common/src/stream_file.c
    src/gateway_common/src/stream_mem.c
    src/gateway_common/src/stream_socket_client.c
    src/gateway_common/src/stream_socket_ini.c
    src/gateway_common/src/stream_socket_private.c
    src/gateway_common/src/stream_socket_server.c
    src/gateway_common/src/stream_uart_ini.c
    src/gateway_common/src/threads.c
    src/gateway_common/src/timer.c
    src/gateway_common/src/timer_cb.c
    src/gateway_common/src/ti_semaphore.c
    src/gateway_common/src/unix_fdrw.c
    
    # MT related code
    # api folder
    src/mt_interface/api/src/api_mac.c
    src/mt_interface/api/src/mt_msg_dbg_core.c
    src/mt_interface/api/src/mt_msg_dbg_load.c
    src/mt_interface/api/src/mt_msg_ini.c
    src/mt_interface/api/src/mt_msg.c    
)

set(ti_wisunfan_nanostack_include_dirs

    # Generic
    apps/border_router_nanostack_tirf
    src/mbed_config/ws_border_router
    # src/lprf-dallas-wisunfan/source/third_party/ti_wisunfan/mbedtls/targets/TARGET_Silicon_Labs
    # apps/stubs
    # apps/stubs/fh
    # apps/stubs/platform
    src/platform_layer_port/mbednanostack2linux/nanostack/nanostack-hal-mbed-cmsis-rtos
    src/platform_layer_port/mbednanostack2linux/platform
    src/platform_layer_port/mbedtls2linux/platform
    src/platform_layer_port/mbedtls2linux/mbedtls/mbed-crypto

    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/NWK_INTERFACE/Include
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/wisunfan_mac/high_level
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/6LoWPAN/ws

    # NV Code
    src
    src/nv
    src/lprf-dallas-wisunfan
    src/lprf-dallas-wisunfan/source

    # RCP Code
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/rcp
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/wisunfan_mac/services/saddr
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/wisunfan_mac/hal/platform/

    # Gateway Common Code
    src/gateway_common/inc
    # MT related code
    src/mt_interface/api/inc
    
    # NCP Interface
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/core/
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/include/
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/include/openthread
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/config
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/ncp
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/core/common
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/lib/spinel/
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/examples/ncp_ftd
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/core/utils
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/examples/platforms
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/examples/ncp_ftd/platform
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/core/thread
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/examples/ncp_ftd/platform/nv
    
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source
    src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/apps/common/include
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/CCM_lib/mbedOS
    
    src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-client-randlib
    src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-client-randlib/mbed-client-randlib
    src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-client-randlib/mbed-client-randlib/platform
    src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-coap
    src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-coap/source/include
    src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-trace
    src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/nanostack-libservice
    src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/nanostack-libservice/mbed-client-libservice
    src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/nanostack-libservice/mbed-client-libservice/platform
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/coap-service/coap-service
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/coap-service/source/include
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/mbed-mesh-api
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/mbed-mesh-api/mbed-mesh-api
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/mbed-mesh-api/source
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/mbed-mesh-api/source/include
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/nanostack-hal-mbed-cmsis-rtos
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack-eventloop
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack-eventloop/nanostack-event-loop
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack-eventloop/nanostack-event-loop/platform
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack-eventloop/source
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack-eventloop/source
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/6LowPAN
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/6LoWPAN/MAC
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/6LoWPAN/Thread
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Common_Protocols
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Core/include
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/DHCPv6_client
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/libDHCPv6
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/libNET/src
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Security/PANA
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/fnv_hash
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/hmac
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/load_balance
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns/fnet
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns/fnet/fnet_stack
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns/fnet/fnet_stack/services/mdns
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns/fnet/fnet_stack/services/serial
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns/fnet/fnet_stack/stack
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/pan_blacklist
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/utils
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/whiteboard
    src/lprf-dallas-wisunfan/source/third_party/ti_wisunfan/mbedtls
    src/lprf-dallas-wisunfan/source/third_party/ti_wisunfan/mbedtls/inc
    src/lprf-dallas-wisunfan/source/third_party/ti_wisunfan/mbedtls/platform/COMPONENT_PSA_SRV_IMPL
    src/lprf-dallas-wisunfan/source/third_party/ti_wisunfan/mbedtls/platform/COMPONENT_PSA_SRV_IMPL/COMPONENT_NSPE
    src/lprf-dallas-wisunfan/source/third_party/ti_wisunfan/mbedtls/platform/inc
    
    src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/nanostack
)

# Add debug flag
add_compile_options(-g -fdiagnostics-color=always)

# Use Ninja as the default generator
set(CMAKE_GENERATOR "Ninja" CACHE INTERNAL "Default generator")

# Read options from .opts file
file(READ ${CMAKE_CURRENT_SOURCE_DIR}/apps/border_router_nanostack_tirf/defines/router.opts COMPILE_OPTIONS_FILE)
string(REPLACE "\n" ";" COMPILE_OPTIONS_LIST ${COMPILE_OPTIONS_FILE})
    
# Add compiler options
add_compile_options(${COMPILE_OPTIONS_LIST})

# Add additional top level defines
add_definitions(-DLINUX_NANOSTACK -DWISUN_RCP_ENABLE -DWISUN_NCP_ENABLE -DWISUN_RCP_HOST_BR)

# Enable LTO
# set(CMAKE_INTERPROCEDURAL_OPTIMIZATION TRUE)

# Set the output directory for the executable
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)


add_library(nanostack STATIC ${SOURCES_COMMON_NANOSTACK})
target_include_directories(nanostack PRIVATE ${ti_wisunfan_nanostack_include_dirs})

# Create the executable
add_executable(${PROJECT_NAME} ${SOURCES} ${SOURCES_COMMON_NANOSTACK})
target_include_directories(${PROJECT_NAME} PRIVATE ${ti_wisunfan_nanostack_include_dirs})

# Link any libraries or dependencies
target_link_libraries(${PROJECT_NAME} ${LIBRARIES} nanostack)