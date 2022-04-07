import produce from 'immer';
import {useCallback, useContext, useEffect, useState} from 'react';
import {APIService} from '../APIService';
import {NCPProperties} from '../App';
import {AppContext} from '../Contexts';
import ThemedButton, {THEMED_BUTTON_TYPE} from './ThemedButton';
import {ThemedInput} from './ThemedInput';
import ThemedLabel from './ThemedLabel';
import {ThemedUnorderedList} from './ThemedUnorderedList';
import {TileColumnLayout} from './TileColumnLayout';
import '../assets/MacFilterSettings.css';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {ComponentThemeImplementations, setNCPPropertyGenerator} from '../utils';
import {
  ErrorPropertyTooltipCard,
  InfoPropertyTooltipCard,
  InfoTooltip,
  InfoTooltipMode,
} from './InfoTooltip';
import {ConfigPropertySelect} from './ConfigPropertySelect';
import {ConfigPropertyContainer} from './ConfigPropertyContainer';
import {BorderRouterPropertyContainer} from './BorderRouterPropertyContainer';

// https://dev.ti.com/tirex/explore/content/simplelink_cc13x2_26x2_sdk_5_20_00_52/docs/ti_wisunfan/html/wisun-guide/NWP_interface.html
interface MacFilterModeConfigProps {
  value: number | null;
}
function MacFilterModeConfig({value}: MacFilterModeConfigProps) {
  const options = [
    {
      label: 'Disabled',
      value: 0,
    },
    {
      label: 'Allow',
      value: 1,
    },
    {
      label: 'Deny',
      value: 2,
    },
  ];
  return (
    <ConfigPropertySelect
      name="Filter Mode"
      options={options}
      description="The method to filter i.e. by inclusion or exclusion"
      propertySetter={setNCPPropertyGenerator('macfiltermode', true)}
      propertyValue={value}
    />
  );
}

function isValidMACAddress(address: string) {
  const isMatch = address.match(/^[a-fA-F0-9]{16}$/g);
  return isMatch !== null;
}

function MacFilterUpdater() {
  const App = useContext(AppContext);
  const [macfilter, setMacfilter] = useState('');
  const isValidAddress = isValidMACAddress(macfilter) || macfilter === '';
  const infoTooltipMode = isValidAddress ? InfoTooltipMode.INFO : InfoTooltipMode.ERROR;

  const macfilterUpdate = useCallback(
    async (insert: boolean, value: string) => {
      try {
        if (isValidAddress) {
          await APIService.macfilterUpdate(insert, value);
        }
      } catch (e) {
        //network error
        if (App === null) {
          console.error('App is null');
          return;
        }
        App.receivedNetworkError(e);
      }
    },
    [isValidAddress]
  );

  const handleChange = (value: string) => {
    setMacfilter(value);
  };

  return (
    <>
      <ConfigPropertyContainer>
        <BorderRouterPropertyContainer name="Target Filter">
          <ThemedInput
            style={{fontSize: 14, height: 30, width: '100%'}}
            inputStyle={{height: 30}}
            onChange={handleChange}
            value={macfilter}
          ></ThemedInput>
          <InfoTooltip mode={infoTooltipMode}>
            {!isValidMACAddress(macfilter) && (
              <ErrorPropertyTooltipCard
                headline={'Invalid MAC Filter'}
                description={'The target MAC address should be 16 hex digits'}
              />
            )}
            <InfoPropertyTooltipCard
              name={'MAC Target Filter'}
              value={macfilter}
              description={'The MAC Address to add to the filter list'}
            />
          </InfoTooltip>
        </BorderRouterPropertyContainer>
      </ConfigPropertyContainer>
      <ConfigPropertyContainer>
        <ThemedButton
          onClick={() => macfilterUpdate(true, macfilter)}
          themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
        >
          Add
        </ThemedButton>
        <ThemedButton
          onClick={() => macfilterUpdate(false, macfilter)}
          themedButtonType={THEMED_BUTTON_TYPE.SECONDARY}
        >
          Remove
        </ThemedButton>
      </ConfigPropertyContainer>
    </>
  );
}

interface MacFilterSettingsTheme {
  listBackgroundColor: Color;
}

const macFilterSettingsThemeImplementations =
  new ComponentThemeImplementations<MacFilterSettingsTheme>();
const tiMacFilterSettingsTheme = {
  listBackgroundColor: ColorScheme.getColor('bg0', THEME.TI),
};
macFilterSettingsThemeImplementations.set(THEME.TI, tiMacFilterSettingsTheme);
const gruvboxMacFilterSettingsTheme = {
  listBackgroundColor: ColorScheme.getColor('bg1', THEME.GRUVBOX),
};
macFilterSettingsThemeImplementations.set(THEME.GRUVBOX, gruvboxMacFilterSettingsTheme);

export function MacFilterSettings(props: {
  macfilterlist: NCPProperties['macfilterlist'];
  macfiltermode: NCPProperties['macfiltermode'];
}) {
  const [macFilterList, setMacFilterList] = useState(props.macfilterlist);
  let [availFilters, setAvailFilters] = useState(10);
  const theme = useContext(ThemeContext);
  const {listBackgroundColor} = macFilterSettingsThemeImplementations.get(theme);

  useEffect(() => {
    setMacFilterList(processMacFilters(props.macfilterlist));
  }, [props.macfilterlist]);

  const processMacFilters = (list: string[] | null) => {
    if (list == null) {
      return [''];
    } else {
      let result = [];
      let availFilterCount = 0;

      for (let i = 0; i < list.length; i++) {
        if (list[i] !== '0000000000000000') {
          result.push(list[i]);
        } else {
          availFilterCount++;
        }
      }
      setAvailFilters(availFilterCount);
      return result;
    }
  };
  return (
    <TileColumnLayout>
      <MacFilterModeConfig value={props.macfiltermode} />
      <MacFilterUpdater />
      <ThemedLabel style={{fontSize: 14, fontStyle: 'italic'}}>
        {availFilters} filters available
      </ThemedLabel>
      <div
        className="macfilterList"
        style={{
          backgroundColor: listBackgroundColor,
          height: 336,
          width: 154,
          boxShadow: '0px 0px 4px rgb(0 0 0 / 25%)',
        }}
      >
        <ThemedUnorderedList style={{marginBottom: 0}} items={macFilterList} />
      </div>
    </TileColumnLayout>
  );
}
