set(PROJ_NAME ${PROJECT_NAME}-rn)

set(RN_SOURCES
    # Application level code
    ${PROJECT_SOURCE_DIR}/apps/router_node_nanostack_tirf/main.cpp
    ${PROJECT_SOURCE_DIR}/apps/router_node_nanostack_tirf/application.c
)

set(rn_include_dirs
    ${PROJECT_SOURCE_DIR}/apps/router_node_nanostack_tirf
    ${PROJECT_SOURCE_DIR}/src/mbed_config/ws_router
)

# Create the executable
add_executable(${PROJ_NAME} ${SOURCES} ${RN_SOURCES} ${SOURCES_COMMON_NANOSTACK})

# Specify include directories
target_include_directories(${PROJ_NAME} PRIVATE ${ti_wisunfan_nanostack_include_dirs} ${rn_include_dirs})

# Read options from .opts file
file(READ ${CMAKE_CURRENT_SOURCE_DIR}/defines/router.opts COMPILE_OPTIONS_FILE)
string(REPLACE "\n" ";" COMPILE_OPTIONS_LIST ${COMPILE_OPTIONS_FILE})

# Add compiler options
target_compile_definitions(${PROJ_NAME} PRIVATE ${COMPILE_OPTIONS_LIST})

# Add additional top level defines
add_definitions(-DWISUN_RCP_HOST -DLINUX_NANOSTACK -DOPENTHREAD_TARGET_LINUX -DWISUN_RCP_ENABLE -DWISUN_NCP_ENABLE -DTI_WISUN_FAN_DEBUG)