const {getPropDBUS, setPropDBUS} = require('./dbusCommands.js');
const {topologyLogger} = require('./logger.js');
const {parseConnectedDevices, parseDodagRoute, canonicalIPtoExpandedIP} = require('./parsing.js');
const {getNetworkIPInfo, getTopology} = require('./ClientState.js');
const {getPingExecutor} = require('./PingExecutor.js');
const fetch = require('node-fetch');
const {getLEDStates, getRSSIValues} = require('./coapCommands.js');

/**
 * This function takes an array of array of IP addresses and
 * creates the nodes and edges of the graph (only adds nodes/edges not in the existing graph)
 * @param {graph} existingGraph
 * @param {Array of Array of IP Addresses} routes
 * @returns {nodes, edges}
 */
function routesToGraph(existingGraph, routes) {
  let nodes = [];
  //populate nodes
  for (const route of routes) {
    for (const ipAddress of route) {
      if (!nodes.some(node => node.data.id === ipAddress)) {
        const existingNode = existingGraph.nodes.find(node => node.data.id === ipAddress);
        if (existingNode) {
          nodes.push(existingNode);
        } else {
          nodes.push({
            data: {
              id: ipAddress,
            },
          });
        }
      }
    }
  }
  //populate edges
  let edges = [];
  for (const route of routes) {
    let numPairs = route.length - 1;
    for (let i = 0; i < numPairs; i++) {
      const edge = {};
      edge.source = route[i];
      edge.target = route[i + 1];
      edge.id = `${edge.source}->${edge.target}`;
      const newEdgeId = edge.id;

      if (!edges.some(otherEdge => otherEdge.data.id === edge.id)) {
        const existingEdge = existingGraph.edges.find(edge => edge.data.id === newEdgeId);
        if (existingEdge) edges.push(existingEdge);
        else edges.push({data: edge});
      }
    }
  }
  return {nodes, edges};
}

/**
 * Calls the necessary DBus methods for updating topology fields.
 * This includes the numConnected, connectedDevices, the routes in
 * the topology, and the actual cytoscape graph object. In addition,
 * this is where the auto pinging is started when nodes join or disconnect.
 * E.g. if a node joined and auto ping is on, a new pingburst will be
 * created with the ClientState.autoPing options. Likewise if a node
 * disconnected and it had a job, the pingburst will be deleted.
 *
 * Additional functionality was added for testing with mockTopologies.
 * To use the mockTopology, run the mockTopology.test.js in a separate
 * terminal and add nodes to its mockDevices array. Once there is >0 nodes
 * in the mockDevices, this function checks and will replace the actual
 * topology with the mockTopology.
 */
async function getLatestTopology(ClientState) {
  const borderRouterIPInfo = getNetworkIPInfo(ClientState);
  if (borderRouterIPInfo === undefined) {
    topologyLogger.debug('Attempted to get latest topology with no Border Router IP address!');
    return;
  }

  try {
    let numConnected = 0;
    let connectedDevicesSet = new Set();
    let rssiValues = new Map();
    let fetchedAllDevices = false;
    const MAX_ITERATIONS = 100;
    let iterations = 0;
    while (!fetchedAllDevices && iterations < MAX_ITERATIONS) {
      // the DBUS connecteddevices property is a paginated version of the network's connected devices
      // Ideally, the numconnected DBUS property would be a good way to check
      // the number of pages. (at the time of writing numconnected gives no useful output)
      // The hacky way that is being done here is to keep going until we see an address we have seen before
      const [numInBatch, connectedDevicesBatch] = parseConnectedDevices(
        await getPropDBUS('connecteddevices')
      );
      if (connectedDevicesBatch.length === 0) {
        fetchedAllDevices = true;
      }

      for (const connectedDevice of connectedDevicesBatch) {
        if (connectedDevicesSet.has(connectedDevice)) {
          fetchedAllDevices = true;
        } else {
          numConnected += 1;
          connectedDevicesSet.add(connectedDevice);
        }
      }
      iterations++;
    }

    // Get mockDevices
    let mockDevices;
    try {
      let res = await fetch('http://localhost:9999/mockDevices');
      let resJson = await res.json();
      mockDevices = JSON.parse(resJson);
    } catch (error) {
      // Don't do anything now
    }

    // If mockDevices doesn't exist, use regular devices
    let connectedDevices;
    if (mockDevices && mockDevices.length > 0) {
      connectedDevices = mockDevices;
      numConnected = mockDevices.length;
    } else {
      connectedDevices = Array.from(connectedDevicesSet).sort();
    }

    // connectedDevices.push(borderRouterIPInfo.ip);
    const routes = [];

    /**
     * Make the topology based on mockDevices if the mockDevices
     * server is runnning.
     */
    if (mockDevices && mockDevices.length > 0) {
      const len = mockDevices.length;
      const layerOneLen = Math.min(len, 25);
      const layerOne = mockDevices.slice(0, layerOneLen);
      const layerTwo = mockDevices.slice(layerOneLen);

      layerOne.forEach(deviceIP => {
        routes.push([borderRouterIPInfo.ip, deviceIP]);
        rssiValues[deviceIP] = [254, 254];
      });

      layerTwo.forEach((deviceIP, index) => {
        const layerOneNodeIndex = Math.floor(index % layerOneLen);
        routes.push([layerOne[layerOneNodeIndex], deviceIP]);
        rssiValues[deviceIP] = [254, 254];
      });
    } else {
      for (const ipAddr of connectedDevices) {
        await setPropDBUS('dodagroutedest', canonicalIPtoExpandedIP(ipAddr));
        const route = parseDodagRoute(await getPropDBUS('dodagroute'));
        routes.push(route);

        // Fetch the RSSI values with a coap request
        getRSSIValues(ipAddr);

        // Fetch the LED states with a coap request
        getLEDStates(ipAddr);
      }
    }

    /**
     * Add/Remove recurring pingbursts if autoPing is on
     */
    if (ClientState.autoPing.on) {
      const pingExecutor = getPingExecutor();
      const autoPingPacketSize = ClientState.autoPing.packetSize;
      const autoPingTimeout = ClientState.autoPing.timeout;
      const autoPingInterval = ClientState.autoPing.interval;
      for (const connectedDevice of connectedDevices) {
        const dontChangePingJob = ClientState.pingbursts.some(pingburst => {
          const isDevice = pingburst.destIP === connectedDevice;
          return isDevice;
        });

        if (!dontChangePingJob) {
          // Cancel existing ping job
          pingExecutor.abort(connectedDevice);
          // Create new ping job
          const pingburstRequest = {
            destIP: connectedDevice,
            packetSize: autoPingPacketSize,
            numPacketsRemaining: '∞',
            timeout: autoPingTimeout,
            interval: autoPingInterval,
          };
          pingExecutor.handleRequest(pingburstRequest);
        }
      }

      for (const pingburst of ClientState.pingbursts) {
        const pingburstHasCorrConnectedDevice = connectedDevices.some(deviceIP => {
          const isDevice = deviceIP === pingburst.destIP;
          return isDevice;
        });

        if (!pingburstHasCorrConnectedDevice) {
          pingExecutor.abort(pingburst.destIP);
        }
      }
    }

    const currentGraph = getTopology().graph;
    const graph = routesToGraph(currentGraph, routes);

    return {numConnected, connectedDevices, routes, graph};
  } catch (e) {
    topologyLogger.debug(`Failed to update. ${e}`);
  }
}

module.exports = {getLatestTopology};
