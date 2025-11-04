/******************************************************************************

 @file  ncp_socket.cpp

 @brief Implements NCP functionality over a TCP Socket interface.

 Group: WCS, LPC
 $Target Device: DEVICES $

 ******************************************************************************
 $License: BSD3 2025 $
 ******************************************************************************
 $Release Name: PACKAGE NAME $
 $Release Date: PACKAGE RELEASE DATE $
 *****************************************************************************/

#include "ncp_socket.hpp"
#include <signal.h>
#include <vector>

extern "C" {
#include "net_interface.h"
#include "nsdynmemLIB.h"
#include "ns_trace.h"
#define TRACE_GROUP "ncp_socket"
}

volatile uint32_t tcp_msgs_received = 0;
volatile uint32_t tcp_msgs_sent = 0;

#include <string>
#include <iomanip>
#include <sstream>

std::string uint8BufferToHex(const uint8_t *buffer, size_t length) {
    std::stringstream hexStream;
    for (size_t i = 0; i < length; ++i) {
        hexStream << "0x" << std::setw(2) << std::setfill('0') << std::hex << (int)buffer[i] << " ";
    }
    return hexStream.str();
}

namespace ot {
namespace Ncp {

extern "C" void platformNcpSendRspSignal();

extern "C" void platformSocketSignal(uint8_t *buffer, uint16_t length);

static OT_DEFINE_ALIGNED_VAR(sNcpRaw, sizeof(NcpSocket), uint64_t);

int ncpSocketPort = 0;
bool useIpv6 = false;

//used to set defaults from application.c
extern "C" void otNcpConfigure(int newNcpSocketPort, bool newUseIpv6)
{
    ncpSocketPort = newNcpSocketPort;
    useIpv6 = newUseIpv6;
}

extern "C" void otNcpInit(otInstance *aInstance)
{
    NcpSocket * ncpSocket  = NULL;
    Instance *instance = static_cast<Instance *>(aInstance);

    ncpSocket = new (&sNcpRaw) NcpSocket(instance, ncpSocketPort, useIpv6);

    if (ncpSocket == NULL || ncpSocket != NcpBase::GetNcpInstance())
    {
        OT_ASSERT(false);
    }
}

extern "C" void platformNcpSendProcess()
{
    NcpSocket *ncpSocket = static_cast<NcpSocket *>(NcpBase::GetNcpInstance());
    ncpSocket->SendData();
}

extern "C" void platformNcpSocketProcess(tcp_socket_event_data_s *data)
{
    NcpSocket *ncpSocket = static_cast<NcpSocket *>(NcpBase::GetNcpInstance());

    if (data != NULL)
    {
        OT_ASSERT(data->buf != NULL && data->length > 0);
    }
    else
    {
        tr_error("Data passed in is NULL! Asserting.");
        OT_ASSERT(0);
    }

    ncpSocket->DecodeMessage(data->buf, data->length);

    // Free allocated memory of the buffer and the event data object itself
    ns_dyn_mem_free(data->buf);
    ns_dyn_mem_free(data);
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
    void* NcpSocket::thread_func_wrapper(void* arg) {
        NcpSocket* socket = static_cast<NcpSocket*>(arg);
        socket->thread_func(nullptr);
        return NULL;
    }

NcpSocket::NcpSocket(Instance *aInstance, int serverPort, bool useIpv6): 
    NcpBase(aInstance)
    , mFrameEncoder(mSocketBuffer)
    , mFrameDecoder(mRxBuffer, &NcpSocket::HandleFrame, this)
    , mRxBuffer()
    // mServerAddressStr(serverAddress), 
    , mServerPort(serverPort)
    , mUseIpv6(useIpv6) 
{
    // Initialize socket settings
    mSocketBufferSize = 1024;
    mClientConnected = false;

    // Ignore any SIGPIPE signals
    struct sigaction sa;
    sa.sa_handler = SIG_IGN; // Set handler to ignore
    sigemptyset(&sa.sa_mask); // Clear the signal mask
    sa.sa_flags = 0; // No special flags

    if(sigaction(SIGPIPE, &sa, NULL) == -1) {
        tr_err("failed to ignore SIGPIPE");
        exit(1);
    }

    // add frame added callback handler, used for sending out frames to wfantund
    mTxFrameBuffer.SetFrameAddedCallback(HandleFrameAddedToNcpBuffer, this);

    // Create the server socket
    mTcpSocketServerFd = socket(AF_INET6, SOCK_STREAM, 0);
    if (mTcpSocketServerFd < 0) {
        tr_err("Failed to create socket!!");
        exit(1);
    }

    // Set up the server address
    sockaddr_in6 serverAddress;
    memset(&serverAddress, 0, sizeof(serverAddress));
    serverAddress.sin6_family = AF_INET6;
    serverAddress.sin6_addr = in6addr_any;
    serverAddress.sin6_port = htons(mServerPort);

    // Bind the socket to the address
    if (bind(mTcpSocketServerFd, (struct sockaddr *)&serverAddress, sizeof(serverAddress)) < 0) {
        tr_err("Failed to bind!!");
        // Handle error
        close(mTcpSocketServerFd);
        exit(1);
    }

    // Listen for incoming connections
    if (listen(mTcpSocketServerFd, 5) < 0) {
        tr_err("Failed to listen!!");
        // Handle error
        close(mTcpSocketServerFd);
        exit(1);
    }

    // Create the thread
    pthread_create(&mThread, NULL, thread_func_wrapper, this);
}

NcpSocket::~NcpSocket() {
    if (mTcpSocketServerFd != -1) {
        close(mTcpSocketServerFd);
    }
}

void NcpSocket::HandleFrameAddedToNcpBuffer(void *                   aContext,
                                          Spinel::Buffer::FrameTag aTag,
                                          Spinel::Buffer::Priority aPriority,
                                          Spinel::Buffer *         aBuffer)
{
    OT_UNUSED_VARIABLE(aBuffer);
    OT_UNUSED_VARIABLE(aTag);
    OT_UNUSED_VARIABLE(aPriority);

    static_cast<NcpSocket *>(aContext)->HandleFrameAddedToNcpBuffer();
}

/**
 * Decode the message received over the Socket.
 *
 * @param buffer The buffer containing the received message.
 * @param bytes_received The number of bytes received.
 */
void NcpSocket::DecodeMessage(uint8_t *buffer, uint16_t bytes_received)
{
    mFrameDecoder.Decode(buffer, bytes_received);
}

void NcpSocket::HandleFrameAddedToNcpBuffer(void)
{
    if (mSocketBuffer.IsEmpty())
    {
        //post event to Ncp tasklet
        platformNcpSendRspSignal();
    }
}

/**
 * Accepts client connections and receives data from the connected wfantund client. This function
 * runs in its own thread context and passes the received data to the DecodeMessage function via
 * the NCP Tasket, to ensure that the context stays the same as the rest of the Nanostack.
 * 
 * If the wfantund connection is dropped / broken, the thread will accept a new connection, ensuring
 * the application doesn't need to be restarted.
 */
void* NcpSocket::thread_func(void *arg)
{
    struct sockaddr_in6 server_addr, client_addr;
    socklen_t client_addr_len = sizeof(client_addr);
    mClientConnected = false;

    while (true) 
    {
        tr_info("Waiting for ncpSocket client connection on port %d", mServerPort);
        mClientFd = accept(mTcpSocketServerFd, (struct sockaddr *)&client_addr, &client_addr_len);
        if (mClientFd < 0) {
            tr_err("ncpSocket accept failed, err = %s", strerror(errno));
        }
        else
        {
            mClientConnected = true;
            tr_info("ncpSocket client connected");
        }

        // Loop on receiving data while the client is connected
        uint8_t buffer[mSocketBufferSize];
        while(mClientConnected)
        {
            int bytes_received = recv(mClientFd, buffer, sizeof(buffer), 0);
            if (bytes_received < 0) {
                tr_err("recv failed, err = %s", strerror(errno));
                break;
            } else if (bytes_received == 0) {
                tr_info("ncpSocket client closed the connection");
                mClientConnected = false;
                break;
            }
    
            std::string hex_string = uint8BufferToHex(buffer, bytes_received);
    
            tr_debug("Received %d bytes: %s", bytes_received, hex_string.c_str());
            // Increment debug counter
            tcp_msgs_received++;

            // Signal to the NCP tasklet that data has been received and should be decoded
            platformSocketSignal(buffer, bytes_received);
        }
    }

    return 0;
}

void NcpSocket::HandleFrame(void *aContext, otError aError)
{
    static_cast<NcpSocket *>(aContext)->HandleFrame(aError);
}

void NcpSocket::HandleFrame(otError aError)
{
    uint8_t *buf       = mRxBuffer.GetFrame();
    uint16_t bufLength = mRxBuffer.GetLength();

    if (aError == OT_ERROR_NONE)
    {
#ifdef WISUN_FAN_DEBUG
        uart_frame_ok++;
#endif

#if OPENTHREAD_ENABLE_NCP_SPINEL_ENCRYPTER
        size_t dataLen = bufLength;
        if (SpinelEncrypter::DecryptInbound(buf, kRxBufferSize, &dataLen))
        {
            super_t::HandleReceive(buf, dataLen);
        }
#else
        super_t::HandleReceive(buf, bufLength);
#endif // OPENTHREAD_ENABLE_NCP_SPINEL_ENCRYPTER
    }
    else
    {
#ifdef WISUN_FAN_DEBUG
        uart_frame_error++;
#endif
        HandleError(aError, buf, bufLength);
    }

    mRxBuffer.Clear();
}

void NcpSocket::HandleError(otError aError, uint8_t *aBuf, uint16_t aBufLength)
{
    super_t::IncrementFrameErrorCounter();
}

int NcpSocket::SendData() {

    if (mClientConnected == false) {
        tr_err("Tried to send data over ncpSocket when client was not connected! Returning immediately without processing the frame.");
        return -1;
    }

    uint16_t len;
    bool     prevHostPowerState;
#if OPENTHREAD_ENABLE_NCP_SPINEL_ENCRYPTER
    Spinel::BufferEncrypterReader &txFrameBuffer = mTxFrameBufferEncrypterReader;
#else
    Spinel::Buffer &txFrameBuffer = mTxFrameBuffer;
#endif // OPENTHREAD_ENABLE_NCP_SPINEL_ENCRYPTER

    while (!txFrameBuffer.IsEmpty() || (mState == kFinalizingFrame))
    {
        switch (mState)
        {
        case kStartingFrame:
            VerifyOrExit(!super_t::ShouldDeferHostSend(), OT_NOOP);
            SuccessOrExit(mFrameEncoder.BeginFrame());

            txFrameBuffer.OutFrameBegin();

            mState = kEncodingFrame;

            while (!txFrameBuffer.OutFrameHasEnded())
            {
                mByte = txFrameBuffer.OutFrameReadByte();

            case kEncodingFrame:

                SuccessOrExit(mFrameEncoder.Encode(mByte));
            }

            // track the change of mHostPowerStateInProgress by the
            // call to OutFrameRemove.
            prevHostPowerState = mHostPowerStateInProgress;

            txFrameBuffer.OutFrameRemove();

            mState = kFinalizingFrame;

            // fall through

        case kFinalizingFrame:

            SuccessOrExit(mFrameEncoder.EndFrame());

            mState = kStartingFrame;
        }
    }

exit:
    len = mSocketBuffer.GetLength();

    if (len > 0)
    {
        int bytesSent = 0;
        std::string hex_string = uint8BufferToHex(mSocketBuffer.GetFrame(), len);
        tr_debug("Sending %d bytes to ncpSocket client: %s", len, hex_string.c_str());

        bytesSent = send(mClientFd, mSocketBuffer.GetFrame(), len, MSG_NOSIGNAL);
        if (bytesSent != len)
        {
            tr_err("Sent %i bytes over the ncpSocket, expected %i!", bytesSent, len);
            tr_err("Err: %s", strerror(errno));
        }

        // Increment debug counter
        tcp_msgs_sent++;

        //clear socket buffer and post event to Ncp tasklet
        mSocketBuffer.Clear();
        platformNcpSendRspSignal();

        return bytesSent;
    }
    else
    {
        return 0;
    }
}

} // namespace Ncp
} // namespace ot
