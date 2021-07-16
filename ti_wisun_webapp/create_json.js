const fs = require('fs')
const path = require('path');
const { execSync } = require("child_process");
const coap = require("coap");
const ip6addr = require('ip6addr')
bl = require('bl');
const server = coap.createServer({type: 'udp6'});
const app_path = __dirname;
let VERBOSE = false;

// every 2000 milliseconds, first call the JS function to
// update the JSON file, then rerender the graph
setInterval(intervalFunc, 2000);

function intervalFunc() {
  if(VERBOSE)
  {
    console.log('Regenerating the JSON File based on present data');
  }
  //node create_json.js init

  // Only connected_devices will be used to generate the JSON file
  let connected_devices = 0;
  let num_connected_devices = 0;
  let JSON_FILENAME = 'public/data.json';
  let LED_STATES_FILENAME = 'public/led_states_dict.json';
  let ROOT_FOLDER = '/var/local/wisunwebapp/';
  let CONNECTED_FILENAME = ROOT_FOLDER + 'txt_files/connected_devices.txt';
  let NUM_CONNECTED_FILENAME = ROOT_FOLDER + 'txt_files/num_connected.txt';
  let LIST_OF_CONNECTED_FILENAME = ROOT_FOLDER + 'txt_files/all_connected_devices.txt';
  let COAP_GET_FILENAME = 'c.bin';
  let IPADDR_FILE_DIR = ROOT_FOLDER + 'txt_files';
  let ipaddr_list = [];
  let edge_list = [];
  let id_to_ip = [];
  let ip_to_id = [];

  var elements_table = {
     nodes: [],
     edges: []
  };

  fs.readFile(CONNECTED_FILENAME, 'utf8' , (err, data) => {
    if (err) {
      console.error(err)
      console.log("Creating singular border router");
      // Add BR info here:
      var br_data = new Object();
      var json_object = new Object();
      json_object['elements'] = {};
      json_object['elements']['nodes'] = [];
      json_object['elements']['edges'] = [];

      // sequentially increase id of router
      br_data.id = 'border_router_id1';
      br_data.selected = false;
      br_data.name = 'border_router_id1';
      br_data.label = 'Border Router';
      // append to main object here for each router
      json_object['elements']['nodes'].push({"data": br_data});
      fs.writeFile (JSON_FILENAME, JSON.stringify(json_object), function(err) 
      {
          if (err) throw err;
          if(VERBOSE)
          {
            console.log('Created JSON File Successfully');
          }
      });
      return
    }

    // first split the list based on :
    connected_devices = data.split(':');
    // then get the most recent data in the file
    connected_devices = connected_devices[connected_devices.length - 2];

    console.log("Connected devices: ");
    console.log(connected_devices);


    fs.readFile(LIST_OF_CONNECTED_FILENAME, 'utf8' , (err, data2) => {
      if (err) {
        console.error(err);
        return
      }

      var text = data2;
      var eachLine = text.split('\n');
      console.log('Lines found: ' + eachLine.length);
      for(var i = 0, l = eachLine.length; i < l; i++) 
      {
          if (!eachLine[i].includes(' ') && !!eachLine[i] && eachLine[i][0] != ':')
          {
              // add this ip address to the list
                ipaddr_list.push(eachLine[i]);
          }
      }
      if(VERBOSE)
      {
        console.log("ip list");
        console.log(ipaddr_list);
      }

      for(var j = 0, q = ipaddr_list.length; j < q; j++)
      {
          let filename = ipaddr_list[j].replace(/:/g, '_') + '-dodag_route.txt';
          // for each ip address, read the file named srcipaddr_dodag_route.txt
          // then use the data in that file to generate edges
          fs.readFile(path.join(IPADDR_FILE_DIR, filename), 'utf8' , (err, data3) => {
            if (err) {
              console.error(err);
              return;
            }
            var text = data3;
            var line = text.split('\n');
            for(var i = 0, l = line.length; i < l; i++) 
                {
                if(line[i] === undefined || line[i+1] === undefined)
                {
                  continue;
                }
                if(!(line[i].includes('Path')) && !(line[i+1].includes('Path')))
                {
                  if(!!line[i] && !!line[i+1])
                  {
                    // The first ip represented by i represents src IP
                    // the second ip represented by i+1 represents dest IP
                    // create an edge connecting these two
                    edge_list.push([line[i], line[i+1]]);
                  }
                  

                }
                }
                generate_JSON_file(connected_devices, ipaddr_list, edge_list);
          });

      }
    })
    })




  fs.readFile(NUM_CONNECTED_FILENAME, 'utf8' , (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    // first split the list based on :
    num_connected_devices = data.split(':');
    // then get the most recent data in the file
    num_connected_devices = num_connected_devices[num_connected_devices.length - 2];

    console.log("Num Connected devices: ");
    console.log(num_connected_devices);
  });

  function generate_JSON_file(num_devices, ip_list=[], edges=[], filename=JSON_FILENAME, filename2=LED_STATES_FILENAME)
  {
      var real_edge_list = [];
      let path = filename2;
      var json_object = new Object();
      var led_state_list = [];
      
      if(VERBOSE)
      { 
        console.log("Creating a brand new JSON file here: ");
        console.log(filename);
      }
      
      json_object['elements'] = {};
      json_object['elements']['nodes'] = [];
      json_object['elements']['edges'] = [];
      
      
      var br_ipaddr = "";
      
      /* Start with the nodes first so we can assign IP addrs for edges 
      to use */
      let json_object2 = undefined;

      if(fs.existsSync(path))
      {
        console.log(path);
        fs.readFile(path, 'utf8' , (err, json_data) => {
          if (err) 
          {
            console.log("An error occurred");
            console.error(err);
            return;
          }

          json_object2 = JSON.parse(json_data);
          console.log(json_object2);
          for (let i = 1; i <= num_devices; i++) 
          {
            var data = new Object();

            // sequentially increase id of router
            data.id = 'router_id' + i;
            data.selected = false;
            data.name = 'router_id' + i;
            data.label = 'Router ' + i;
            data.ipaddr = ip_list[i-1];

            if(json_object2 === undefined || json_object2[ip6addr.parse(data.ipaddr)] === undefined)
            {
              console.log("Json object2 is undefined or ipaddr not valid for: ");
              console.log(data.ipaddr); 
              try{
              	console.log("Deleting " + path);
              	fs.unlinkSync(path);
              }
              catch{
              	console.log("Unable to delete " + path);
              }

              
              data.rled_state = false;
              data.gled_state = false;
              console.log(data);
            }
            else
            {
              // update the LED states based on last click per node
              data.rled_state = json_object2[ip6addr.parse(data.ipaddr)]["rled"];
              data.gled_state = json_object2[ip6addr.parse(data.ipaddr)]["gled"];

              if(VERBOSE)
              {
                console.log("UPDATED LED STATES: ")
                console.log("rLED STATUS: " + data.rled_state);
                console.log("gLED STATUS: " + data.gled_state);
              }
            }
          
            id_to_ip[data.id] = data.ipaddr;
            ip_to_id[data.ipaddr] = data.id;

            // append to main object here for each router
            json_object['elements']['nodes'].push({"data": data});

          }
          // Add BR info here:
          var br_data = new Object();
          // sequentially increase id of router
          br_data.id = 'border_router_id1';
          br_data.selected = false;
          br_data.name = 'border_router_id1';
          br_data.label = 'Border Router';

          /* Each edge contains two values, the first is src ip, second is dest ip
          Do the edges first so we can get BR ip addr */
          for (let i = 0; i < edges.length; i++)
          {
              if(i == 0)
              {
                  // we can assume that the very first edge that is passed in is
                  // from the source node which is BR
                  br_ipaddr = edges[i][0];
                  br_data.ipaddr = br_ipaddr;
                  id_to_ip[br_data.id] = br_data.ipaddr;
                  ip_to_id[br_data.ipaddr] = br_data.id;
              }
              var edge_data = new Object();
              edge_data.source = ip_to_id[edges[i][0]];
              edge_data.target = ip_to_id[edges[i][1]];
              edge_data.id = 'edge' + (i+1);
              edge_data.selected = false;

              if(edge_data.source !== undefined && edge_data.target !== undefined)
              {
                json_object['elements']['edges'].push({"data": edge_data}); 
              }
          }

          // append to main object here for each router
          json_object['elements']['nodes'].push({"data": br_data});
          fs.writeFile (filename, JSON.stringify(json_object), function(err) 
          {
              if (err) throw err;
              if(VERBOSE)
              {
                console.log('Created JSON File Successfully');
              }
          });
      });

      } 
      else
      {
        console.log("LED States File does not exist");
        let led_init_states = {};
        for (let i = 1; i <= num_devices; i++) 
        {
          var data = new Object();

          // sequentially increase id of router
          data.id = 'router_id' + i;
          data.ipaddr = ip_list[i-1];
          led_init_states[ip6addr.parse(data.ipaddr)] = {};

          
          // only do the GET after PUT has finished
            const req_get = coap.request({
                observe: false,
                host: data.ipaddr,
                pathname: '/led',
                method: 'get',
                confirmable: 'true',
                retrySend: 'false',
                options:{}
            });

            req_get.on('response', function(res){
                console.log('Response from the server with data: ');
                console.log(res.payload);
                console.log('IP Addr: ' + res.rsinfo.address);
                res.pipe(bl(function(err, data2){
                    
                console.log(data2);
                    var buffer2 = res.payload;

                    if(typeof res.rsinfo.address !== 'undefined' && res.rsinfo.address)
                    {
                        let rled_buffer_state = Boolean(Number("" + res.payload.readUInt8()));
                        let gled_buffer_state = Boolean(Number("" + res.payload.readUInt8(1)));

                        console.log("Current rled buffer state from coap GET: " + rled_buffer_state);
                        console.log("Current rled buffer state from coap PUT: " + gled_buffer_state);
                        console.log("Updating led_init_states with " + rled_buffer_state + ' ' + gled_buffer_state);
                        // first value represents rled status, second value represents gled status

                        // initialize the slot
                        led_init_states[ip6addr.parse(res.rsinfo.address)] = {};

                        led_init_states[ip6addr.parse(res.rsinfo.address)]["rled"] = Boolean(rled_buffer_state);
                        led_init_states[ip6addr.parse(res.rsinfo.address)]["gled"] = Boolean(gled_buffer_state);

                        console.log("Now writing this data to " + COAP_GET_FILENAME + " " + data2);              
                        try{

                        	fs.writeFileSync(COAP_GET_FILENAME, data2, {mode: 0o755});
                        }	
                        catch{
                        	console.log("Unable to create " + COAP_GET_FILENAME);
                        }	    

                        try
                        {
                          console.log("Reading file: " + COAP_GET_FILENAME);
                          var coap_bin_data = fs.readFileSync(COAP_GET_FILENAME);
                          var buffer = coap_bin_data;

                          if(VERBOSE)
                          {
                            console.log("Coap GET result: ");
                            console.log(buffer);
                          }

                          // first value represents rled status, second value represents gled status
                          led_init_states[ip6addr.parse(res.rsinfo.address)]["rled"] = Boolean(Number(buffer.readUInt8(0)));
                          led_init_states[ip6addr.parse(res.rsinfo.address)]["gled"] = Boolean(Number(buffer.readUInt8(1)));

                          console.log(led_init_states);
                          console.log("Creating LED States File");
                          fs.writeFile (filename2, JSON.stringify(led_init_states), function(err) 
                          {
                          		 if (err) throw err;
                          		 if(VERBOSE)
                          		 {
                          		  console.log('Created JSON File Successfully');
                          		 }
                          });
                        }
                        catch{
                            console.log("Unable to set data from file " + COAP_GET_FILENAME);
                            console.log("Keeping previous LED States");
                        }
                    }

            }));
            res.on('end', function(){
                // what to do at the end of the function call
            })
            });

            try
            {
              // this triggers the async command
              req_get.end();    
            }
            catch
            {
                console.log("COAP initial GET Failed, throwing error.");
                exit(1);
            } 


            data.selected = false;
            data.name = 'router_id' + i;
            data.label = 'Router ' + i;
            data.ipaddr = ip_list[i-1];
            id_to_ip[data.id] = ip6addr.parse(data.ipaddr);
            ip_to_id[ip6addr.parse(data.ipaddr)] = data.id;

            

            // append to main object here for each router
            json_object['elements']['nodes'].push({"data": data});

          }
          

          // Add BR info here:
          var br_data = new Object();
          // sequentially increase id of router
          br_data.id = 'border_router_id1';

          br_data.selected = false;
          br_data.name = 'border_router_id1';
          br_data.label = 'Border Router 1';

          /* Each edge contains two values, the first is src ip, second is dest ip
          Do the edges first so we can get BR ip addr */
          for (let i = 0; i < edges.length; i++)
          {
              if(i == 0)
              {
                  // we can assume that the very first edge that is passed in is
                  // from the source node which is BR
                  br_ipaddr = edges[i][0];
                  br_data.ipaddr = br_ipaddr;
                  id_to_ip[br_data.id] = ip6addr.parse(br_data.ipaddr);
                  ip_to_id[ip6addr.parse(br_data.ipaddr)] = br_data.id;

              }
              var edge_data = new Object();
              edge_data.source = ip_to_id[edges[i][0]];
              edge_data.target = ip_to_id[edges[i][1]];
              edge_data.id = 'edge' + (i+1);
              edge_data.selected = false;

              if(edge_data.source !== undefined && edge_data.target !== undefined)
              {
                json_object['elements']['edges'].push({"data": edge_data}); 
              }
          }

          // init BR LED state to false
          led_init_states[ip6addr.parse(br_data.ipaddr)] = {};
          led_init_states[ip6addr.parse(br_data.ipaddr)]["rled"] = false;
          led_init_states[ip6addr.parse(br_data.ipaddr)]["gled"] = false;

          console.log("Creating LED States File");
          fs.writeFile (filename2, JSON.stringify(led_init_states), function(err) 
          {
              if (err) throw err;
              if(VERBOSE)
              {
                console.log('Created JSON File Successfully');
              }
          });

          // append to main object here for each router
          json_object['elements']['nodes'].push({"data": br_data});
          fs.writeFile (filename, JSON.stringify(json_object), function(err) 
          {
              if (err) throw err;
              if(VERBOSE)
              {
                console.log('Created JSON File Successfully');
              }
          });
      
      } 
}

  
} /* End of setInterval */
