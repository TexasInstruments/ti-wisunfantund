import Pane from './Pane';
import Tile, {TileHeader} from './Tile';
import PingConfig from './PingConfig';
import AtAGlance from './AtAGlance';
import Monitor from './Monitor';
import IPAddressTable from './IPAddressTable';
import Topology from './Topology';
import '../App.css';
import {AutoPingburst, CytoscapeGraph, IPAddressInfo, Pingburst, PingRecord} from '../types';
import {PaneContainer} from './PaneContainer';
import {TileColumns} from './TileColumns';
import LEDConfig from './LEDConfig';
import MulticastPing from './MulticastPing';

interface MonitorTabProps {
  ipSelectionHandler: (ip: string, newVal: boolean) => void;
  ipAddressInfoArray: IPAddressInfo[];
  graph: CytoscapeGraph;
  pingbursts: Pingburst[];
  pingrecords: PingRecord[];
  autoPing: AutoPingburst;
}

export default function MonitorTab(props: MonitorTabProps) {
  return (
    <PaneContainer
      maxColumns={2}
      columnWidthMinMax={{min: 530, max: 650}}
      // elements are organized by column (e.g. [0,1,2] means first three items are the first column top->bottom)
      elementOrdering={[
        [[0, 1, 2, 3]],
        [
          [0, 1],
          [2, 3],
        ],
      ]}
      gutterWidth={20}
      style={{width: '91.67vw'}}
    >
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
        <Tile title="Multicast Ping">
          <MulticastPing
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
