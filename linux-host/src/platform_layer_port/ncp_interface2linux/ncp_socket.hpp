/******************************************************************************

 @file  ncp_socket.hpp

 @brief Implements NCP functionality over a TCP Socket interface.

 Group: WCS, LPC
 $Target Device: DEVICES $

 ******************************************************************************
 $License: BSD3 2025 $
 ******************************************************************************
 $Release Name: PACKAGE NAME $
 $Release Date: PACKAGE RELEASE DATE $
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
    void DecodeMessage(uint8_t *buffer, uint16_t bytes_received);

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
    bool mClientConnected;
    uint16_t mSocketBufferSize;

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