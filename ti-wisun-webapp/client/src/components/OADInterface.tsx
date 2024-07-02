import {pointer} from 'd3';
import React, {useContext, useReducer, useState} from 'react';
import {APIService} from '../APIService';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {CytoscapeGraph, IPAddressInfo} from '../types';
import LEDObject from './LEDObject';
import ThemedButton, {THEMED_BUTTON_TYPE} from './ThemedButton';
import {ThemedInput} from './ThemedInput';
import cytoscape from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';
import { useForceUpdate } from '../hooks/useForceUpdate';
import { PassThrough } from 'stream';
import { ErrorPropertyTooltipCard } from './InfoTooltip';
import { readFileSync } from 'fs';

interface OADInterfaceProps {
  ipAddressInfoArray: IPAddressInfo[];
  platformString: string;
  imageIdString: string;
  versionString: string;
  oadStatusString: string;
  changeOadInfo: (status: number) => void;
}

const platformLookupReverse = new Map([
  ["CC1312R7", 23],
  ["CC1352P7", 26],
  ["CC1314R10", 30],
  ["CC1354P10", 31]
]);

export default function OADInterface(props: OADInterfaceProps) {
  const theme = useContext(ThemeContext);
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState("");
  const [blockSize, setBlockSize] = useState(128);

  let labelStyle;
  switch (theme) {
    case THEME.TI:
      labelStyle = {
        color: ColorScheme.getColor('gray', theme),
        fontWeight: 600,
      };
      break;
    case THEME.GRUVBOX:
      labelStyle = {};
      break;
  }

  const OnChangeHandler = (newText: string) => {    
    return;
  }

  const onFilePathChange = (newText: string) => {
    setFileName(newText);
  }

  // const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if(e.target.files) {
  //     console.log("File change!");
  //     let file = e.target.files[0];
  //     setFileName(file.name);
  //     let reader = new FileReader();

  //     reader.onload = function (event) {
  //       if(reader.result) {      
  //         setFileData(reader.result.toString());
  //       }    
  //     }
  //     if(file) reader.readAsText(file);
  //   }
  //   return;
  // }

  const startOAD = async () => {
    const destinationIPs = [];    
    for (const ipInfo of props.ipAddressInfoArray) {
      if (ipInfo.isSelected) {
        destinationIPs.push(ipInfo.ipAddress);
      }
    }

    if(destinationIPs.length == 0) {
      alert("Please select a node.");
      return;
    }

    if(fileName == "") {
      alert("Please input your file's path.");
      return;
    }

    if(blockSize < 128) {
      alert("Block size cannot be less than 128");
      return;
    }

    //console.log(Buffer.from(fileData));
    let payload = [123];

    let platform = platformLookupReverse.get(props.platformString);
    if(platform) payload.push(platform);
    else { 
      alert("Please get OAD information before attempting to update a node.")
      props.changeOadInfo(-1);
      return;
    }

    payload.push(blockSize & 0xFF);
    payload.push(blockSize >> 8);

    props.changeOadInfo(1);
    
    const response = await APIService.startOAD(destinationIPs, payload, fileName);
    if(response.wasSuccess == true) {
      // alert("Requesting Update...");
      // setTimeout(()=> {props.changeOadInfo(0);}, 1000);      
    }
  }

  const getOADVerInfo = async () => {
    const destinationIPs = [];
    for (const ipInfo of props.ipAddressInfoArray) {
      if (ipInfo.isSelected) {
        destinationIPs.push(ipInfo.ipAddress);
      }
    }
    if(destinationIPs.length == 0) {
      alert("Please select a node.");
      return;
    }
    const response = await APIService.getOADFWVer(destinationIPs);
    console.log(response);
  }

  const onBlockSizeChange = (newText: string) => {
    const newNum = Number(newText);
    if(Number.isNaN(newNum)) {
      setBlockSize(128);
    }
    else if (newNum > 1024) {
      setBlockSize(1024);
    }
    else {
      setBlockSize(newNum);
    }
  };

  return (
    <div
    style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-evenly',
      textAlign: 'center',
      gap: 10,
      padding: 20,
    }}
    >
      <div
      style={{
        width: '100%',
        height: 150,
        display: 'flex',
        flexDirection: 'column',
        // alignItems: 'center',
        // justifyContent: 'center',
        // textAlign: 'center',
        gap: 10,
        padding: 20,
      }}
      >
        <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
        >
          <label style={{textAlign: 'right', fontSize: 20, ...labelStyle}}>
            Platform
          </label>
          <ThemedInput 
            className='Platform_In'
            value={props.platformString}
            style={{marginLeft: 10, fontSize: 20}}
            onChange={OnChangeHandler}
          />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'right',
            justifyContent: 'space-between',
            gap: 10,
          }}
          >
          <label style={{textAlign: 'left', fontSize: 20, ...labelStyle}}>
            Image ID
          </label>
          <ThemedInput 
            className='Img_Id_In'
            value={props.imageIdString}
            style={{marginLeft: 10, fontSize: 20}}
            onChange={OnChangeHandler}
          />
        </div>
        <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
        >
          <label style={{textAlign: 'right', fontSize: 20, ...labelStyle}}>
            Firmware Version
          </label>
          <ThemedInput 
            className='Fw_Ver_In'
            value={props.versionString}
            style={{marginLeft: 10, fontSize: 20}}
            onChange={OnChangeHandler}
          />
        </div>
        <div>
        <ThemedButton
          themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
          style={{width: 'auto', marginTop: 10, marginBottom: 5, paddingLeft: 10, paddingRight: 10}}
          onClick={getOADVerInfo}
        >
          Get OAD Information
        </ThemedButton>
        </div>
      </div>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',          
          gap: 10,
          padding: 20,
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <label style={{width: '30%', textAlign: 'left', fontSize: 20, ...labelStyle}}>
            File Path
          </label>
          <ThemedInput
            style={{fontSize: '20', width: '70%'}}
            value={fileName}
            onChange={onFilePathChange}
          />
          {/* <label 
            className="themed_button" 
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 0,
              backgroundColor: ColorScheme.getColor('blue', THEME.TI),
            }}
          >
            <input type="file" onChange={onFileChange}/>
            Select File
          </label> */}
          
        </div>
        <div 
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <label style={{width: '30%', textAlign: 'left', fontSize: 20, ...labelStyle}}>
            Block Size
          </label>
          <ThemedInput
            style={{fontSize: '20', width: '70%'}}  
            onChange={onBlockSizeChange}
            value={blockSize.toString()}
          />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <label style={{width: '30%', textAlign: 'left', fontSize: 20, ...labelStyle}}>
            OAD Status
          </label>
          <ThemedInput  
            style={{fontSize: '20', width: '70%'}}
            value={props.oadStatusString}
            onChange={OnChangeHandler}
          />
        </div>
        <div>
          <ThemedButton 
            themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
            onClick={startOAD}
            style={{width: 'auto', marginTop: 10, marginBottom: 5, paddingLeft: 10, paddingRight: 10}}
          >
            Update Selected Nodes
          </ThemedButton>
        </div>
      </div>
    </div>
  );
}