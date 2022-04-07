const winston = require('winston');
const fs = require('fs');
const path = require('path');
const {format} = winston;
const {combine, label, timestamp, printf, prettyPrint, align, colorize} = format;

/*
RFC5424 the syslog levels (what is reference by winston.config.syslog.levels)
{
  emerg: 0,
  alert: 1,
  crit: 2,
  error: 3,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7
}
*/

/**
 * Path to the logs directory
 * (both wfantund.log and combined.log inside)
 */
const LOG_DIR_PATH = '/tmp/ti-wisun-webapp/logs';

/**
 * Create the logs directories if not already existant
 */
if (!fs.existsSync(LOG_DIR_PATH)) {
  fs.mkdirSync(LOG_DIR_PATH, {recursive: true});
}

/**
 * This function makes a logger to output to the console for
 * status updates and easier debugging.
 * @param {string} loggerLabel
 * @param {boolean} showOnConsole
 * @param {string} fileName
 * @returns
 */
function makeLogger(loggerLabel, showOnConsole = true, fileName = 'combined.log') {
  let transports = [];
  const defaultFileTransport = new winston.transports.File({
    filename: path.join(LOG_DIR_PATH, fileName),
    options: {flags: 'w'}, //overwrites current log
    format: combine(
      label({label: loggerLabel}),
      timestamp({format: 'YYYY.MM.DD HH:mm:ss'}),
      align(),
      prettyPrint(),
      printf(info => `[${info.timestamp} - ${info.level}] <${info.label}> ${info.message}`)
    ),
  });
  transports.push(defaultFileTransport);
  const defaultConsoleTransport = new winston.transports.Console({
    level: process.env['WFANTUND_WEBSERVER_LOG_LEVEL'] || 'info',
    format: combine(
      label({label: loggerLabel}),
      colorize(),
      timestamp({format: 'YYYY.MM.DD HH:mm:ss'}),
      prettyPrint(),
      printf(info => `[${info.timestamp} - ${info.level}] <${info.label}> ${info.message}`)
    ),
  });
  if (showOnConsole) {
    transports.push(defaultConsoleTransport);
  }
  winston.loggers.add(loggerLabel, {
    levels: winston.config.syslog.levels,
    transports,
  });
  return winston.loggers.get(loggerLabel);
}

/**
 * Make all of the necessary loggers
 */
const dbusLogger = makeLogger('DBUS');
const httpLogger = makeLogger('HTTP');
const topologyLogger = makeLogger('TOPOLOGY');
const pingLogger = makeLogger('PING');
const wfantundLogger = makeLogger('WFANTUND', false, 'wfantund.log');
const borderRouterLogger = makeLogger('BORDER ROUTER');
const appStateLogger = makeLogger('APP_STATE');

module.exports = {
  dbusLogger,
  httpLogger,
  pingLogger,
  topologyLogger,
  wfantundLogger,
  borderRouterLogger,
  appStateLogger,
};
