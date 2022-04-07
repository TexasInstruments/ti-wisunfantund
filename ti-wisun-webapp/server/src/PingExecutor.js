const ping = require('ping');
const path = require('path');
const fs = require('fs');
const {CONSTANTS, setupTmpDirs} = require('./AppConstants');
const {pingLogger, appStateLogger} = require('./logger.js');
const {ClientState, getNetworkIPInfo} = require('./ClientState');
const {repeatNTimes, timestamp, intervalWithAbort} = require('./utils.js');

/**
 * The PingExecutor class handles the ping jobs
 * for the webserver. This includes printing out
 * the results to a CSV file.
 */
class PingExecutor {
  /**
   * Get the ClientState's pingbursts array
   */
  get pingbursts() {
    return ClientState.pingbursts;
  }

  /**
   * Set the ClientState's pingbursts array to a new value
   */
  set pingbursts(newPingBursts) {
    ClientState.pingbursts = newPingBursts;
  }

  /**
   * On creation, write the header to the csv file
   * with all of the column names (destIP, start_time, etc.)
   */
  constructor() {
    const csvHeaders = 'destIP,start_time,duration,packetSize,wasSuccess\n';
    const outputFilePath = path.join(CONSTANTS.OUTPUT_DIR_PATH, CONSTANTS.PING_RESULTS_FILE_NAME);
    fs.writeFile(outputFilePath, csvHeaders, function (err) {
      if (err) throw err;
    });
  }

  /**
   * Given a pingrecord, add a row in the CSV file
   * with all of the necessary column's data.
   * @param {Object} pingrecord
   */
  appendPingRecordToCSV(pingrecord) {
    let {destIP, start, duration, packetSize, wasSuccess} = pingrecord;
    start = start.replace(',', '');
    const rowString = [destIP, start, duration, packetSize, wasSuccess].join(',') + '\n';
    const outputFilePath = path.join(CONSTANTS.OUTPUT_DIR_PATH, CONSTANTS.PING_RESULTS_FILE_NAME);
    fs.appendFile(outputFilePath, rowString, function (err) {
      if (err) {
        appStateLogger.error(err);
      }
    });
  }

  /**
   * Send a ping to the IP address specified in the input
   * pingburstRequest. In addition, the timeout and packetSize
   * are taken from the pingburstRequest.
   * @param {Object} pingburstRequest
   * @returns {start, duration, wasSuccess}
   */
  getPingResult = async pingburstRequest => {
    pingLogger.info(`Ping ${JSON.stringify(pingburstRequest)}. `);

    const start = timestamp(new Date());

    let res;
    try {
      res = await ping.promise.probe(pingburstRequest.destIP, {
        timeout: pingburstRequest.timeout,
        packetSize: pingburstRequest.packetSize,
        v6: true,
      });
    } catch (error) {
      return {start, duration: -1, wasSuccess: false};
    }

    if (res.alive) {
      return {start, duration: res.time, wasSuccess: true};
    } else {
      return {start, duration: -1, wasSuccess: false};
    }
  };

  /**
   * Abort all current pingbursts (ping jobs)
   */
  abortAll = () => {
    for (const pingburst of this.pingbursts) {
      pingburst.abortPingburst();
    }
    // Reset object
    this.pingbursts = [];
  };

  /**
   * Abort a pingburst with the specified destination IP
   * address. Returns true if the pingburst existed and was
   * aborted successfully.
   * @param {IPAddress} destIP
   * @returns {boolean}
   */
  abort = destIP => {
    const pingburst = this.pingbursts.find(pingburst => pingburst.destIP === destIP);
    let wasSuccess = false;
    if (pingburst && pingburst.abortPingburst) {
      wasSuccess = pingburst.abortPingburst();
      this.pingbursts = this.pingbursts.filter(pingBurst => pingburst.destIP !== pingBurst.destIP);
    }
    return wasSuccess;
  };

  /**
   * This function is called to setup a new pingburst. From
   * the pingburstRequest data, autoPing can be turned on,
   * a preexisting pingburst with the same IP will be aborted,
   * and a new pingburst will be setup (to ping at an interval for
   * a specified number of times based on the pingburstRequest
   * can be integer or infinite)).
   * @param {Object} pingburstRequest
   * @returns {integer status}
   */
  handleRequest = pingburstRequest => {
    const sourceIP = getNetworkIPInfo(ClientState);
    if (sourceIP === undefined) {
      pingLogger.info('Tried to start pingburst without border router IP!');
      return -1;
    }
    let pingburst = pingburstRequest;

    // Set autoping based on request
    if (pingburstRequest.autoPing) {
      ClientState.autoPing = {
        on: true,
        ...pingburstRequest,
      };
    }

    // Don't create a ping request for 'none'
    if (pingburst.destIP === 'none') {
      return 1;
    }

    // Abort any current pingbursts with this destIP
    this.abort(pingburst.destIP);

    const n = pingburst.numPacketsRemaining;
    // Interval in s converted to ms
    const interval = pingburst.interval * 1000;
    let abortFuturePingbursts = null;
    if (n === '∞') {
      abortFuturePingbursts = intervalWithAbort(this.performPing, interval, pingburst);
    } else {
      abortFuturePingbursts = repeatNTimes(this.performPing, interval, n, pingburst);
    }
    pingburst['abortPingburst'] = function () {
      const success = abortFuturePingbursts();
      return success;
    };
    this.pingbursts.push(pingburst);

    return 1;
  };

  /**
   * Do everything to perform the ping for an IP address
   * specified in the pingburst object. This includes sending the ping,
   * appending the record to the CSV file, and adding the pingrecord to
   * the ClientState's pingrecords array.
   * @param {Object} pingburst
   * @returns
   */
  performPing = async pingburst => {
    const networkIPInfo = getNetworkIPInfo(ClientState);
    if (networkIPInfo === undefined) {
      pingLogger.info('Tried to start pingburst without border router IP!');
      return -1;
    }
    const {ip: sourceIP} = networkIPInfo;
    const {start, duration, wasSuccess} = await this.getPingResult(pingburst);
    const {destIP, packetSize} = pingburst;
    let pingrecord = {
      sourceIP: sourceIP,
      destIP: destIP,
      start: start,
      duration: duration,
      packetSize: packetSize,
      wasSuccess: wasSuccess,
    };
    this.appendPingRecordToCSV(pingrecord);
    if (ClientState.pingrecords.length === 100) {
      // Remove first item if length is 100 (Max length is 100)
      ClientState.pingrecords.pop();
    }
    // Insert record to front of list
    ClientState.pingrecords.unshift(pingrecord);

    if (pingburst.numPacketsRemaining !== '∞') {
      pingburst.numPacketsRemaining--;
    }

    if (pingburst.numPacketsRemaining === 0) {
      pingburst.abortPingburst();
      this.pingbursts = this.pingbursts.filter(pingBurst => pingburst.destIP !== pingBurst.destIP);
    }
    return true;
  };
}

/**
 * Setup the temp directories so the ping executor can create
 * the CSV file in the newly created directories.
 */
setupTmpDirs();
const pingExecutor = new PingExecutor();

/**
 * Allows other modules to use the ping executor, including
 * the topology.js module (for autopinging).
 * @returns {PingExecutor}
 */
function getPingExecutor() {
  return pingExecutor;
}

module.exports = {getPingExecutor};
