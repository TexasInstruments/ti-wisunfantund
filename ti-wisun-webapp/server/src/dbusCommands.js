const dbus = require('dbus-next');
const {WFANTUND_STATUS} = require('./wfantundConstants');
const {getKeyByValue} = require('./utils.js');
const {dbusLogger} = require('./logger.js');

/**
 * DBus Interface connection information
 */
const DBUS_BUS_NAME = 'com.nestlabs.WPANTunnelDriver';
const DBUS_OBJECT_PATH = '/com/nestlabs/WPANTunnelDriver/wfan0';
const DBUS_INTERFACE = 'com.nestlabs.WPANTunnelDriver';

const bus = dbus.systemBus();

/**
 * This function sends a DBus message with the property to get
 * and the newValue to update (for a set/insert/remove) in the
 * message body. This is used for all of the commands (get, set,
 * reset, insert, remove) with some of the values unused for
 * properties like reset, where only the command is necessary.
 * @param {NCPProperty} command
 * @param {NCPProperty} property
 * @param {NCPProperty} newValue
 * @returns {NCPProperty | Error}
 */
async function sendDBusMessage(command, property, newValue) {
  let methodCall = new dbus.Message({
    destination: DBUS_BUS_NAME,
    path: DBUS_OBJECT_PATH,
    interface: DBUS_INTERFACE,
    member: command,
    signature: 'ss',
    body: [property, newValue],
  });
  dbusLogger.debug(`${command} ${property} ${newValue}`);
  try {
    let dbusReply = await bus.call(methodCall);
    if (dbusReply === null) {
      throw Error('DBUS Reply Null');
    }
    if (dbusReply.body[0] !== WFANTUND_STATUS.Ok) {
      //dbusReply.body[0] is a wfantund status e.g. code 7 for timeout or code 0 for ok
      const errorKey = getKeyByValue(WFANTUND_STATUS, dbusReply.body[0]);
      if (errorKey === undefined) {
        //error key isn't found in WFA
        throw Error('Received dbus reply with invalid wfantund status');
      }
      dbusLogger.debug(`wfantund command return status: ${errorKey}`);
      throw Error(`Received not ok status: ${errorKey}`);
    }
    if (dbusReply.type !== 2) {
      dbusLogger.debug(`Not Return messageType: ${dbusReply.type}`);
    }
    return dbusReply.body[1];
  } catch (error) {
    //e.g. the member/interface can't be found
    dbusLogger.debug(`${command} Failed. ${error.message}`);
    throw Error(`DBUS Message Call Failure. ${error.message}`);
  }
}

/**
 * This function sends a command to get the specified
 * NCPProperty through the DBus API
 * @param {NCPProperty} property
 * @returns {NCPProperty}
 */
async function getPropDBUS(property) {
  return await sendDBusMessage('PropGet', property, '');
}

/**
 * This function sends a command to set the specified
 * NCPProperty with the newValue through the DBus API
 * @param {NCPProperty} property
 * @param {NCPProperty} newValue
 * @returns {NCPProperty}
 */
async function setPropDBUS(property, newValue) {
  return await sendDBusMessage('PropSet', property, newValue);
}

module.exports = {
  sendDBusMessage,
  setPropDBUS,
  getPropDBUS,
};
