const coap = require('coap');
const {getTopology} = require('./ClientState');
const {canonicalIPtoExpandedIP} = require('./parsing');

/**
 * Get the LED states for the node with ipAddr: targetIP
 * @param {canonical ipAddr} targetIP
 */
function getLEDStates(targetIP) {
  const reqOptions = {
    observe: false,
    host: targetIP,
    pathname: 'led',
    method: 'get',
    confirmable: 'true',
    retrySend: 'true',
    options: {},
  };

  const date = new Date();

  const getRequest = coap.request(reqOptions);
  getRequest.on('response', getResponse => {
    // console.log('received get response for LEDs', getResponse.code, date.getTime());
    let greenLEDState, redLEDState;
    if (getResponse.payload.length > 0) {
      const payload = getResponse.payload;
      // First byte is redLEDState
      redLEDState = payload.readUInt8(0);
      // Next byte is greenLEDState
      greenLEDState = payload.readUInt8(1);
      const nodes = getTopology().graph.nodes;
      const node = nodes.find(node => node.data.id === targetIP);

      if (node) {
        if (!node.data.time || date.getTime() > node.data.time) {
          node.data.time = date.getTime();
          node.data.greenLEDState = greenLEDState;
          node.data.redLEDState = redLEDState;
        }
      }
    }
  });
  // BOTH OF THESE ARE REQUIRED -> COAP ERRORS OUT OTHERWISE
  getRequest.on('timeout', e => {});
  getRequest.on('error', e => {});

  getRequest.end();
}

/**
 * Post a new LED states for the node with ipAddr: targetIP,
 * color: 'red', or 'green', and newValue: 0 or 1
 * @param {canonical ipAddr} targetIP
 *
 * First value of COAP Put = ID of LED to set (0 = red, 1 = green)
 * Second value of COAP Put = Value of LED to set.
 */
function postLEDStates(targetIP, color, newValue) {
  const reqOptions = {
    observe: false,
    host: targetIP,
    pathname: 'led',
    method: 'post',
    confirmable: 'true',
    retrySend: 'true',
    options: {},
  };

  putPayload = [];
  if (color == 'green') {
    putPayload.push(1);
  } else if (color == 'red') {
    putPayload.push(0);
  } else {
    return;
  }
  putPayload.push(newValue);

  const postRequest = coap.request(reqOptions);
  postRequest.on('response', postResponse => {
    // console.log('received post response for LEDs', postResponse.code);
    getLEDStates(targetIP);
  });
  // BOTH OF THESE ARE REQUIRED -> COAP ERRORS OUT OTHERWISE
  postRequest.on('timeout', e => {});
  postRequest.on('error', e => {});
  // Write the new states to the coap payload
  postRequest.write(Buffer.from(putPayload));
  postRequest.end();
}

/**
 * This function takes an IP address and sends a CoAP
 * request to the 'rssi' endpoint to retrieve the neighbor
 * rssi information. The retrieved information is an array of
 * 32 neighbor entries, where each neighbor entry contains
 * 8 bytes of MAC address, 1 byte for rssiIn, and 1 byte for
 * rssiOut. After retrieving the response, this function
 * determines the parent from the topology, and sets the corr.
 * link's rssi values based on the parent's neighbor entry.
 * @param {IPAddress} targetIP
 */
function getRSSIValues(targetIP) {
  const reqOptions = {
    observe: false,
    host: targetIP,
    pathname: 'rssi',
    method: 'get',
    confirmable: true,
    retrySend: 0,
    options: {},
  };

  const date = new Date();

  const getRequest = coap.request(reqOptions);
  getRequest.on('response', getResponse => {
    // console.log(`get response from rssi received, code: ${getResponse.code}`);
    let rssiIn, rssiOut;
    if (getResponse.payload.length > 0) {
      const payload = getResponse.payload;
      const MAX_NUM_NEIGHBORS = 32;
      const BYTES_PER_NEIGHBOR_ENTRY = 10;

      // Get the parent info (specifically the last 8 hex digits to compare to neighbor info)
      const link = getTopology().graph.edges.find(edge => {
        return edge.data.target === targetIP;
      });
      if (!link) {
        return;
      }
      let parent = canonicalIPtoExpandedIP(link.data.source);
      parent = parent.replaceAll(':', '');
      parentLast8HexDigitsStr = parent.substring(parent.length - 8);

      // Loop through all of the neighbor entries
      for (let i = 0; i < MAX_NUM_NEIGHBORS; i++) {
        const startingIndex = i * BYTES_PER_NEIGHBOR_ENTRY;

        // If the mac is empty, this neighbor entry is empty so go to next neighbor
        if (payload.readBigInt64BE(startingIndex) == 0) {
          continue;
        }

        // Get the mac address to see if this is the node's parent (first 8 bytes of neighbor info)
        const neighborMacAddress = payload.slice(startingIndex, startingIndex + 8).toString('hex');
        const neighborMacAddressLast8HexDigitsStr = neighborMacAddress.substring(
          neighborMacAddress.length - 8
        );

        // Next byte is rssiIn
        rssiIn = payload.readUInt8(startingIndex + 8);
        // Next byte is rssiOut
        rssiOut = payload.readUInt8(startingIndex + 9);

        // console.log(
        //   `Parent: ${parentLast8HexDigitsStr},\nChild: ${targetIP},\nNeighbor: ${neighborMacAddressLast8HexDigitsStr},\nRSSI IN: ${rssiIn}\nRSSI OUT: ${rssiOut}\n`
        // );

        // If last 8 hex digits are the same, this is the parent of this node
        if (neighborMacAddressLast8HexDigitsStr === parentLast8HexDigitsStr) {
          if (!link.data.time || date.getTime() > link.data.time) {
            link.data.time = date.getTime();
            link.data.rssiIn = rssiIn;
            link.data.rssiOut = rssiOut;
          }
        }
      }
    }
  });
  // BOTH OF THESE ARE REQUIRED -> COAP ERRORS OUT OTHERWISE
  getRequest.on('timeout', e => {});
  getRequest.on('error', e => {});
  getRequest.end();
}

module.exports = {getLEDStates, postLEDStates, getRSSIValues};
