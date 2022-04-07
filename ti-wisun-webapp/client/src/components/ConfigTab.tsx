import '../App.css';
import Tile from './Tile';
import {ThemedInput} from './ThemedInput';
import ThemedLabel from './ThemedLabel';
import {AppContext} from '../Contexts';
import produce from 'immer';
import {NCPNumberProperties, NCPProperties, NCPStringProperties} from '../App';
import {Topology} from '../types';
import {PaneContainer} from './PaneContainer';
import {MacFilterSettings} from './MacFilterSettings';
import {NetworkProperties} from './NetworkProperties';
import {useContext} from 'react';
import {NCPStatus} from './NCPStatus';
import {BorderRouterInfoProperties} from './BorderRouterInfoProperties';
import {BorderRouterConfigProperties} from './BorderRouterConfigProperties';
import {ChannelConfig} from './ChannelConfig';

interface ConfigTabProps {
  ncpProperties: NCPProperties;
  dirtyNCPProperties: Partial<NCPProperties>;
  topology: Topology;
}

export default function ConfigTab(props: ConfigTabProps) {
  return (
    <PaneContainer
      maxColumns={3}
      columnWidthMinMax={{min: 350, max: 500}}
      elementOrdering={[
        [[4, 2, 3, 0, 1, 5]],
        [
          [2, 3, 0],
          [4, 5, 1],
        ],
        [
          [0, 1],
          [2, 3],
          [4, 5],
        ],
      ]}
      gutterWidth={20}
      style={{width: '91.67vw'}}
    >
      <div className="tile_container_full tile_container_common">
        <Tile title="Network Properties">
          <NetworkProperties
            interfaceUp={props.ncpProperties['Interface:Up']}
            connectedDevices={props.topology.connectedDevices}
            borderRouterIPs={props.ncpProperties['IPv6:AllAddresses']}
          />
        </Tile>
      </div>
      <div className="tile_container_full tile_container_common">
        <Tile title="MAC Filter Settings">
          <MacFilterSettings
            macfilterlist={props.ncpProperties.macfilterlist}
            macfiltermode={props.ncpProperties.macfiltermode}
          />
        </Tile>
      </div>
      <div className="tile_container_full tile_container_common">
        <Tile title="Border Router Properties">
          <BorderRouterConfigProperties ncpProperties={props.ncpProperties} />
        </Tile>
      </div>
      <div className="tile_container_full tile_container_common">
        <Tile title="Border Router Info">
          <BorderRouterInfoProperties ncpProperties={props.ncpProperties} />
        </Tile>
      </div>
      <div className="tile_container_full tile_container_common">
        <Tile title="Network Status">
          <NCPStatus
            ncpState={props.ncpProperties['NCP:State']}
            stackUp={props.ncpProperties['Stack:Up']}
            interfaceUp={props.ncpProperties['Interface:Up']}
          ></NCPStatus>
        </Tile>
      </div>
      <div className="tile_container_full tile_container_common">
        <Tile title="Channel Configuration">
          <ChannelConfig ncpProperties={props.ncpProperties} />
        </Tile>
      </div>
    </PaneContainer>
  );
}
