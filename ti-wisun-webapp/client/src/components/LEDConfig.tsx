import {pointer} from 'd3';
import React, {useContext, useState} from 'react';
import {APIService} from '../APIService';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {IPAddressInfo} from '../types';
import LEDObject from './LEDObject';
import ThemedButton, {THEMED_BUTTON_TYPE} from './ThemedButton';

interface LEDConfigurationProps {
  ipAddressInfoArray: IPAddressInfo[];
}

export default function LEDConfig(props: LEDConfigurationProps) {
  const theme = useContext(ThemeContext);
  const [greenLEDState, setGreenLEDState] = useState(false);
  const [redLEDState, setRedLEDState] = useState(false);

  const toggleRed = () => {
    setRedLEDState(!redLEDState);
  };
  const toggleGreen = () => {
    setGreenLEDState(!greenLEDState);
  };

  const setRedLEDs = async () => {
    const destinationIPs = [];
    for (const ipInfo of props.ipAddressInfoArray) {
      if (ipInfo.isSelected) {
        destinationIPs.push(ipInfo.ipAddress);
      }
    }
    await APIService.setLEDs(destinationIPs, 'red', redLEDState);
  };

  const setGreenLEDs = async () => {
    const destinationIPs = [];
    for (const ipInfo of props.ipAddressInfoArray) {
      if (ipInfo.isSelected) {
        destinationIPs.push(ipInfo.ipAddress);
      }
    }
    await APIService.setLEDs(destinationIPs, 'green', greenLEDState);
  };

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

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 10,
        padding: 20,
      }}
    >
      <label
        style={{fontStyle: 'italic', ...labelStyle}}
      >{`Configure LEDs for the selected nodes`}</label>
      <div style={{display: 'flex', flexDirection: 'row', gap: 10}}>
        <div style={{cursor: 'pointer'}} onClick={toggleRed}>
          <LEDObject theme={theme} color={'red'} ledState={redLEDState} />
        </div>
        <div style={{cursor: 'pointer'}} onClick={toggleGreen}>
          <LEDObject theme={theme} color={'green'} ledState={greenLEDState} />
        </div>
      </div>

      {/* <div style={{display: 'flex', flexDirection: 'row', gap: 10}}> */}
      <ThemedButton
        themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
        style={{width: '80%'}}
        onClick={setRedLEDs}
      >
        {redLEDState ? 'Turn Red ON' : 'Turn Red OFF'}
      </ThemedButton>
      <ThemedButton
        themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
        style={{width: '80%'}}
        onClick={setGreenLEDs}
      >
        {greenLEDState ? 'Turn Green ON' : 'Turn Green OFF'}
      </ThemedButton>
      {/* </div> */}
    </div>
  );
}
