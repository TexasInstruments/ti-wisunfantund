const {ClientState, getLatestProp} = require('./ClientState');
const chokidar = require('chokidar');
const {SerialPort} = require('serialport');
const {borderRouterLogger} = require('./logger');
const {WfantundManager} = require('./WfantundManager');
const {CONSTANTS} = require('./AppConstants');
const {getLatestTopology} = require('./topology');

/**
 *
 * Manage the connection and lifecyle of the border router
 * This includes:
 * - starting/stopping wfantund
 * - watching /dev/ttyACMX
 * - updating NCP properties
 *
 */
class BorderRouterManager {
  /**
   * On creation, the file watcher is setup to track the
   * serial port (/dev/tty...) and run appropriate functions
   * when the BR is connected, and stop them when it
   * disconnects.
   */
  constructor() {
    this.watcher = chokidar.watch(CONSTANTS.BR_FILE_PATH, {
      ignored: /^\./,
      persistent: true,
      ignorePermissionErrors: true,
    });
    this.wfantundManager = new WfantundManager();
    this.ncpPropertyUpdateIntervalID;
    this.watcher
      .on('add', this.deviceAdded)
      .on('unlink', this.deviceRemoved)
      .on('error', function (error) {
        borderRouterLogger.error(error);
      });
  }

  /**
   * Sets the new ClientState connected status
   */
  set connected(newConnectionStatus) {
    ClientState.connected = newConnectionStatus;
  }

  /**
   * Gets the ClientState connected status
   */
  get connected() {
    return ClientState.connected;
  }

  /**
   * This function is called when the BR is connected to the
   * device at the specified serial port. This function starts
   * wfantund, updates all the properties (retrieving from the
   * DBus API), and sets the interval functions to continue to
   * update all the properties at times specified by the
   * APP_CONSTANTS.
   */
  deviceAdded = () => {
    borderRouterLogger.info('Border router connected');
    //TODO determine beahvior in the event that wfantund errors out (crashes)
    this.wfantundManager.start();
    this.connected = true;
    this.updateNCPProperties();
    this.updateTopology();
    this.ncpPropertyUpdateIntervalID = setInterval(
      this.updateNCPProperties,
      CONSTANTS.PROPERTY_UPDATE_INTERVAL
    );
    this.topologyUpdateIntervalID = setInterval(
      this.updateTopology,
      CONSTANTS.TOPOLOGY_UPDATE_INTERVAL
    );
  };

  /**
   * This is called by the file watcher when the border router
   * is disconnected from the device (watching the serial port).
   * This function clears the property updates and resets the BR
   * connection status.
   */
  deviceRemoved = () => {
    clearInterval(this.ncpPropertyUpdateIntervalID);
    clearInterval(this.topologyUpdateIntervalID);
    borderRouterLogger.info('Border router disconnected');
    this.connected = false;
  };

  /**
   * Retrieve all of the property values from the DBus API
   * and update the ClientState with their new values
   */
  updateNCPProperties = async () => {
    for (const property in ClientState.ncpProperties) {
      try {
        let propertyValue = await getLatestProp(property);
        if (JSON.stringify(propertyValue) !== JSON.stringify(ClientState.ncpProperties[property])) {
          ClientState.ncpProperties[property] = propertyValue;
        }
      } catch (error) {
        borderRouterLogger.debug(`Failed to update property: ${property}. ${error}`);
      }
    }
  };

  /**
   * Updates the topology if there are any changes.
   * The routes are the only part of the ClientState that
   * demonstrate changes to the topology. Other parameters,
   * such as each link's rssiIn and rssiOut will not change
   * the actual topology, so they aren't included in the BR
   * logger's info message 'TOPOLOGY CHANGED'
   */
  updateTopology = async () => {
    try {
      const newTopology = await getLatestTopology(ClientState);
      if (newTopology === undefined) {
        return;
      }
      if (JSON.stringify(newTopology) !== JSON.stringify(ClientState.topology)) {
        if (JSON.stringify(newTopology.routes) !== JSON.stringify(ClientState.topology.routes))
          borderRouterLogger.info('TOPOLOGY CHANGED');
        Object.assign(ClientState.topology, newTopology);
      }
    } catch (error) {
      borderRouterLogger.debug(`Failed to update Topology. ${error}`);
    }
  };

  /**
   *
   * @returns {Promise}
   * Resets the Border Router by sending the SPINEL
   * command, CMD_RESET, over UART. This will only
   * be called if the reset over DBus cannot be
   * completed
   *
   */
  reset = async () => {
    return new Promise(async (resolve, reject) => {
      if (!this.connected) {
        reject('BR not Connected. Cannot Reset');
      }
      if (this.wfantundManager.isRunning()) {
        try {
          await this.wfantundManager.kill();
        } catch (e) {
          reject(e);
        }
      }
      const port = new SerialPort({baudRate: 115200, path: CONSTANTS.BR_FILE_PATH}, err => {
        if (err) {
          borderRouterLogger.error(`Serial Port Error ${err}`);
          return;
        }
        port.write(Buffer.from('7e8101da8b7e', 'hex'), err => {
          if (err) {
            reject('Successfully opened but failed to deliver reset message on Serial Port');
          }
          port.close(err => {
            if (err) {
              borderRouterLogger.error(`Serial Port Error ${err}`);
              reject('Failed to close Serial Port');
            }
            this.wfantundManager.start();
            resolve();
          });
        });
      });
    });
  };

  /**
   * On program exit, close the file watcher for the BR serial port
   */
  exit = async () => {
    // Not necessary to kill on exit (seems to cause issues when stopping and starting app quickly)
    await this.wfantundManager.kill();
    await this.watcher.close();
  };
}

module.exports = {BorderRouterManager};
