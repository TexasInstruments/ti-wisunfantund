import React, {useState} from 'react';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import cytoscape from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';
import dagre from 'cytoscape-dagre';
import produce from 'immer';
import {CytoscapeGraph, IPAddressInfo} from '../types';
import {ComponentThemeImplementations} from '../utils';
import {InfoMessageTooltipCard, InfoTooltip, InfoTooltipMode} from './InfoTooltip';
import LEDObject from './LEDObject';

cytoscape.use(dagre);

interface TopologyProps {
  ipAddressInfoArray: IPAddressInfo[];
  ipSelectionHandler: (ip: string, isSelected: boolean) => void;
  elements: CytoscapeGraph;
}

// This function returns the info for how dashes will depict different links
// Higher quality == better dashes
const getQuality = (rssiIn: number | null, rssiOut: number | null) => {
  let quality;
  if (!rssiIn || !rssiOut) {
    quality = -1;
  } else {
    quality = ((rssiIn + rssiOut) / (255 * 2)) * 100;
  }
  if (quality >= 70) {
    return [1, 0];
  } else if (quality >= 40) {
    return [12, 3];
  } else {
    return [3, 3];
  }
};

interface TopologyTheme {
  stylesheet: cytoscape.Stylesheet[];
}
const topologyThemeImplementations = new ComponentThemeImplementations<TopologyTheme>();
const tiTopologyTheme: TopologyTheme = {
  stylesheet: [
    {
      selector: 'node',
      style: {
        'background-color': ColorScheme.getColor('red', THEME.TI),
      },
    },
    {
      selector: 'edge',
      style: {
        width: 3,
        'line-style': 'dashed',
        'line-color': ColorScheme.getColor('gray', THEME.TI),
        'target-arrow-color': ColorScheme.getColor('gray', THEME.TI),
        'line-dash-pattern': ((ele: any) => {
          const rssiIn = ele.data('rssiIn');
          const rssiOut = ele.data('rssiOut');
          return getQuality(rssiIn, rssiOut);
        }) as any,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'background-color': ColorScheme.getColor('blue', THEME.TI),
      },
    },
  ],
};
topologyThemeImplementations.set(THEME.TI, tiTopologyTheme);
const gruvboxTopologyTheme = {
  stylesheet: [
    {
      selector: 'node',
      style: {
        'background-color': ColorScheme.getColor('orange', THEME.GRUVBOX), //currently no ti orange color so use gruvbox for both,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 3,
        'line-style': 'dashed',
        'line-color': ColorScheme.getColor('fg0'),
        'target-arrow-color': ColorScheme.getColor('fg0'),
        'line-dash-pattern': ((ele: any) => {
          const rssiIn = ele.data('rssiIn');
          const rssiOut = ele.data('rssiOut');
          return getQuality(rssiIn, rssiOut);
        }) as any,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'background-color': ColorScheme.getColor('blue', THEME.GRUVBOX),
      },
    },
  ],
};

topologyThemeImplementations.set(THEME.GRUVBOX, gruvboxTopologyTheme);

interface TopologyState {
  rssiIn: string | null;
  rssiOut: string | null;
  greenLEDState: boolean | null;
  redLEDState: boolean | null;
}

const defaultTopologyState: TopologyState = {
  rssiIn: null,
  rssiOut: null,
  greenLEDState: null,
  redLEDState: null,
};

export default class Topology extends React.Component<TopologyProps, TopologyState> {
  static contextType = ThemeContext;
  cy: cytoscape.Core | null = null;
  previousTheme: THEME = this.context;

  constructor(props: TopologyProps) {
    super(props);
    this.state = defaultTopologyState;
  }

  componentDidMount() {
    if (this.cy === null) {
      return;
    }
    this.cy.on('select', 'node', e => {
      const node = e.target;
      this.props.ipSelectionHandler(node.id(), true);
    });
    this.cy.on('unselect', 'node', e => {
      const node = e.target;
      this.props.ipSelectionHandler(node.id(), false);
    });
    this.cy.on('add', 'node', _evt => {
      if (this.cy === null) {
        return;
      }
      const numNodes = this.cy.nodes().length;
      const newLayout = {
        name: 'dagre',
        boundingBox: {x1: 0, y1: 0, x2: numNodes * 18 + 180, y2: numNodes * 10 + 100},
      };
      this.cy.layout(newLayout).run();
      // this.cy.fit();
    });
    this.cy.on('mouseover', 'node', e => {
      const node = e.target;
      this.setState((prevState: TopologyState) => {
        return {
          ...prevState,
          greenLEDState: node.data('greenLEDState'),
          redLEDState: node.data('redLEDState'),
        };
      });
    });
    this.cy.on('mouseout', 'node', e => {
      this.setState((prevState: TopologyState) => {
        return {...prevState, greenLEDState: null, redLEDState: null};
      });
    });
    this.cy.on('mouseover', 'edge', e => {
      const edge = e.target;
      this.setState((prevState: TopologyState) => {
        return {...prevState, rssiIn: edge.data('rssiIn'), rssiOut: edge.data('rssiOut')};
      });
    });
    this.cy.on('mouseout', 'edge', e => {
      this.setState((prevState: TopologyState) => {
        return {...prevState, rssiIn: null, rssiOut: null};
      });
    });
    document.addEventListener('visibilitychange', this.forceRender);
  }
  forceRender = () => {
    if (this.cy === null) {
      return;
    }
    this.cy.forceRender();
  };
  componentWillUnmount() {
    document.removeEventListener('visibilitychange', this.forceRender);
  }

  componentDidUpdate() {
    if (this.cy === null) {
      return;
    }
    if (this.context !== this.previousTheme) {
      const {stylesheet} = topologyThemeImplementations.get(this.context);
      // this.cy.style(stylesheet);
      this.previousTheme = this.context;
    }
  }

  render() {
    const ipInfoArray = this.props.ipAddressInfoArray;

    //elements attributes need to be mutable
    const elements = JSON.parse(JSON.stringify(this.props.elements));

    const nodes = elements.nodes;
    for (const node of nodes) {
      const ipInfo = ipInfoArray.find(ipInfo => ipInfo.ipAddress === node.data.id);
      node.selected = ipInfo ? ipInfo.isSelected : false;
    }

    // LED State Info
    const displayLEDStates = this.state.greenLEDState != null && this.state.redLEDState != null;

    // RSSI Info
    let rssiInString, rssiOutString, displayRSSI;
    if (this.state.rssiIn && this.state.rssiOut) {
      displayRSSI = true;
      rssiInString = `RSSI in: ${this.state.rssiIn}/255`;
      rssiOutString = `RSSI out: ${this.state.rssiOut}/255`;
    }

    const layout = {
      name: 'dagre',
      boundingBox: {x1: 0, y1: 0, x2: nodes.length * 18 + 180, y2: nodes.length * 10 + 100},
    };

    const {stylesheet} = topologyThemeImplementations.get(this.context);
    return (
      <div style={{width: '100%', position: 'relative'}}>
        {(displayRSSI || displayLEDStates) && (
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              zIndex: 100,
              backgroundColor: 'white',
              boxShadow: '0px 0px 5px black',
              padding: 10,
            }}
          >
            {displayRSSI && rssiInString && rssiOutString && (
              <InfoMessageTooltipCard
                name={'Link Quality'}
                additionalDescriptions={[rssiInString, rssiOutString]}
              />
            )}
            {displayLEDStates && (
              <InfoMessageTooltipCard name={'LED States'}>
                <div style={{display: 'flex', flexDirection: 'row'}}>
                  <LEDObject theme={this.context} ledState={this.state.redLEDState} color={'red'} />
                  <LEDObject
                    theme={this.context}
                    ledState={this.state.greenLEDState}
                    color={'green'}
                  />
                </div>
              </InfoMessageTooltipCard>
            )}
          </div>
        )}
        <CytoscapeComponent
          elements={CytoscapeComponent.normalizeElements(elements)}
          cy={cy => {
            this.cy = cy;
          }}
          style={{width: '100%', height: 360}}
          layout={layout}
          stylesheet={stylesheet}
          wheelSensitivity={0.1}
        />
      </div>
    );
  }
}
