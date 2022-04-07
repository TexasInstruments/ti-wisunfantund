const express = require('express');
const {httpLogger} = require('./logger.js');
const {initializeRoutes} = require('./routes.js');
const {BorderRouterManager} = require('./BorderRouterManager.js');
const {getPingExecutor} = require('./PingExecutor.js');
const http = require('http');
const SocketIOServer = require('socket.io').Server;
const {CONSTANTS, setAppConstants, assertDependencies} = require('./AppConstants.js');
const {initializeSocketIOEvents} = require('./ClientState');

/**
 * This is the program entry and exit. From here all
 * of the app constants are setup, wfantund is started,
 * the express webserver (with an http server using socket.io)
 * is initialized, the BR manager is setup, the ping executor
 * is setup, and then all of the webserver endpoints are setup.
 */
function main() {
  setAppConstants();
  assertDependencies();
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer);
  initializeSocketIOEvents(io);
  const brManager = new BorderRouterManager();
  const pingExecutor = getPingExecutor();
  initializeRoutes(app, pingExecutor, brManager);

  httpServer.listen(CONSTANTS.PORT, CONSTANTS.HOST, () => {
    httpLogger.info(`Listening on http://${CONSTANTS.HOST}:${CONSTANTS.PORT}`);
  });
  process.on('exit', async code => {
    await brManager.exit();
  });
}

main();
