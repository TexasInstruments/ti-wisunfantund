import Pane from './Pane';
import Tile, {TileHeader} from './Tile';
import PingConfig from './PingConfig';
import AtAGlance from './AtAGlance';
import Monitor from './Monitor';
import IPAddressTable from './IPAddressTable';
import Topology from './Topology';
import '../App.css';
import {AutoPingburst, CytoscapeGraph, IPAddressInfo, Pingburst, PingRecord} from '../types';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {PaneContainer} from './PaneContainer';
import {TileColumns} from './TileColumns';
import LEDConfig from './LEDConfig';
import React, {useContext, useState, useRef, useEffect} from 'react';
import OADInterface from './OADInterface';
import { gray, timer } from 'd3';
import { stat } from 'fs';
import { noop } from 'react-select/dist/declarations/src/utils';
import { current } from 'immer';

interface MonitorTabProps {
  ipSelectionHandler: (ip: string, newVal: boolean) => void;
  ipAddressInfoArray: IPAddressInfo[];
  graph: CytoscapeGraph;
  pingbursts: Pingburst[];
  pingrecords: PingRecord[];
  autoPing: AutoPingburst;
}

const platformLookup = new Map([
  [23, "CC1312R7"],
  [26, "CC1352P7"],
  [30, "CC1314R10"],
  [31, "CC1354P10"]
]);

export default function MonitorTab(props: MonitorTabProps) {
  const [platformString, setPlatformString] = useState("No Selection");
  const [imageIdString, setImageIdString] = useState("No Selection");
  const [versionString, setVersionString] = useState("No Selection");
  const [oadStatusString, setOadStatusString] = useState("Not Started");
  // let intervalFlag = useRef(true);
  let oadStatus = useRef(0);

  function changeOadInfo(status: number) {
    oadStatus.current = status;
  }
  
  const updateOad = () => {
    let noneSelected = true;
    let newPlatformString = "";
    let newVersionString = "";
    let newImageIdString = "";
    let newOadStatusString = "";    
    console.log("1");
    for(const ipAddr of props.ipAddressInfoArray) {
      if(ipAddr.isSelected) {        
        const node = props.graph.nodes.find((node) => node.data.id == ipAddr.ipAddress);        
        if(node && node.data.OADFWVer) {          
          const platform = platformLookup.get(node.data.OADPlatform);
          if(platform) newPlatformString = platform;
          else if(node.data.OADPlatform == -1) newPlatformString = "Waiting for Device...";
          else newPlatformString = ("Unknown");
          newVersionString = (node.data.OADFWVer);
          newImageIdString = (node.data.OADImgId);
        }
        else {
          newPlatformString = ("Unknown");
          newVersionString = ("Unknown");
          newImageIdString = ("Unknown");
        }
        if(node && node.data.OADCompletion) {
          oadStatus.current = 0;
          if(node.data.OADCompletion == -4) {
            newOadStatusString = ("Device Disconnected");
          }
          else if(node.data.OADCompletion == -3) {
            newOadStatusString = ("Update Rejected");
          }
          else if(node.data.OADCompletion == -2) {
            newOadStatusString = ("File Not Found");
          }
          else if(node.data.OADCompletion == -1.0) {
            newOadStatusString = ("Aborted!");
          }
          else if(node.data.OADCompletion == 0.0) {
            newOadStatusString = ("Starting ...");
          }
          else if(node.data.OADCompletion < 0.1) {
            newOadStatusString = ("0.1%");
          }
          else if(node.data.OADCompletion == 100.0) {
            newOadStatusString = ("Complete");
          }
          else if(node.data.OADCompletion > 99.9) {
            newOadStatusString = ("99.9%");
          }
          else {
            newOadStatusString = (node.data.OADCompletion.toFixed(1) + "%");
          }          
        }
        else {
          if(oadStatus.current == 1) {
            newOadStatusString = ("Starting...");
          }
          else {
            newOadStatusString = ("Not Started");
          }          
        }
        if(noneSelected == false){
          if(newPlatformString != platformString) {
            newPlatformString = ("Selections Differ!");
          }
          if(newVersionString != versionString) {
            newVersionString = ("Selections Differ!");
          }
          if(newImageIdString != imageIdString) {
            newImageIdString = ("Selections Differ!");
          }
          if(newOadStatusString != oadStatusString) {
            newOadStatusString = ("Selections Differ!");
          }
        }
        else {
          noneSelected = false;
          
        }
      }      
    }
    if(noneSelected) {
      setPlatformString("No Selection");
      setVersionString("No Selection");
      setImageIdString("No Selection");
      setOadStatusString("No Selection");
    }
    else {
      setPlatformString(newPlatformString);
      setVersionString(newVersionString);
      setImageIdString(newImageIdString);
      setOadStatusString(newOadStatusString);
    }
  };  

  setTimeout(updateOad, 200);

  return (
    <PaneContainer
      maxColumns={3}
      columnWidthMinMax={{min: 530, max: 650}}
      // elements are organized by column (e.g. [0,1,2] means first three items are the first column top->bottom)
      elementOrdering={[
        [[0, 1, 2, 3, 4]],
        [
          [0],
          [1, 2],
          [3, 4],
        ],
        [         
          [0],
          [1, 2],
          [3, 4],
        ],
      ]}
      gutterWidth={20}
      style={{width: '91.67vw'}}
    >
      <div className="tile_container_full tile_container_common">
        <Tile title="OAD Interface">
          <OADInterface 
            ipAddressInfoArray={props.ipAddressInfoArray}
            platformString={platformString}
            imageIdString={imageIdString}
            versionString={versionString}
            oadStatusString={oadStatusString}
            changeOadInfo={changeOadInfo}
          />
        </Tile>
      </div>
      <div className="tile_container_full tile_container_common">
        <Tile title="Topology">
          <Topology
            ipSelectionHandler={props.ipSelectionHandler}
            ipAddressInfoArray={props.ipAddressInfoArray}
            elements={props.graph}
          />
        </Tile>
      </div>
      <div className="tile_container_full tile_container_common">
        <TileHeader title="IP Addresses" />
        <IPAddressTable
          ipSelectionHandler={props.ipSelectionHandler}
          ipAddressInfoArray={props.ipAddressInfoArray}
        />
      </div>
      {/* <div className="tile_container_full tile_container_common">
        <Tile title="At A Glance">
          <AtAGlance {...props} />
        </Tile>
      </div> */}
      <TileColumns minColumnWidth={250} gutterWidth={20}>
        <Tile title="Ping Config">
          <PingConfig
            ipAddressInfoArray={props.ipAddressInfoArray}
            pingbursts={props.pingbursts}
            autoPing={props.autoPing}
          />
        </Tile>
        <Tile title="LED Config">
          <LEDConfig ipAddressInfoArray={props.ipAddressInfoArray} />
        </Tile>
      </TileColumns>
      <div className="tile_container_full tile_container_common">
        <Monitor {...props} />
      </div>
    </PaneContainer>
  );
}
