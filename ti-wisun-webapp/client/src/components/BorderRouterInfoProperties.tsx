import {useContext} from 'react';
import {NCPProperties} from '../App';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {AppContext} from '../Contexts';
import {ComponentThemeImplementations, numToStringNullPreserving} from '../utils';
import {BorderRouterPropertyContainer} from './BorderRouterPropertyContainer';
import {InfoPropertyTooltipCard, InfoTooltip} from './InfoTooltip';
import {LoadingTextBox} from './LoadingTextBox';
import ThemedLabel from './ThemedLabel';
import {TileColumnLayout} from './TileColumnLayout';

interface BorderRouterInfoPropertyTheme {
  mainTextColor: Color;
  descriptionTextColor: Color;
}
const borderRouterInfoPropertyThemeImplementations =
  new ComponentThemeImplementations<BorderRouterInfoPropertyTheme>();
const tiBorderRouterInfoPropertyTheme = {
  mainTextColor: ColorScheme.getColor('gray', THEME.TI),
  descriptionTextColor: ColorScheme.getColor('grayLight', THEME.TI),
};
borderRouterInfoPropertyThemeImplementations.set(THEME.TI, tiBorderRouterInfoPropertyTheme);
const gruvboxBorderRouterInfoPropertyTheme = {
  mainTextColor: ColorScheme.getColor('white', THEME.GRUVBOX),
  descriptionTextColor: ColorScheme.getColor('white', THEME.TI),
};
borderRouterInfoPropertyThemeImplementations.set(
  THEME.GRUVBOX,
  gruvboxBorderRouterInfoPropertyTheme
);

function BorderRouterInfoProperty({
  name,
  value,
  description,
}: {
  name: string;
  description: string;
  value: string | null;
}) {
  const theme = useContext(ThemeContext);
  const {mainTextColor, descriptionTextColor} =
    borderRouterInfoPropertyThemeImplementations.get(theme);
  return (
    <BorderRouterPropertyContainer name={name}>
      {value === null ? (
        <LoadingTextBox maxWidth={60} />
      ) : (
        <ThemedLabel
          style={{
            fontSize: 15,
            color: descriptionTextColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </ThemedLabel>
      )}
      <InfoTooltip>
        <InfoPropertyTooltipCard name={name} value={value} description={description} />
      </InfoTooltip>
    </BorderRouterPropertyContainer>
  );
}

interface BorderRouterInfoPropertiesProps {
  ncpProperties: NCPProperties;
}

export function BorderRouterInfoProperties(props: BorderRouterInfoPropertiesProps) {
  const App = useContext(AppContext);
  if (App === null) {
    throw Error('App null and rendering ConfigTextInput');
  }
  let nodeType = null;
  if (props.ncpProperties['Network:NodeType'] !== null) {
    const found = props.ncpProperties['Network:NodeType'].match(/: (.*)/);
    if (found !== null && found.length >= 2) {
      nodeType = found[1];
    }
  }
  let networkProtocol = props.ncpProperties['NCP:InterfaceType'] === 4 ? 'WiSUN FAN' : null;
  let phyRegion = null;
  if (props.ncpProperties['NCP:Region'] !== null) {
    const found = props.ncpProperties['NCP:Region'].match(/: (.*)/);
    if (found !== null && found.length >= 2) {
      phyRegion = found[1];
    }
  }
  let ch0CenterFreq = null;
  if (props.ncpProperties['ch0centerfreq'] !== null) {
    const found = props.ncpProperties['ch0centerfreq'].match(/.*(\d{3})\D+(\d{3}).*/);
    if (found !== null && found.length >= 3) {
      ch0CenterFreq = `${parseInt(found[1]) + parseInt(found[2]) * 1e-3} MHz`;
    }
  }

  return (
    <TileColumnLayout>
      <BorderRouterInfoProperty
        name="Firmware Version"
        description="Timestamped Unique Firmware Identifier"
        value={props.ncpProperties['NCP:Version']}
      />
      <BorderRouterInfoProperty
        name="Node Type"
        description="Indicates router or border router"
        value={nodeType}
      />
      <BorderRouterInfoProperty
        name="Network Protocol"
        description="Identifies the network protocol for the NCP. Will always return Wi-SUN FAN"
        value={networkProtocol}
      />
      <BorderRouterInfoProperty
        name="Hardware Address"
        description="Eight byte hardware address (EUI-64)"
        value={props.ncpProperties['NCP:HardwareAddress']}
      />
      <BorderRouterInfoProperty
        name="PHY Region"
        description="Designated Region for current PHY Mode"
        value={phyRegion}
      />
      <BorderRouterInfoProperty
        name="PHY Mode ID"
        description="N/A"
        value={numToStringNullPreserving(props.ncpProperties['NCP:ModeID'])}
      />
      <BorderRouterInfoProperty
        name="Ch.0 Center Frequency"
        description="N/A"
        value={ch0CenterFreq}
      />
      <BorderRouterInfoProperty
        name="Channel Spacing"
        description="Current PHY Channel Spacing"
        value={props.ncpProperties['chspacing']}
      />
    </TileColumnLayout>
  );
}
