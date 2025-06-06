/******************************************************************************

 @file  ncp_socket.hpp

 @brief Implements NCP functionality over a TCP Socket interface.

 Group: WCS, LPC
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

#ifndef NCP_TCP_BASE_HPP
#define NCP_TCP_BASE_HPP

#include "ncp/ncp_base.hpp"
#include "lib/hdlc/hdlc.hpp"

#include <stdio.h>
#include <stdlib.h>
#include <string>
#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <signal.h>
#include <cstring>
#include <cstdio>
#include <cstdlib>


namespace ot {
namespace Ncp {

class NcpSocket : public NcpBase 
{
    typedef NcpBase super_t;

    enum SocketTxState
    {
        kStartingFrame,   // Starting a new frame.
        kEncodingFrame,   // In middle of encoding a frame.
        kFinalizingFrame, // Finalizing a frame.
    };

public:
    explicit NcpSocket(Instance *aInstance, int serverPort, bool useIpv6);

    ~NcpSocket();

    void Initialize();
    void Deinitialize();

    int SendData(const uint8_t *data, int length);
    int SendData();
    int ReceiveData(uint8_t *data, int length);

    /**
     *    A wrapper function for the thread function.
     *    
     *    @param arg    a pointer to an NcpSocket object
     *    
     *    @return    a pointer to NULL
     */
    static void* thread_func_wrapper(void* arg);

    /**
     *    The thread function for the timer.
     *    
     *    @param arg    an argument for the thread function (currently unused)
     *    
     *    @return    a pointer to NULL
     */
    void* thread_func(void* arg);

private:
    int mTcpSocketServerFd;
    int mClientFd;
    struct sockaddr_storage mServerAddress;
    std::string mServerAddressStr;
    int mServerPort;
    bool mUseIpv6;
    pthread_t mThread;

    Hdlc::Encoder                        mFrameEncoder;
    Hdlc::Decoder                        mFrameDecoder;
    Hdlc::FrameBuffer<1500>              mSocketBuffer; //arbitrary size bigger than existing uart implementation, so no need to fragment
    uint8_t                              mByte;
    SocketTxState                        mState;
    Hdlc::FrameBuffer<1500>              mRxBuffer;   //arbitrary size based on existing uart implementation

    void HandleFrame(otError aError);
    void HandleError(otError aError, uint8_t *aBuf, uint16_t aBufLength);
    void HandleFrameAddedToNcpBuffer(void);

    static void HandleFrame(void *aContext, otError aError);
    static void HandleFrameAddedToNcpBuffer(void *                   aContext,
                                            Spinel::Buffer::FrameTag aTag,
                                            Spinel::Buffer::Priority aPriority,
                                            Spinel::Buffer *         aBuffer);
};

} // namespace Ncp
} // namespace ot

#endif  // NCP_TCP_BASE_HPP