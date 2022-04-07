const {parseMacFilterList, parseNCPIPv6, parseChList} = require('./parsing.js');
const {getPropDBUS, setPropDBUS} = require('./dbusCommands.js');
const {appStateLogger} = require('./logger.js');
const {observe, generate} = require('fast-json-patch');

/**
 * This function sets all of the NCP
 * properties to null by default
 */
const defaultNCPProperties = () => {
  return {
    'NCP:State': null,
    'NCP:ProtocolVersion': null,
    'NCP:Version': null,
    'NCP:InterfaceType': null,
    'NCP:HardwareAddress': null,
    'NCP:CCAThreshold': null,
    'NCP:TXPower': null,
    'NCP:Region': null,
    'NCP:ModeID': null,
    unicastchlist: null,
    broadcastchlist: null,
    asyncchlist: null,
    chspacing: null,
    ch0centerfreq: null,
    'Network:Panid': null,
    bcdwellinterval: null,
    ucdwellinterval: null,
    bcinterval: null,
    ucchfunction: null,
    bcchfunction: null,
    macfilterlist: null,
    macfiltermode: null,
    'Interface:Up': null,
    'Stack:Up': null,
    'Network:NodeType': null,
    'Network:Name': null,
    'IPv6:AllAddresses': [],
  };
};

/**
 * This function returns the default topology (empty)
 */
const defaultTopology = () => {
  return {
    numConnected: 0,
    //list of connected ips (including border router)
    connectedDevices: [],
    //array of routes from root to leaf
    routes: [],
    //cytoscape style graph
    graph: {nodes: [], edges: []},
  };
};

/**
 * This function returns the default autoPing settings
 */
const defaultAutoPing = () => {
  return {
    on: false,
    packetSize: null,
    timeout: null,
    interval: null,
    numPacketsRemaining: null,
  };
};

/**
 * The ClientState object is central to the dataflow
 * from the server to the client. This non-circular
 * JS Object is synced via socket.io to the client.
 */
const ClientState = {
  //Number of elaboration of mesh connections
  topology: defaultTopology(),
  // Ping jobs that are currently executing
  pingbursts: [],
  // Past ping records (up to 100 in memory, but all saved to CSV)
  pingrecords: [],
  // Is device connected
  connected: false,
  // NCP Properties (from DBus API)
  ncpProperties: defaultNCPProperties(),
  // Auto ping settings
  autoPing: defaultAutoPing(),
};

/**
 * Method for retrieving the ClientState
 * @returns {ClientState}
 */
function getClientState() {
  return ClientState;
}

/**
 * Method for retrieving the ClientState's topology
 * @returns {topology}
 */
function getTopology() {
  return ClientState.topology;
}

/**
 * This function initializes the socket to send
 * ClientState patches to the client. By sending patches,
 * only necessary data is transmitted. Also, on socket
 * connection, the initial state is sent (larger than patches).
 * @param {SocketIOServer} io
 */
function initializeSocketIOEvents(io) {
  const clientStateObserver = observe(ClientState);

  setInterval(() => {
    const patches = generate(clientStateObserver);
    if (patches.length > 0) {
      appStateLogger.debug(`Sending State Patch to Clients. ${JSON.stringify(patches, null, 2)}`);
      io.emit('stateChange', patches);
    }
  }, 50);

  io.on('connection', socket => {
    socket.emit('initialState', ClientState);
    appStateLogger.info('SocketIO Client Connection Established. Sending State');
    appStateLogger.debug(JSON.stringify(ClientState, null, 2));
  });
}

/**
 * This function calls on the DBus API to retrieve
 * the most recent value for the NCP property specified.
 * @param {NCPProperty} property
 * @returns {NCPProperty}
 */
async function getLatestProp(property) {
  let propValue = await getPropDBUS(property);
  switch (property) {
    case 'unicastchlist':
    case 'broadcastchlist':
    case 'asyncchlist':
      propValue = parseChList(propValue);
      break;
    case 'macfilterlist':
      propValue = parseMacFilterList(propValue);
      break;
    case 'IPv6:AllAddresses':
      propValue = parseNCPIPv6(propValue);
      break;
    case 'NCP:HardwareAddress':
      propValue = Buffer.from(propValue).toString('hex');
      break;
    case 'Network:Panid':
      propValue = `0x${propValue.toString(16).toUpperCase().padStart(4, '0')}`;
      break;
  }
  return propValue;
}

/**
 * This function returns BR IP Info.
 * @returns {undefined | string} ip address
 */
function getNetworkIPInfo(ClientState) {
  return ClientState.ncpProperties['IPv6:AllAddresses'].find(
    entry => entry.ip.substring(0, 4) !== 'fe80'
  );
}

/**
 * Reset the ClientState's NCPProperties to the default values.
 */
function resetNCPPropertyValues() {
  Object.assign(ClientState.ncpProperties, defaultNCPProperties());
}

/**
 * Reset the Clientstate's Topology to the default state.
 */
function resetTopology() {
  Object.assign(ClientState.topology, defaultTopology());
}

/**
 * This function sends a set command to the DBus API
 * and then gets the latest value to update the ClientState
 * with the changes
 * @param {NCPProperty} property
 * @param {NCPProperty} newValue
 * @returns {NCPProperty}
 */
async function setProp(property, newValue) {
  if (typeof property !== 'undefined' && newValue !== '') {
    await setPropDBUS(property, newValue);
    const latestValue = await getLatestProp(property);
    return latestValue === newValue;
  }
  return false;
}

module.exports = {
  ClientState,
  resetNCPPropertyValues,
  resetTopology,
  setProp,
  getLatestProp,
  getNetworkIPInfo,
  initializeSocketIOEvents,
  defaultAutoPing,
  getTopology,
};
