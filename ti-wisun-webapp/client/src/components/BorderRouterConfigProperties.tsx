import {APIService} from '../APIService';
import {App, NCPProperties} from '../App';
import {numToStringNullPreserving, setNCPPropertyGenerator} from '../utils';
import {ConfigPropertyInput} from './ConfigPropertyInput';
import {TileColumnLayout} from './TileColumnLayout';

interface BorderRouterConfigPropertiesProps {
  ncpProperties: NCPProperties;
}

export function BorderRouterConfigProperties(props: BorderRouterConfigPropertiesProps) {
  let {['Stack:Up' as 'Stack:Up']: stackUp} = props.ncpProperties;
  stackUp = stackUp === null ? false : stackUp;
  return (
    <TileColumnLayout>
      <ConfigPropertyInput
        propertyValue={props.ncpProperties['Network:Name']}
        propertySetter={setNCPPropertyGenerator('Network:Name')}
        name="Network Name"
        description="The string advertised to nodes within range"
        invalidHeadline="Excessive Length"
        invalidDescription="Network name has max of 32 bytes and is UTF-8 encoded"
        isInvalidTester={val => new Blob([val]).size > 32}
        isDisabled={stackUp}
        disabledReason={'Property cannot be set while the interface and stack are enabled'}
      />
      <ConfigPropertyInput
        propertyValue={props.ncpProperties['Network:Panid']}
        propertySetter={setNCPPropertyGenerator('Network:Panid')}
        name="PAN ID"
        description="The hex form of the identification of the Personal Area Network (PAN)"
        invalidHeadline="Invalid Form"
        invalidDescription="Pan ID must be exactly 4 hex digits"
        isInvalidTester={val => val.match(/^0x[0-9a-fA-F]{4}$/g) === null}
        isDisabled={stackUp}
        disabledReason={'Property cannot be set while the interface and stack are enabled'}
      />
      <ConfigPropertyInput
        propertyValue={numToStringNullPreserving(props.ncpProperties['NCP:TXPower'])}
        propertySetter={setNCPPropertyGenerator('NCP:TXPower', true)}
        name="TX Power"
        description="Value in dBm will be rounded to nearest acceptable value"
        invalidHeadline="Invalid Form"
        invalidDescription="TX Power must be a valid decimal number"
        isInvalidTester={val => val.match(/^-{0,1}\d+$/g) === null}
        isDisabled={stackUp}
        disabledReason={'Property cannot be set while the interface and stack are enabled'}
      />
      <ConfigPropertyInput
        propertyValue={numToStringNullPreserving(props.ncpProperties['NCP:CCAThreshold'])}
        propertySetter={setNCPPropertyGenerator('NCP:CCAThreshold', true)}
        name="CCA Threshold"
        description="Value in dBm will be rounded to nearest acceptable value"
        invalidHeadline="Invalid Form"
        invalidDescription="TX Power must be a valid decimal number"
        isInvalidTester={val => val.match(/^-{0,1}\d+$/g) === null}
        isDisabled={stackUp}
        disabledReason={'Property cannot be set while the interface and stack are enabled'}
      />
    </TileColumnLayout>
  );
}
