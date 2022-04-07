const readline = require('readline');
const express = require('express');
const app = express();
const crypto = require('crypto');

/**
 * Allow user to specify nodes to add/remove
 * from the mock topology
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * This is a map of the testIPS (generates 100 random IP addresses)
 */
const testIPS = new Map();
for (let i = 0; i < 100; i++) {
  const randomString1 = crypto.randomBytes(2).toString('hex');
  const randomString2 = crypto.randomBytes(2).toString('hex');
  const ipString = `2020:abcd::212:4b00:${randomString1}:${randomString2}`;
  testIPS.set(`${i + 1}`, ipString);
}

/**
 * This set represents the actual devices being sent over
 * the webserver, whereas the testIPs map is just the available
 * nodes to add to this set.
 */
const mockDevices = new Set();

/**
 * Add all of the testIPs to the mockDevices set
 */
const addAll = () => {
  for (const [key, value] of testIPS.entries()) {
    mockDevices.add(value);
  }
};

/**
 * Remove all the testIPs from the mockDevices set
 */
const removeAll = () => {
  for (const [key, value] of testIPS.entries()) {
    mockDevices.delete(value);
  }
};

/**
 * Add an IP to the mockDevices set (if not already there)
 * @param {Key} num
 */
const addNode = num => {
  if (testIPS.get(num)) {
    mockDevices.add(testIPS.get(num));
  }
};

/**
 * Remove an IP from the mockDevices set (if already there)
 * @param {Key} num
 */
const removeNode = num => {
  if (testIPS.get(num)) {
    mockDevices.delete(testIPS.get(num));
  }
};

/**
 * This function sets up the readline to allow
 * the user to configure the mock topology. The user can
 * add fake nodes one at a time or add all 100. Similarly,
 * the user can remove nodes one at a time or remove all
 * of them.
 *
 * To add a single node, enter:
 * `add 1`
 * To add multiple, enter:
 * `add 1 2 3 16 25...`
 * To remove a single node, enter:
 * `remove 1`
 * To remove multiple, enter:
 * `remove 1 2 3 16 25...`
 * To add all, enter:
 * `add all`
 * To remove all, enter:
 * `remove all`
 */
const main = async () => {
  rl.question(
    'Add or remove a node: (add) for adding, (remove) for removing (1-100)\n',
    function (input) {
      const argArr = input.split(' ');
      if (argArr.includes('q')) {
        rl.close();
      } else if (argArr.includes('add')) {
        if (argArr[1] == 'all') {
          addAll();
        } else {
          for (let i = 1; i < argArr.length; i++) {
            addNode(argArr[i]);
          }
        }
      } else if (argArr.includes('remove')) {
        if (argArr[1] == 'all') {
          removeAll();
        } else {
          for (let i = 1; i < argArr.length; i++) {
            removeNode(argArr[i]);
          }
        }
      } else {
        console.log("Please prepend the index (1-100) with 'add' or 'remove'");
      }
      console.log(mockDevices);
      main();
    }
  );
};

/**
 * Print close on exiting the program
 */
rl.on('close', function () {
  console.log('\nDone');
  process.exit(0);
});

/**
 * Specify the mockDevices endpoint so that
 * other processes can access an array of the
 * mockDevices. Specifically, the webserver itself
 * sends a get request to this endpoint to get
 * the mockDevices.
 */
app.get('/mockDevices', (req, res) => {
  const array = Array.from(mockDevices);
  res.json(JSON.stringify(array));
});

/**
 * Start the webserver on port 9999
 */
app.listen(9999, function (err) {
  if (err) console.log('Error in server setup');
  console.log('Server listening on Port', 9999);
});

main();
