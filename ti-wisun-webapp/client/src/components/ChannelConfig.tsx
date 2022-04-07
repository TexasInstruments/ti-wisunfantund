import {NCPProperties} from '../App';
import {numToStringNullPreserving, setNCPPropertyGenerator} from '../utils';
import {ConfigPropertyInput} from './ConfigPropertyInput';
import {ConfigPropertySelect} from './ConfigPropertySelect';
import ThemedLabel from './ThemedLabel';
import {TileColumnLayout} from './TileColumnLayout';

interface ChannelConfigProps {
  ncpProperties: NCPProperties;
}

function isChannellListInvalidTester(channelList: string) {
  const colonSeparated = channelList.split(':');
  for (const interval of colonSeparated) {
    for (const numString of interval.split('-')) {
      if (numString === '') {
        return true;
      }
      if (parseInt(numString, 10) > 128) {
        console.log(numString);
        return true;
      }
    }
  }
  return false;
}
function isDwellIntervalInvalidTester(dwellInterval: string) {
  const numInterval = parseInt(dwellInterval, 10);
  return !(0 <= numInterval && numInterval <= 255);
}
function isBroadcastIntervalInvalidTester(dwellInterval: string) {
  const numInterval = parseInt(dwellInterval, 10);
  // 4294967295 == UINT32_MAX
  return !(0 <= numInterval && numInterval <= 4294967295);
}

const ChannelFunctionOptions = [
  {
    label: 'Fixed',
    value: 0,
  },
  {
    label: 'Hopping',
    value: 1,
  },
  {
    label: 'Reserved',
    value: 2,
  },
];

export function ChannelConfig(props: ChannelConfigProps) {
  return (
    <TileColumnLayout>
      <ThemedLabel style={{fontSize: 18}}>Unicast</ThemedLabel>
      <ConfigPropertyInput
        propertyValue={props.ncpProperties['unicastchlist']}
        propertySetter={setNCPPropertyGenerator('unicastchlist', false)}
        isInvalidTester={isChannellListInvalidTester}
        name={'Channel List'}
        description={'The channels used for one-to-one transmission'}
        invalidHeadline={'Invalid Form'}
        invalidDescription={
          'Must be colon separated list of numbers or ranges e.g 0-57:60:79-102 or 20:28:90 '
        }
      />
      <ConfigPropertyInput
        propertyValue={numToStringNullPreserving(props.ncpProperties['ucdwellinterval'])}
        propertySetter={setNCPPropertyGenerator('ucdwellinterval', true)}
        isInvalidTester={isDwellIntervalInvalidTester}
        name={'Dwell Interval'}
        description={
          'Configures the interval in milliseconds for unicast message generation in frequency hopping. If set to 0, it shall disable unicast messages and will not cause sleepy devices any additional power overhead. It is recommended that this value be set above 200 ms.'
        }
        invalidHeadline={'Invalid Form'}
        invalidDescription={
          'The dwell interval must be a valid integer between 0 and 255 inclusive'
        }
      />
      <ConfigPropertySelect
        propertyValue={props.ncpProperties['ucchfunction']}
        propertySetter={setNCPPropertyGenerator('ucchfunction', true)}
        name={'Function'}
        description={'Hopping based on DH1CF'}
        options={ChannelFunctionOptions}
      />
      <ThemedLabel style={{fontSize: 18}}>Broadcast</ThemedLabel>
      <ConfigPropertyInput
        propertyValue={props.ncpProperties['broadcastchlist']}
        propertySetter={setNCPPropertyGenerator('broadcastchlist', false)}
        isInvalidTester={isChannellListInvalidTester}
        name={'Channel List'}
        description={'The channels used for one-to-many transmission'}
        invalidHeadline={'Invalid Form'}
        invalidDescription={
          'Must be colon separated list of numbers or ranges e.g 0-57:60:79-102 or 20:28:90 '
        }
      />
      <ConfigPropertyInput
        propertyValue={numToStringNullPreserving(props.ncpProperties['bcdwellinterval'])}
        propertySetter={setNCPPropertyGenerator('bcdwellinterval', true)}
        isInvalidTester={isDwellIntervalInvalidTester}
        name={'Dwell Interval'}
        description={
          "Configures the duration, in milliseconds, of a node's broadcast slot in frequency hopping. If set to 0, it shall disable broadcast hopping and broadcast message transmissions"
        }
        invalidHeadline={'Invalid Form'}
        invalidDescription={
          'The dwell interval must be a valid integer between 0 and 255 inclusive'
        }
      />
      <ConfigPropertyInput
        propertyValue={numToStringNullPreserving(props.ncpProperties['bcinterval'])}
        propertySetter={setNCPPropertyGenerator('bcinterval', true)}
        isInvalidTester={isBroadcastIntervalInvalidTester}
        name={' Interval'}
        description={
          'Configures the interval in milliseconds for broadcast message generation in frequency hopping. If set to 0, it shall disable broadcast messages and will not cause sleepy devices any additional power overhead. It is recommended that this value be set above 200 ms.'
        }
        invalidHeadline={'Invalid Form'}
        invalidDescription={
          'The dwell interval must be a valid integer between 0 and UINT32_MAX inclusive'
        }
      />
      <ConfigPropertySelect
        propertyValue={props.ncpProperties['bcchfunction']}
        propertySetter={setNCPPropertyGenerator('bcchfunction', true)}
        name={'Function'}
        description={'Hopping based on DH1CF'}
        options={ChannelFunctionOptions}
      />
      <ThemedLabel style={{fontSize: 18}}>Asynchronous</ThemedLabel>
      <ConfigPropertyInput
        propertyValue={props.ncpProperties['asyncchlist']}
        propertySetter={setNCPPropertyGenerator('asyncchlist', false)}
        isInvalidTester={isChannellListInvalidTester}
        name={'Channel List'}
        description={'Configures the list of channels to target the async frames'}
        invalidHeadline={'Invalid Form'}
        invalidDescription={
          'Must be colon separated list of numbers or ranges e.g 0-57:60:79-102 or 20:28:90 '
        }
      />
    </TileColumnLayout>
  );
}
