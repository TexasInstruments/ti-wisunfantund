/*****************************************************************
 * Copyright (c) 2018 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich - Initial API and implementation
 *****************************************************************/

var gc = gc || {};

gc.databind = gc.databind || {};

/**
 * This helper API is passed to the gc.autoDetectPortsFilter() method as a callback
 * to provide access to information for the purposes of aiding the filtering of ports function. 
 * 
 *  @interface
 */
gc.databind.IAutoDetectPortsFilterHelper = function() {};

/**
 * Method to determine if the given serial port is an HID port or not.
 *  
 * @param {object} port - instance of the serial port to test.
 * @return {boolean} true if the port is HID. 
 */
gc.databind.IAutoDetectPortsFilterHelper.prototype.isHid = function() {};

/**
 * Method to determine if the given serial port is a regualar USB port, and not HID.
 *  
 * @param {object} port - instance of the serial port to test.
 * @return {boolean} true if the port is not HID. 
 */
gc.databind.IAutoDetectPortsFilterHelper.prototype.isUsb = function() {};

/**
 * This method sets the recommended port.  If the list of ports is not filtered to less that 2,
 * this method can optionally be used to identify a recommended port.  This port will be used in lieu of 
 * a users manual selection.  The users manual selection will always override, unless you 
 * filter the list of ports to be a single port, then the user will have no other choices.
 * 
 * @param {object} port - the serial port instance to use as the recommended port. 
 */
gc.databind.IAutoDetectPortsFilterHelper.prototype.setRecommendedPort = function() {};

/**
 * An optional callback that applications can use to filter usb ports based on application
 * specific information.  For example, auto detecting ports for a specific device/controller.
 * This method is called by each transport, so filtering of serial ports can be transport
 * specific.  This is useful if there are two USB connections, and you need to make sure
 * only the appropriate ports are listed for each transport independently.  This API is 
 * expected to run synchronously, so you may not return a promise.  You must return the results 
 * directly.
 * 
 * @callback gc.autoDetectPortsFilter
 * @example
 * gc.autoDetectPortsFilter = function(transport, ports, info) { 
 *     var productId = 769;
 *     var filteredPorts = [];
 *     for(var i = ports.length; i-- > 0; ) {
 *         if (port.productId === productId) {
 *             filteredPorts.push(ports[i])
 *         }
 *     }
 *     return filteredPorts;
 * };
 * @param {object} transport - the ti-transport-usb instance to filter serial ports for.
 * @param {object[]} serialPorts - list of available serial ports found.
 * @param {gc.databind.IAutoDetectPortsFilterHelper} helperMethods - api to access information that
 * might be useful to filter the list of serial ports.
 * @return {object[]} list of filtered serial ports or undefined to use the original list unfiltered. 
 */

/**
 * This helper API is passed to the gc.autoDetectPortIdentity() method as a callback
 * to provide access to information for the purposes of aiding identification of ports. 
 * This api extends IAutoDetectPortsFilterHelper, and provides helper functions to 
 * open and close a serial port, as well as, create an instance of a codec for the purposes of 
 * communicating over the serial port to aid in identifying the port.  
 * 
 *  @interface
 *  @extends gc.databind.IAutoDetectPortsFilterHelper
 */
gc.databind.IAutoDetectPortIdentityHelper = function() {};

/**
 * This method opens the serial port for communication.  Use this method, along with serialPortDisconnect
 * to open a serial port for the purposes of establishing it's identity.  Since port identification is 
 * performed independent of the transport, you must provide a baud rate to open a USB port, and not rely
 * anything setup for a particular transport. For USB-HID ports, you do not need to specify a baud rate.
 * 
 * @example
 * gc.autoDetectPortIdentity = function(port, helperAPI) {
 *     if (!helperAPI.isHid(port) || port.productId !== 769) 
 *         return;  // return undefined for unknown port for identification.
 *         
 *     return helperAPI.serialPortConnect().then(function() {
 *         var u2a = helperAPI.createPacketCodec('usb2any');  
 *         return u2a.connect(...).then(function() {
 *             // ... do identification through codec apis ...
 *             return deviceName;  // use device name as identifier for a particular port 
 *         }).finally(function() {
 *             u2a.disconnect();
 *             return helperAPI.serialPortDisconnect();
 *         });
 *     });
 * };
 * @param {object} baudRate - optional baud rate parameter to open the serial port with a specific baud rate. 
 * @return {promise} a promise that resolves on successfully opening the port, or fails if the port could not be opened. 
 */
gc.databind.IAutoDetectPortIdentityHelper.prototype.serialPortConnect = function() {};

/**
 * <p>This method creates a codec instance that will be bound to the opened serial port.  This method 
 * only makes sense to be called between serialPortConnect() and serialPortDisconnect() operations, since
 * it is bound to the opened serial port for sending and receiving packets.  You may create multiple
 * codecs, but only the last one will be bound to the rx data over the opened serial port, so if you need
 * to create multiple codes to identify which controller is being used, you should use one at a time.</p>  
 * 
 * <p>If you need to receive streaming data, then you must provide a decoder method to receive the decoded packets
 * from the codec.  For USB2ANY, and AEVM, this is not necessary because these codecs do not return decode packets
 * this way.</p>  
 * 
 * @param {object} controllerName - name of the packet codec, for example, 'aevm' that you wish to create. 
 * @param {function} [decoder] - callback method to receive the decoded packets. 
 * @return {gc.databind.IPacketCodec} the packet codec chain created and bound with the opened serial port. 
 */
gc.databind.IAutoDetectPortIdentityHelper.prototype.createPacketCodec = function() {};

/**
 * This method closes the previously opened serial port.
 * You must call this when finished identifying an open port.  Specifically, it should be in a finally()  
 * to ensure the port is closed even on failures.  This method also returns a promise which must be returned
 * in the finally() handler to make sure the close operation completes before the port is reopend by someone else.
 * 
 * @return {promise} a promise that resolves when the port is successfully closed. 
 */
gc.databind.IAutoDetectPortIdentityHelper.prototype.serialPortDisconnect = function() {};

/**
 * An optional callback that notifies applications when a specific usb port was selected, 
 * either by the user, or from picking a recommended port by default.  Applications can use this callback
 * to change the application's behavior based on the serial port selected; for example, 
 * setting the selectedController on a register model.
 * 
 * @callback gc.autoDetectPortSelected
 * @example
 * gc.autoDetectPortSelected = function(transport, port, info) {
 *     var controllerName = transport.getControllerName();
 *     if (port && controllerName) {
 *        console.log('Controller ' + controllerName + ' is using port: ' + port.comName);
 *     }
 *     // in this case we know that our app has only one transport and one register model.
 *     document.querySelector('ti-model-register').selectedDevice = info.getAutoDetectIdentity(port);
 * };
 * @param {object} transport - the ti-transport-usb instance that the selected port will be used for.
 * @param {object} port - the specific serial port that will be used to connect to the target controller/device. 
 * @param {gc.databind.IAutoDetectPortsFilterHelper} helperMethods - api to access information that might
 * be useful.
 */

/**
 * An optional callback that applications can use to perform device detection or port identification on usb transports. 
 * This callback is called once for each unique USB serial port found on the users machine, and the result is cached for
 * the remainder of the application runtime.  Note that this may occur any time
 * the users serial ports are listed, and there are new serial ports found.  For multiple serial ports, this method will be 
 * called multiple times, and in parallel which means that more that one com port may be open at one time.
 * When this callback is called, the serial port is not opened, no codec has been created, and the app has not tried to connect
 * to the target yet.  
 * 
 * The callback should return one of the following:
 * <ul>
 * <li>string - used to identify the serial port, perhaps by device name.</li>
 * <li>object - as object that has a toString() method that returns a string to identify the serial port to the user.</li>
 * <li>undefined - null or undefined to indicate that the serial port could not be recognized.</li>
 * <li>exception - if you throw an exception, this serial port will be excluded from the list, and not shown to users.</li>
 * <li>promise - a promise that resolves to one of the above.  In this case, an exception is just a failed promise.</li>
 * </ul>
 *
 * In the case of returning an exception or failed promise, this is an opportunity to filter the list of serial ports
 * in a transport independent way.   
 * 
 * @callback gc.autoDetectPortIdentity
 * @example
 * gc.autoDetectPortIdentity = function(port, helperAPI) {
 *     if (!helperAPI.isHid(port) || port.productId !== 769) 
 *         return;  // return undefined for unknown port for identification.
 *         
 *     return helperAPI.serialPortConnect().then(function() {
 *         var u2a = helperAPI.createPacketCodec('usb2any');  
 *         return u2a.connect(...).then(function() {
 *             // ... do identification through codec apis ...
 *             return deviceName;  // use device name as identifier for a particular port 
 *         }).finally(function() {
 *             u2a.disconnect();
 *             return helperAPI.serialPortDisconnect();
 *         });
 *     });
 * };
 * @param {object} port - the specific model that device detection is required for. 
 * @param {gc.databind.IAutoDetectPortIdentityHelper} helperMethods - api to access information, as well as, to open and close 
 * the serial port for the purposes of identifying the connected device.
 * @return {string|promise} an object or string to identify the device, or a promise that returns this information. 
 */

