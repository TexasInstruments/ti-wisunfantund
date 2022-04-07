const {wfantundLogger} = require('./logger');
const {spawn} = require('child_process');
const {CONSTANTS} = require('./AppConstants');

/**
 * Starts and Manages a wfantund process
 */
class WfantundManager {
  constructor() {
    this.wfantund = null;
  }

  /**
   * This function returns if wfantund is currently running
   */
  isRunning() {
    return this.wfantund !== null;
  }

  /**
   * Starts wfantund and logs the different outputs
   * to the file specified by the CONSTANTS.BR_FILE_PATH.
   */
  start() {
    // Don't start wfantund while in dev mode
    if (CONSTANTS.MANUAL_DEV_MODE) return;

    wfantundLogger.info('Starting wfantund');
    this.wfantund = spawn(CONSTANTS.WFANTUND_PATH, ['-s', CONSTANTS.BR_FILE_PATH]);
    this.wfantund.on('error', () => {
      wfantundLogger.error('Failed to start wfantund');
    });
    this.wfantund.stdout.on('data', data => {
      wfantundLogger.debug(`stdout: ${data}`);
    });
    this.wfantund.stderr.on('data', data => {
      wfantundLogger.info(`stderr: ${data}`);
    });
    this.wfantund.on('close', code => {
      wfantundLogger.info('wfantund is closing');
      this.wfantund = null;
      if (code === 0) {
        wfantundLogger.info(`Exited Successfully`);
      } else {
        wfantundLogger.error(`Exited with code ${code}`);
      }
    });
  }

  /**
   * This function kills wfantund if it is currently running
   * @returns {Promise}
   */
  kill() {
    return new Promise((resolve, reject) => {
      if (this.wfantund === null) {
        reject('wfantund not running. Cannot kill');
      }
      wfantundLogger.info('Killing wfantund');
      this.wfantund.on('close', code => {
        wfantundLogger.info('wfantund is closing from a kill');
        wfantundLogger.error(`Exited with code ${code}`);
        this.wfantund = null;
        resolve();
      });
      const wasSuccessful = this.wfantund.kill('SIGHUP');
      if (!wasSuccessful) {
        reject('kill unsuccessful');
      }
    });
  }
}
module.exports = {WfantundManager};
