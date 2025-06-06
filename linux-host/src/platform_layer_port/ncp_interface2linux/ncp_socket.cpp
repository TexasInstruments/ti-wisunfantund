/******************************************************************************

 @file  ncp_socket.cpp

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

#include "ncp_socket.hpp"
#include <vector>

extern "C" {
#include "ns_trace.h"
#define TRACE_GROUP "ncp_socket"
}

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

// CADEN NOTE: This isn't thread safe right now and we're just sending from whatever context instead of the ncp socket RX thread. This *should* be okay as the socket API itself is threadsafe, but keep this in mind.
extern "C" void platformNcpSendProcess()
{
    NcpSocket *ncpSocket = static_cast<NcpSocket *>(NcpBase::GetNcpInstance());
    ncpSocket->SendData();
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
    // add frame added callback handler, used for sending out frames to wfantund
    mTxFrameBuffer.SetFrameAddedCallback(HandleFrameAddedToNcpBuffer, this);

    // Create the server socket
    mTcpSocketServerFd = socket(AF_INET6, SOCK_STREAM, 0);
    if (mTcpSocketServerFd < 0) {
        tr_err("Failed to create socket!!");
        // Handle error
        return;
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
        return;
    }

    // Listen for incoming connections
    if (listen(mTcpSocketServerFd, 5) < 0) {
        tr_err("Failed to listen!!");
        // Handle error
        close(mTcpSocketServerFd);
        return;
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


void NcpSocket::HandleFrameAddedToNcpBuffer(void)
{
    if (mSocketBuffer.IsEmpty())
    {
        //post event to Ncp tasklet
        platformNcpSendRspSignal();
    }
}

void* NcpSocket::thread_func(void *arg)
{
    struct sockaddr_in6 server_addr, client_addr;
    socklen_t client_addr_len = sizeof(client_addr);
    bool client_connected = false;

    while (true) 
    {
        tr_info("Waiting for wfantund client connection");
        mClientFd = accept(mTcpSocketServerFd, (struct sockaddr *)&client_addr, &client_addr_len);
        if (mClientFd < 0) {
            perror("accept failed");
            close(mTcpSocketServerFd);
            exit(1);
        }
        else
        {
            client_connected = true;
            tr_info("wfantund connected");
        }

        // Loop on receiving data while the client is connected
        uint8_t buffer[1024];
        while(client_connected)
        {
            int bytes_received = recv(mClientFd, buffer, sizeof(buffer), 0);
            if (bytes_received < 0) {
                perror("recv failed");
                break;
            } else if (bytes_received == 0) {
                tr_info("wfantund closed the connection");
                client_connected = false;
                break;
            }
    
            std::string hex_string = uint8BufferToHex(buffer, bytes_received);
    
            tr_debug("Received %d bytes: %s", bytes_received, hex_string.c_str());
    
            //decode frame
            mFrameDecoder.Decode(buffer, bytes_received);
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
        std::string hex_string = uint8BufferToHex(mSocketBuffer.GetFrame(), len);
        tr_debug("Sending %d bytes to wfantund: %s", len, hex_string.c_str());

        int bytesSent = send(mClientFd, mSocketBuffer.GetFrame(), len, 0);
        if (bytesSent != len)
        {
            tr_error("Sent %i bytes over the socket, expected %i!", bytesSent, len);
        }

        //clear socket buffer and post event to Ncp tasklet TODO: Make thread safe? Need to check if it is necessary to do so, tx frame buffer should only be referenced by single thread tho
        mSocketBuffer.Clear();
        platformNcpSendRspSignal();

        return bytesSent;
    }
}

int NcpSocket::ReceiveData(uint8_t *data, int length) {
    // Receive data from the TCP socket
    return recv(mTcpSocketServerFd, data, length, 0);
}

} // namespace Ncp
} // namespace ot
