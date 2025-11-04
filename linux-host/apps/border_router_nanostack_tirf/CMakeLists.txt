set(PROJ_NAME ${PROJECT_NAME}-br)

set(BR_SOURCES
    # Application level code
    ${PROJECT_SOURCE_DIR}/apps/border_router_nanostack_tirf/main.cpp
    ${PROJECT_SOURCE_DIR}/apps/border_router_nanostack_tirf/application.c
    ${PROJECT_SOURCE_DIR}/apps/border_router_nanostack_tirf/borderrouter_ws.c
    ${PROJECT_SOURCE_DIR}/apps/border_router_nanostack_tirf/borderrouter_helpers.c
)

set(br_include_dirs
    ${PROJECT_SOURCE_DIR}/apps/border_router_nanostack_tirf
    ${PROJECT_SOURCE_DIR}/src/mbed_config/ws_border_router
)


# Create the executable
add_executable(${PROJ_NAME} ${SOURCES} ${BR_SOURCES} ${SOURCES_COMMON_NANOSTACK})

# Specify include directories
target_include_directories(${PROJ_NAME} PRIVATE ${ti_wisunfan_nanostack_include_dirs} ${br_include_dirs})

# Read options from .opts file
file(READ ${CMAKE_CURRENT_SOURCE_DIR}/defines/router.opts COMPILE_OPTIONS_FILE)
string(REPLACE "\n" ";" COMPILE_OPTIONS_LIST ${COMPILE_OPTIONS_FILE})

# Add compiler options
target_compile_definitions(${PROJ_NAME} PRIVATE ${COMPILE_OPTIONS_LIST})

# Add additional top level defines
target_compile_definitions(${PROJ_NAME} PRIVATE -DDEVICE_TYPE_BORDER_ROUTER -DLINUX_NANOSTACK -DOPENTHREAD_TARGET_LINUX -DWISUN_RCP_ENABLE -DWISUN_NCP_ENABLE -DWISUN_RCP_HOST -DTI_WISUN_FAN_DEBUG)

# Add certification-specific predefines if specified
option(WISUN_CERT_CONFIG "Build in certification test mode, enable WISUN_CERT_CONFIG" OFF)

if (WISUN_CERT_CONFIG)
    include(${PROJECT_SOURCE_DIR}/test/fan_1_1_core_certification/CMakeList.txt)
endif()