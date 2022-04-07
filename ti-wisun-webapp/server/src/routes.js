const express = require('express');
const cors = require('cors');
const {httpLogger, borderRouterLogger} = require('./logger.js');
const {ClientState, setProp, resetTopology, defaultAutoPing} = require('./ClientState.js');
const {PingExecutor} = require('./PingExecutor.js');
const {BorderRouterManager} = require('./BorderRouterManager.js');
const path = require('path');
const {sendDBusMessage} = require('./dbusCommands.js');
const {CONSTANTS} = require('./AppConstants');
const {SerialPort} = require('serialport');
const {postLEDStates} = require('./coapCommands.js');

/**
 * This function sets up all of the webserver endpoints
 * for the client to update and retrieve information from
 * the server.
 * @param {*} app
 * @param {PingExecutor} pingExecutor
 * @param {BorderRouterManager} borderRouterManager
 */
function initializeRoutes(app, pingExecutor, borderRouterManager) {
  app.use(cors());
  app.use(express.json());

  /**
   * Send the built React files (html, css, js) to
   * the client at the root endpoint.
   */
  const REACT_FILES_PATH = path.resolve(path.join(__dirname, '../../client/build'));
  app.use(express.static(REACT_FILES_PATH));
  app.use(express.static(CONSTANTS.OUTPUT_DIR_PATH));
  app.use((req, res, next) => {
    httpLogger.info(`${req.ip} ${req.method} ${req.originalUrl}`);
    next();
  });

  /**
   * Webserver endpoint for getting the topology
   * from the ClientState object.
   */
  app.get('/topology', (req, res) => {
    res.json(ClientState.topology);
  });

  /**
   * Webserver endpoint to create a single pingburst
   * with the ping settings specified from the body
   * of the HTTP request.
   */
  app.post('/pingbursts', (req, res) => {
    const id = pingExecutor.handleRequest(req.body);
    if (id === -1) {
      res.json({wasSuccess: false, message: 'Border Router does not have IP'});
    } else {
      res.json({id});
    }
  });

  /**
   * Webserver endpoint to abort a single pingburst
   * with the destination IP specified from the body
   * of the HTTP request.
   */
  app.post('/abortpingburst', (req, res) => {
    const destIP = req.body.destIP;
    const wasAbortSuccess = pingExecutor.abort(destIP);
    res.json({destIP, wasAbortSuccess});
  });

  /**
   * Webserver endpoint to abort all of the active pingbursts
   */
  app.get('/abortAllPingbursts', (req, res) => {
    pingExecutor.abortAll();
  });

  /**
   * Webserver endpoint to cancel auto pinging.
   * This endpoint also aborts all of the current pingbursts.
   */
  app.get('/cancelAutoPing', (req, res) => {
    ClientState.autoPing = defaultAutoPing();
    pingExecutor.abortAll();
  });

  /**
   * Webserver endpoint to set LED states for the selected nodes
   * Either turns on/off the green/red LEDs
   */
  app.post('/setLEDStates', (req, res) => {
    const {ipAddresses, color, newValue} = req.body;
    for (const ipAddr of ipAddresses) {
      postLEDStates(ipAddr, color, newValue);
    }
    res.json('success');
  });

  /**
   * Webserver endpoint for getting the connected value
   * from the ClientState object.
   */
  app.get('/connected', (req, res) => {
    res.json(ClientState.connected);
  });

  /**
   * Webserver endpoint for getting an NCP property.
   * Parameters are passed through the query
   * with the following structure:
   * `property=<NCP property of choice>`
   *
   * Example getting the CCA Threshold:
   * get /getProp?property=NCP:CCAThreshold
   *
   * Sends a json response with @param {wasSuccess} to indicate
   * if the property was retrieved successfully.
   */
  app.get('/getProp', (req, res) => {
    const propertyValue = ClientState.ncpProperties[req.query.property];
    if (propertyValue === undefined) {
      res.json({wasSuccess: false});
    } else {
      res.json({
        [req.query.property]: propertyValue,
      });
    }
  });

  /**
   * Webserver endpoint for getting the stored NCP properties
   * from the ClientState object.
   */
  app.get('/getProps', (req, res) => {
    res.json(ClientState.ncpProperties);
  });

  /**
   * Webserver endpoint for resetting the BR (NCP)
   *
   * Sends a json response with @param {wasSuccess} to indicate
   * if the BR was reset successfully.
   */
  app.get('/reset', async (req, res) => {
    resetTopology();
    try {
      await sendDBusMessage('ResetNCP', '', '');
      res.json({wasSuccess: true});
    } catch (e1) {
      borderRouterLogger.error('DBus Reset Unsuccessful, attempting direct UART reset...');
      try {
        await borderRouterManager.reset();
        borderRouterLogger.info('UART Reset successful!');
        res.json({wasSuccess: true});
      } catch (e2) {
        borderRouterLogger.error('UART reset also unsuccessful');
        res.json({wasSuccess: false, message: `${e1.message}\n${e2.message}`});
      }
    }
  });

  /**
   * Webserver endpoint for setting an NCP property.
   * Parameters are passed through the query
   * with the following structure:
   * `property=<NCP property of choice>`
   * `newValue=<new value for NCP property>`
   *
   * Example setting the CCA Threshold to -60:
   * get /setProp?property=NCP:CCAThreshold&newValue=-60
   *
   * Sends a json response with @param {wasSuccess} to indicate
   * if the property was set successfully.
   */
  app.get('/setProp', async (req, res) => {
    if (ClientState.connected) {
      try {
        await setProp(req.query.property, req.query.newValue);
        res.json({wasSuccess: true});
      } catch (error) {
        res.json({wasSuccess: false, message: error.message});
      }
    } else {
      res.json({wasSuccess: false, message: 'Border Router Not Connected'});
    }
  });

  /**
   * Webserver endpoint for inserting or removing from the
   * macfilterlist. Parameters are passed through the query
   * with the following structure:
   * `newValue=<16 hex digit mac address>`
   * `insert=<true or false>`
   *
   * Example removing a macfilter aaaabbbbccccdddd:
   * get /macfilterUpdate?newValue=aaaabbbbccccdddd&insert=false
   *
   * Example adding a macfilter aaaabbbbccccdddd:
   * get /macfilterUpdate?newValue=aaaabbbbccccdddd&insert=true
   *
   * Sends a json response with @param {wasSuccess} to indicate
   * if the macfilter was added or removed successfully.
   */
  app.get('/macfilterUpdate', async (req, res) => {
    if (ClientState.connected) {
      try {
        if (req.query.insert === 'true') {
          await sendDBusMessage('PropInsert', 'macfilterlist', req.query.newValue);
        } else if (req.query.insert === 'false') {
          await sendDBusMessage('PropRemove', 'macfilterlist', req.query.newValue);
        }
        res.json({wasSuccess: true});
      } catch (error) {
        res.json({wasSuccess: false, message: error.message});
      }
    } else {
      res.json({wasSuccess: false, message: 'Border Router Not Connected'});
    }
  });
}

module.exports = {initializeRoutes};
