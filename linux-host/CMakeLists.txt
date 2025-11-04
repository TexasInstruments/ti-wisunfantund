cmake_minimum_required(VERSION 3.15)
include(CMakeDependentOption)

project(wisun-rcp-host VERSION 1.0
                  DESCRIPTION "TI Wi-SUN FAN Border Router"
                  LANGUAGES C CXX)

include(CMakeSources.cmake)

# Add your source files here
set(SOURCES
    # RCP Code
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/rcp/rcp_host.c
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/rcp/rcp_mcps_sap.c
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/rcp/rcp_mlme.c
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/rcp/rcp_queue.c

    # INI Parser C++ files
    ${PROJECT_SOURCE_DIR}/src/ini_parser/IniFile.cpp
    ${PROJECT_SOURCE_DIR}/src/ini_parser/IniSection.cpp
    ${PROJECT_SOURCE_DIR}/src/ini_parser/UartSection.cpp
    ${PROJECT_SOURCE_DIR}/src/ini_parser/NcpSection.cpp
    ${PROJECT_SOURCE_DIR}/src/ini_parser/DhcpSection.cpp
    ${PROJECT_SOURCE_DIR}/src/ini_parser/RadiusSection.cpp
    ${PROJECT_SOURCE_DIR}/src/ini_parser/CfgParser.cpp

    # NV Code
    ${PROJECT_SOURCE_DIR}/src/nv/nv_linux.c

    # Gateway Common Code
    ${PROJECT_SOURCE_DIR}/src/gateway_common/linux/linux_specific.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/linux/linux_uart.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/debug_helpers.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/fatal.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/fifo.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/hexline.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/ini_file.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/log.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/log_ini.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/mutex.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/rand_data.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/stream_common.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/stream_file.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/stream_mem.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/stream_socket_client.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/stream_socket_ini.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/stream_socket_private.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/stream_socket_server.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/stream_uart_ini.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/threads.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/timer.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/timer_cb.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/ti_semaphore.c
    ${PROJECT_SOURCE_DIR}/src/gateway_common/src/unix_fdrw.c
    
    # MT related code
    # api folder
    ${PROJECT_SOURCE_DIR}/src/mt_interface/api/src/api_mac.c
    ${PROJECT_SOURCE_DIR}/src/mt_interface/api/src/mt_msg_dbg_core.c
    ${PROJECT_SOURCE_DIR}/src/mt_interface/api/src/mt_msg_dbg_load.c
    ${PROJECT_SOURCE_DIR}/src/mt_interface/api/src/mt_msg_ini.c
    ${PROJECT_SOURCE_DIR}/src/mt_interface/api/src/mt_msg.c    
)

set(ti_wisunfan_nanostack_include_dirs
    # Generic
    ${PROJECT_SOURCE_DIR}/src/platform_layer_port/mbednanostack2linux/nanostack/nanostack-hal-mbed-cmsis-rtos
    ${PROJECT_SOURCE_DIR}/src/platform_layer_port/mbednanostack2linux/platform
    ${PROJECT_SOURCE_DIR}/src/platform_layer_port/mbedtls2linux/platform
    ${PROJECT_SOURCE_DIR}/src/platform_layer_port/mbedtls2linux/mbedtls/mbed-crypto

    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/NWK_INTERFACE/Include
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/wisunfan_mac/high_level
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/6LoWPAN/ws
    ${PROJECT_SOURCE_DIR}/src/ini_parser

    # NV Code
    ${PROJECT_SOURCE_DIR}/src
    ${PROJECT_SOURCE_DIR}/src/nv
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source

    # RCP Code
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/rcp
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/wisunfan_mac/services/saddr
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/wisunfan_mac/hal/platform/

    # Gateway Common Code
    ${PROJECT_SOURCE_DIR}/src/gateway_common/inc
    # MT related code
    ${PROJECT_SOURCE_DIR}/src/mt_interface/api/inc
    
    # NCP Interface
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/core/
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/include/
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/include/openthread
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/config
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/ncp
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/core/common
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/lib/spinel/
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/examples/ncp_ftd
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/core/utils
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/examples/platforms
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/examples/ncp_ftd/platform
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/src/core/thread
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/ncp_interface/examples/ncp_ftd/platform/nv
    
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/ti/ti_wisunfan/apps/common/include
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/CCM_lib/mbedOS
    
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-client-randlib
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-client-randlib/mbed-client-randlib
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-client-randlib/mbed-client-randlib/platform
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-coap
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-coap/source/include
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/mbed-trace
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/nanostack-libservice
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/nanostack-libservice/mbed-client-libservice
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/frameworks/nanostack-libservice/mbed-client-libservice/platform
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/coap-service/coap-service
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/coap-service/source/include
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/mbed-mesh-api
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/mbed-mesh-api/mbed-mesh-api
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/mbed-mesh-api/source
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/mbed-mesh-api/source/include
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/nanostack-hal-mbed-cmsis-rtos
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack-eventloop
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack-eventloop/nanostack-event-loop
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack-eventloop/nanostack-event-loop/platform
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack-eventloop/source
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack-eventloop/source
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/6LowPAN
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/6LoWPAN/MAC
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/6LoWPAN/Thread
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Common_Protocols
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Core/include
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/DHCPv6_client
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/libDHCPv6
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/libNET/src
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Security/PANA
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/fnv_hash
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/hmac
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/load_balance
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns/fnet
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns/fnet/fnet_stack
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns/fnet/fnet_stack/services/mdns
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns/fnet/fnet_stack/services/serial
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/mdns/fnet/fnet_stack/stack
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/pan_blacklist
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/utils
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/source/Service_Libs/whiteboard
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/ti_wisunfan/mbedtls
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/ti_wisunfan/mbedtls/inc
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/ti_wisunfan/mbedtls/platform/COMPONENT_PSA_SRV_IMPL
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/ti_wisunfan/mbedtls/platform/COMPONENT_PSA_SRV_IMPL/COMPONENT_NSPE
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/ti_wisunfan/mbedtls/platform/inc
    
    ${PROJECT_SOURCE_DIR}/src/lprf-dallas-wisunfan/source/third_party/mbed/nanostack/sal-stack-nanostack/nanostack
)

# Add debug flag
add_compile_options(-g -fdiagnostics-color=always)

# Add optimization flags
# add_compile_options(-O3 -march=native)

# Use Ninja as the default generator
set(CMAKE_GENERATOR "Ninja" CACHE INTERNAL "Default generator")

# Enable LTO
# set(CMAKE_INTERPROCEDURAL_OPTIMIZATION TRUE)

# Set the output directory for any executables
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Add subdirectories for BR and RN applications
add_subdirectory(apps/border_router_nanostack_tirf)
add_subdirectory(apps/router_node_nanostack_tirf)