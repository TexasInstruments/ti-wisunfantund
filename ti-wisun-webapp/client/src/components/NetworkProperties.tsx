import {useCallback, useContext, useEffect, useState} from 'react';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {BorderRouterIPEntry} from '../types';
import {ComponentThemeImplementations} from '../utils';
import ThemedLabel from './ThemedLabel';
import {ThemedSelect} from './ThemedSelect';
import {ThemedUnorderedList} from './ThemedUnorderedList';

const IP_DISPLAY_WIDTH = 300;

interface NetworkPropertiesTheme {
  mainTextColor: Color;
  descriptionTextColor: Color;
  secondaryBackgroundColor: Color;
}
const networkPropertiesTheme = new ComponentThemeImplementations<NetworkPropertiesTheme>();

const tiNetworkPropertiesTheme = {
  mainTextColor: ColorScheme.getColor('gray', THEME.TI),
  descriptionTextColor: ColorScheme.getColor('grayLight', THEME.TI),
  secondaryBackgroundColor: ColorScheme.getColor('bg0', THEME.TI),
};
networkPropertiesTheme.set(THEME.TI, tiNetworkPropertiesTheme);

const gruvboxNetworkPropertiesTheme = {
  mainTextColor: ColorScheme.getColor('white', THEME.GRUVBOX),
  descriptionTextColor: ColorScheme.getColor('white', THEME.GRUVBOX),
  secondaryBackgroundColor: ColorScheme.getColor('bg1', THEME.GRUVBOX),
};
networkPropertiesTheme.set(THEME.GRUVBOX, gruvboxNetworkPropertiesTheme);

function BorderPropertyValuePair({name, value}: {name: string; value: string}) {
  const theme = useContext(ThemeContext);
  const {mainTextColor, descriptionTextColor} = networkPropertiesTheme.get(theme);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      <span
        style={{
          color: mainTextColor,
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {name}
      </span>
      <span
        style={{
          color: descriptionTextColor,
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function BorderRouterIPs({borderRouterIPs}: {borderRouterIPs: BorderRouterIPEntry[]}) {
  const ipOptions =
    borderRouterIPs !== null
      ? borderRouterIPs.map(ipInfo => {
          return {label: ipInfo.ip, value: ipInfo.ip};
        })
      : [];
  const [currentIPOption, setCurrentIPOption] = useState(ipOptions[0]);
  const updateSelect = useCallback(
    selectValue => {
      setCurrentIPOption(selectValue);
    },
    [setCurrentIPOption]
  );
  const ipInfo = borderRouterIPs.find(element => element.ip === currentIPOption.value);
  if (ipInfo === undefined) {
    return <h1>Error Border Router IP Info not found with ip option </h1>;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        rowGap: 15,
      }}
    >
      <ThemedLabel style={{fontSize: 18}}>Border Router IPs</ThemedLabel>
      <ThemedSelect
        onChange={updateSelect}
        value={currentIPOption}
        width={IP_DISPLAY_WIDTH}
        options={ipOptions}
      ></ThemedSelect>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          columnGap: 15,
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '46%',
            rowGap: 10,
          }}
        >
          <BorderPropertyValuePair name={'Prefix Length'} value={ipInfo.prefixLen.toString()} />
          <BorderPropertyValuePair name={'Origin'} value={ipInfo.origin} />
        </div>
        <div
          style={{
            display: 'flex',
            width: '48%',
            flexDirection: 'column',
            rowGap: 10,
          }}
        >
          <BorderPropertyValuePair name={'Valid'} value={ipInfo.valid} />
          <BorderPropertyValuePair name={'Preferred'} value={ipInfo.preferred} />
        </div>
      </div>
    </div>
  );
}
function ConnectedDevicesExplorer({connectedDevices}: {connectedDevices: string[]}) {
  const theme = useContext(ThemeContext);
  const {secondaryBackgroundColor} = networkPropertiesTheme.get(theme);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        rowGap: 15,
      }}
    >
      <ThemedLabel style={{fontSize: 18}}>Connected Devices</ThemedLabel>
      <div
        style={{
          width: IP_DISPLAY_WIDTH,
          height: 150,
          backgroundColor: secondaryBackgroundColor,
          borderRadius: 5,
          boxShadow: '0px 0px 14px rgba(0, 0, 0, 0.2)',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 5,
          paddingBottom: 5,
        }}
      >
        <ThemedUnorderedList items={connectedDevices} />
      </div>
    </div>
  );
}

interface NetworkPropertiesProps {
  interfaceUp: boolean | null;
  connectedDevices: string[];
  borderRouterIPs: BorderRouterIPEntry[];
}

export function NetworkProperties({
  interfaceUp,
  connectedDevices,
  borderRouterIPs,
}: NetworkPropertiesProps) {
  // const isLoading = connectedDevices.length === 0 && borderRouterIPs.length === 0;

  if (!interfaceUp) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          width: '60%',
          marginTop: 20,
          marginBottom: 20,
        }}
      >
        <ThemedLabel style={{fontSize: 24}}>
          Start the network to see network properties
        </ThemedLabel>
        ;
      </div>
    );
  } else {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 20,
          marginBottom: 20,
          rowGap: 25,
          width: '80%',
        }}
      >
        <BorderRouterIPs borderRouterIPs={borderRouterIPs} />
        <ConnectedDevicesExplorer connectedDevices={connectedDevices} />
      </div>
    );
  }
}
