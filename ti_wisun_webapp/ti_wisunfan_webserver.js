// See https://expressjs.com/
const path = require('path');
const express = require("express");

/* enable CORS              */
const cors = require("cors");
const app = express();
app.use(cors());   

const options = {
	origin: true,
	methods: ["POST"],
	credentials: true,

}
app.options("/rled", cors(options));
app.options("/gled", cors(options));

const ip6addr = require('ip6addr')
const bodyParser = require('body-parser');
const jsonGeneration = require('./create_json.js');
const { execSync2 } = require("child_process");
var execSync = require('child_process');
const coap = require("coap");
bl = require('bl');
const server = coap.createServer({type: 'udp6'});

const app_path = __dirname;
const fs = require('fs');
const VERBOSE = false;
/* middleware */
                                         
app.use(bodyParser.urlencoded({ extended: true }));         /* urlencoded parser        */
app.use(bodyParser.json());                                 /* json parser              */
app.use(express.static(app_path));  /* public static resource   */
app.use(express.static(path.join(__dirname + '/public')));  /* public static resource   */

const port = 8035;
// these two come directly from POST
let rledState = false;
let currentrledState = false;
let gledState = false;
let currentgledState = false;
let JSON_FILENAME = 'public/data.json';
let LED_STATES_FILENAME = 'public/led_states_dict.json';
let INITIAL_COAP_FILENAME_GET = 'a.bin';
let COAP_GET_FILENAME = 'c.bin';
let led_states = {};

// update file with info from data about led states
/* 
    data has 5 fields:
    id
    name
    ipaddr
    rled_state
    gled_state
*/
function update_JSON_file(data, filename=LED_STATES_FILENAME, filename2=JSON_FILENAME, rled_val, gled_val)
  {
    console.log('Called update_JSON_file')
    console.log('rled_val ' + rled_val);
    console.log('gled_val ' + gled_val);
    let file = undefined;
    let led_states = undefined;

    try{
        if(fs.existsSync(filename))
        {
            fs.readFile(filename, 'utf8' , (err, json_data3) => {
            if (err) 
            {
                console.log("An error occurred");
                console.error(err);
                return;
            }
            try
            {
                file = JSON.parse(json_data3);
                led_states = file;
            }
            catch
            {
                console.log("JSON Parse failed");
                led_states = undefined;
            }
            if(rled_val !== undefined)
            {
                data.rled_state = rled_val;
            }
            if(gled_val !== undefined)
            {
                data.gled_state = gled_val;
            }   

            // always replace whatever was previously there.
            led_states[ip6addr.parse(data.ipaddr)] = {"rled": data.rled_state,
                                "gled": data.gled_state
                                };
            
            console.log(JSON.stringify(led_states));

            fs.writeFile (filename, JSON.stringify(led_states), function(err) {
                if (err) throw err;
                if(VERBOSE)
                {
                    console.log('Updating LED States in file: ');
                    console.log(filename);
                    console.log(data.rled_state);
                }
                }
            );

            let json_object2 = undefined;
            if (fs.existsSync(filename2)) {
                
                fs.readFile(filename2, 'utf8' , (err, json_data2) => 
                {
                    if (err) 
                    {
                        console.log("An error occurred");
                        console.error(err);
                        return;
                    }
                    console.log("Correctly read existing JSON file");
                    try
                    {
                        json_object2 = JSON.parse(json_data2);
                    }
                    catch
                    {
                        console.log("Unable to parse JSON object");
                        json_object2 = undefined;
                        return;
                    }

                    console.log("Found existing data inside of json");
                    console.log(json_object2);
                    if(led_states[ip6addr.parse(data.ipaddr)] !== undefined && json_object2 !== undefined)
                    {
                        console.log("Valid objects");
                        // if json_object2 is valid and contains an id
                        // update LED states of data.id
                        if(led_states[ip6addr.parse(data.ipaddr)]["rled"] !== undefined)
                        {
                            // update the LED states based on last click per node
                            data.rled_state = led_states[ip6addr.parse(data.ipaddr)]["rled"];
                        }
                        else
                        {
                            data.rled_state = false;
                        }
                        if(led_states[ip6addr.parse(data.ipaddr)]["gled"] !== undefined)
                        {
                            data.gled_state = led_states[ip6addr.parse(data.ipaddr)]["gled"];
                        }
                        else
                        {
                            data.gled_state = false;
                        }

                        for(node of json_object2.elements.nodes)
                        {
                            console.log(node);
                            // if the ids match, update the node with new LED info
                            if(ip6addr.parse(node.data.ipaddr) == ip6addr.parse(data.ipaddr))
                            {
                                console.log("POST UPDATE: Updating rled state to " + data.rled_state);
                                console.log("POST UPDATE: Updating gled state to " + data.gled_state);
                                console.log("for node " + ip6addr.parse(data.ipaddr));
                                node.data["rled_state"] = data.rled_state;
                                node.data["gled_state"] = data.gled_state;
                                console.log(JSON.stringify(json_object2));

                                // update the main JSON file with new LED states
                            fs.writeFile (filename2, JSON.stringify(json_object2), function(err) 
                            { 
                                    if (err) throw err;
                                    console.log('Updating Main JSON File with LED states: ');
                                    console.log('rled_state: ' + data.rled_state);
                                    console.log('gled_state: ' + data.gled_state);
                                    console.log(JSON.stringify(json_object2));
                                });
                        }
                        }
                    }
                });
            }
            });
        }
    }
    catch(ex)
    {
        console.error('update_json',ex.message)
    }

    
 }
   
/*****************************************************************************************
 * ROUTES START
 *****************************************************************************************/https://stackoverflow.com/questions/51564072/node-js-unexpected-token
/* led GET route */
app.get('/rled', cors(options), (req, res) => {
    console.log("Calling JSON GET from rled");
    // if file does not exist yet, false
    let json_object = undefined;
    let data = req.body;
    try{
        if (fs.existsSync(LED_STATES_FILENAME)) {
            
            fs.readFile(LED_STATES_FILENAME, 'utf8' , (err, json_data) => 
            {
                if (err) 
                {
                    console.log("An error occurred");
                    console.error(err);
                    return;
                }
            try
            {
                json_object = JSON.parse(json_data);
            }
            catch
            {
                console.log("Unable to parse json data");
                return;
            }
            
            if(json_object[ip6addr.parse(data.ipaddr)] !== undefined)
            {
                currentrledState = json_object[ip6addr.parse(data.ipaddr)]["rled"];
                // pass in hierarchy of objects here
                res.json({ state: currentrledState });
                return;
            }
            });
            // parse json data here and get rled status based on id
        }
        // pass in hierarchy of objects here
        res.json({ state: currentrledState });
    }
    catch
    {
        console.error("get_led", ex.message);
    }
});


/*  
RLED POST ROUTE
    Every time JSON Post is triggered, do a coap PUT with nodeJS coap
    module with new values for LED. Then, do a coap GET to get
    the new values, update c.bin with the values received.

    Then check c.bin afterwards & compare against expected LED values.
    First value of COAP Put = ID of LED to set (0 = red, 1 = green)
    Second value of COAP Put = Value of LED to set.

*/
app.post('/rled', cors(options), (req, res) => {
    console.log("Calling JSON POST from rled");
    console.log(req.body);

    try
    {
        if(req.body.id !== undefined && req.body.ipaddr !== undefined)
        {
            let data = req.body;
            // if the file exists, toggle the LED from that file
            if (fs.existsSync(LED_STATES_FILENAME)) {
                console.log("File exists");
                fs.readFile(LED_STATES_FILENAME, 'utf8' , (err, json_data) => 
                {
                    if (err) 
                    {
                        console.log("An error occurred");
                        console.error(err);
                        return;
                    }
                
                    json_object = JSON.parse(json_data);
                    console.log(json_object);

                    if(json_object[ip6addr.parse(data.ipaddr)] !== undefined)
                    {
                        rledState = json_object[ip6addr.parse(data.ipaddr)]["rled"];
                        gledState = json_object[ip6addr.parse(data.ipaddr)]["gled"];
                    }
                    console.log("Current rled state is: " + rledState);
                    console.log("New rled state is: " + !rledState);

                    // if the new state should be set to true, trigger coap command

                    let rled_val = 0;
                    if(!rledState)
                    {
                        rled_val = 1;
                    }
                    // trigger shell script here
                    console.log("Triggered coap command for rled for ip " + req.body.ipaddr);   
                    console.log("Running coap PUT");
                    console.log("Removing " + COAP_GET_FILENAME);
                    try{
                        fs.unlinkSync('./' + COAP_GET_FILENAME);
                    }
                    catch{
                        console.log("Unable to remove file!");
                    }	
                    
                    // step 1: Do a coap put
                    const req_put = coap.request({
                        observe: false,
                        host: req.body.ipaddr,
                        pathname: '/led',
                        method: 'put',
                        confirmable: 'true',
                        retrySend: 'true',
                        options:{}
                    });
                    var payload_buf = Buffer.alloc(2, 0);
                    var first_val = '0'.charCodeAt(0);
                    var second_val = (''+rled_val).charCodeAt(0);

                    // convert from ASCII to real data
                    payload_buf[0] = first_val-48;
                    payload_buf[1] = second_val-48;
            
                    console.log('Payload: ' + payload_buf.toString('hex'));
                    req_put.write(payload_buf);
                    // this is what actually sends the put command
                    req_put.end();

                    //waiting for coap server send con response
                    req_put.on('response', function(resp) {
                    //print response code, headers,options,method
                    console.log('Response from server after calling PUT');
                    console.log(resp);

                    // only do the GET after PUT has finished
                    const req_get = coap.request({
                        observe: false,
                        host: req.body.ipaddr,
                        pathname: '/led',
                        method: 'get',
                        confirmable: 'true',
                        retrySend: 'true',
                        options:{}
                    });

                    // after doing the PUT, call GET, we should use this data to update LED states
                    req_get.on('response', function(res){
                        console.log('Response from the server with data: ');
                        console.log(res.payload);
                        res.pipe(bl(function(err, data){
                            console.log("Now writing this data to " + COAP_GET_FILENAME + data);              
                            var buffer2 = res.payload;

                            if(typeof req.body.ipaddr !== 'undefined' && req.body.ipaddr)
                            {
                                let rled_buffer_state = Boolean(Number("" + buffer2.readUInt8()));
                                let gled_buffer_state = Boolean(Number("" + buffer2.readUInt8(1)));

                                console.log("Current rled buffer state from coap GET: " + rled_buffer_state);
                                console.log("Current gled buffer state from coap GET: " + gled_buffer_state);

                                if(Boolean(Number(rled_val)) != rled_buffer_state)
                                {
                                    console.log("COAP Put Failed, keeping LEDs at previous state.");
                                    console.log(Boolean(Number(rled_val)));
                                    console.log(rled_buffer_state);

                                // do not update JSON file with new values, simply do nothing
                                }
                                else
                                {
                                    console.log("COAP Put passed, updating LEDs to their new values.");
                                    console.log("Updating JSON file using these values");
                                    console.log(rled_buffer_state);
                                    console.log(gled_buffer_state);
                                    update_JSON_file(req.body, filename=LED_STATES_FILENAME, filename2=JSON_FILENAME, rled_buffer_state, gled_buffer_state);

                                }
                            }

                    }));
                    res.on('end', function(){
                        // what to do at the end of the function call
                    })
                    });

                    // this triggers the async command
                    req_get.end();         

                });
            
                });
            }
        }
    }
    catch
    {
        console.error("post_rled", ex.message);
    }

    res.sendStatus(200);
});

/* led GET route */
app.get('/gled', cors(options), (req, res) => {
    console.log("Calling JSON GET from gled");
    // if file does not exist yet, false
    let json_object2 = undefined;
    let data = req.body;
    try
    {
        if (fs.existsSync(LED_STATES_FILENAME)) {
            
            fs.readFile(LED_STATES_FILENAME, 'utf8' , (err, json_data) => 
            {
                if (err) 
                {
                    console.log("An error occurred");
                    console.error(err);
                    return;
                }
            
            try
            {
                json_object2 = JSON.parse(json_data);
                console.log(json_object2);
            }
            catch
            {
                console.log("Unable to parse JSON data from gled GET");
                return
            }
            
            if(json_object2[data.ipaddr] !== undefined)
            {
                currentgledState = json_object2[data.ipaddr]["gled"];
                // pass in hierarchy of objects here
                res.json({ state: currentgledState });
                return;
            }
            });
            // parse json data here and get gled status based on id
        }
        // pass in hierarchy of objects here
        res.json({ state: currentgledState });
    }
    catch
    {
        console.error("get_gled", ex.message);
    }
});

/*  
GLED POST ROUTE
    Every time JSON Post is triggered, do a coap PUT with nodeJS coap
    module with new values for LEDS. Then, do a coap GET to get
    the new values, update c.bin with the values received.

    Then check c.bin afterwards & compare against expected LED values.
    First value of COAP Put = ID of LED to set (0 = red, 1 = green)
    Second value of COAP Put = Value of LED to set.

*/
app.post('/gled', cors(options), (req, res) => {
    console.log("Calling JSON POST from gled");
    console.log(req.body);
    
    try
    {
        if(req.body.id !== undefined && req.body.ipaddr !== undefined)
        {
            let data = req.body;
            // if the file exists, toggle the LED from that file
            if (fs.existsSync(LED_STATES_FILENAME)) {
                console.log("File exists");
                fs.readFile(LED_STATES_FILENAME, 'utf8' , (err, json_data) => 
                {
                    if (err) 
                    {
                        console.log("An error occurred");
                        console.error(err);
                        return;
                    }
                
                    json_object = JSON.parse(json_data);
                    console.log(json_object);

                    if(json_object[ip6addr.parse(data.ipaddr)] !== undefined)
                    {
                        rledState = json_object[ip6addr.parse(data.ipaddr)]["rled"];
                        gledState = json_object[ip6addr.parse(data.ipaddr)]["gled"];
                    }
              

                    console.log("Current gled state is: " + gledState);
                    console.log("New gled state is: " + !gledState);

                    // if the new state should be set to true, trigger coap command

                    let gled_val = 0;
                    if(!gledState)
                    {
                        gled_val = 1;
                    }
                    // trigger shell script here
                    console.log("Triggered coap command for gled for ip " + req.body.ipaddr);   
                    console.log("Running coap PUT");
                    console.log("Removing " + COAP_GET_FILENAME);
                    try{
                        fs.unlinkSync('./' + COAP_GET_FILENAME);
                    }
                    catch{
                        console.log("Unable to remove file!");
                    }   
                    
                    // step 1: Do a coap put
                    const req_put = coap.request({
                        observe: false,
                        host: req.body.ipaddr,
                        pathname: '/led',
                        method: 'put',
                        confirmable: 'true',
                        retrySend: 'true',
                        options:{}
                    });
                    var payload_buf = Buffer.alloc(2, 0);
                    var first_val = '1'.charCodeAt(0);
                    var second_val = (''+gled_val).charCodeAt(0);

                    // convert from ASCII to real data
                    payload_buf[0] = first_val-48;
                    payload_buf[1] = second_val-48;
            
                    console.log('Payload: ' + payload_buf.toString('hex'));
                    req_put.write(payload_buf);
                    // this is what actually sends the put command
                    req_put.end();

                    //waiting for coap server send con response
                    req_put.on('response', function(resp) {
                    //print response code, headers,options,method
                    console.log('Response from server after calling PUT');
                    console.log(resp);

                    // only do the GET after PUT has finished
                    const req_get = coap.request({
                        observe: false,
                        host: req.body.ipaddr,
                        pathname: '/led',
                        method: 'get',
                        confirmable: 'true',
                        retrySend: 'true',
                        options:{}
                    });

                    // after doing the PUT, call GET, we should use this data to update LED states
                    req_get.on('response', function(res){
                        console.log('Response from the server with data: ');
                        console.log(res.payload);
                        res.pipe(bl(function(err, data){
                            console.log("Now writing this data to " + COAP_GET_FILENAME + data);              
                            var buffer2 = res.payload;

                            if(typeof req.body.ipaddr !== 'undefined' && req.body.ipaddr)
                            {
                                let rled_buffer_state = Boolean(Number("" + buffer2.readUInt8()));
                                let gled_buffer_state = Boolean(Number("" + buffer2.readUInt8(1)));

                                console.log("Current rled buffer state from coap GET: " + rled_buffer_state);
                                console.log("Current gled buffer state from coap GET: " + gled_buffer_state);

                                if(Boolean(Number(gled_val)) != gled_buffer_state)
                                {
                                    console.log("COAP Put Failed, keeping LEDs at previous state.");
                                    console.log(Boolean(Number(gled_val)));
                                    console.log(gled_buffer_state);

                                // do not update JSON file with new values, simply do nothing
                                }
                                else
                                {
                                    console.log("COAP Put passed, updating LEDs to their new values.");
                                    console.log("Updating JSON file using these values");
                                    console.log(rled_buffer_state);
                                    console.log(gled_buffer_state);
                                    update_JSON_file(req.body, filename=LED_STATES_FILENAME, filename2=JSON_FILENAME, rled_buffer_state, gled_buffer_state);

                                }
                            }

                    }));
                    res.on('end', function(){
                        // what to do at the end of the function call
                    })
                    });

                    // this triggers the async command
                    req_get.end();         

                });
            
                });
            }
        }
    }
    catch
    {
        console.error("get_led", ex.message);
    }
    
    res.sendStatus(200);
});
/*****************************************************************************************
 * ROUTES END
 *****************************************************************************************/


function sleep(millis){
	return new Promise(resolve => setTimeout(resolve, millis));
}


/* start the server */
app.listen(port, () => {
    console.log(`Server started at port ${port}`);
});



    // if gled is on, turn it off when toggle is clicked
    /*
    TODO: paste this in gled later
    if(gledState == true)
    {
        gledState = false;
    }
    else
    {
        gledState = true;
    }

    req.body.gled_state = gledState;

    */
