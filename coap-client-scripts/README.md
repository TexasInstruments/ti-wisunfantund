General Notes:
=======================================
The following shell scripts can be used after the devices have joined the border router.
The ip address of the desired node routers must be known in advance before calling these scripts.
These IP addresses can be obtained from the wpanctl command line. 




COAP GET Command:
=======================================
The Coap GET command can be run by calling the following commands:

First make the file executable in linux:
sudo chmod +x run_coap_get.sh

Then call run_coap_get.sh with the ip address of the node that you would like to poll.
./run_coap_get.sh 2020:abcd::212:4b00:1ca7:7c62


After running the Coap GET command, a file called c.bin is created.
The first value in this file represents the red LED Status.  (0 = off, 1 = on)
The second value in this file represents the green LED Status.





COAP PUT Command:
=======================================
The Coap PUT command can be run by calling the following commands:

First make the file executable in linux:
```sudo chmod +x run_coap_put.sh```

Then call run_coap_PUT.sh with the ip address of the node that you would like to poll, 
along with the additional arguments.

The first argument represents the ip address of the node that you want to send a coap PUT request to.
The second argument represents the ID of the LED to use:
- 0 represents the red LED
- 1 represents the green LED

The third argument represents the value of the LED that you would like to set:
- 0 represents LED OFF
- 1 represents LED ON

Example 1:
```./run_coap_PUT.sh 2020:abcd::212:4b00:1ca7:7c62 1 0 ```

In this example, a coap request is sent to the 7c62 device.
Then, the green LED (1) would be turned off. 



Example 2:
```./run_coap_PUT.sh 2020:abcd::212:4b00:1ca7:7c62 0 1```

In this example, a coap request is sent to the 7c62 device.
Then, the red LED (1) would be turned on. 

Example 3:
```./run_coap_PUT.sh 2020:abcd::212:4b00:1ca7:7c62 0 0```

In this example, a coap request is sent to the 7c62 device.
Then, the red LED (1) would be turned off.