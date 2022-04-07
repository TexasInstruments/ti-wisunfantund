import {ReactElement} from 'react';
import {Color} from './ColorScheme';

export interface FlexTableColumnFormat {
  headerValue: string | ReactElement;
  style: React.CSSProperties;
}

export type FlexTableFormat = FlexTableColumnFormat[];

export interface FontSpec {
  size: number;
  weight: string;
}

export interface BorderRouterIPEntry {
  ip: string;
  prefixLen: number;
  origin: string;
  valid: string;
  preferred: string;
}

export interface IPAddressInfo {
  ipAddress: string;
  isSelected: boolean;
  isConnected: boolean;
}
export interface CytoscapeNode {
  data: {
    id: string;
  };
  selected?: boolean;
}
export interface CytoscapeEdge {
  data: {
    source: string;
    target: string;
    id: string;
  };
}

export interface CytoscapeGraph {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}
export interface PingRecord {
  sourceIP: string;
  destIP: string;
  start: string;
  duration: number;
  packetSize: number;
  wasSuccess: boolean;
}

export interface PingburstAbortStatus {
  destIP: string;
  wasAbortSuccess: boolean;
}

export type NumberOfPacketsQuantity = '∞' | number;

export interface Pingburst {
  destIP: string;
  packetSize: number;
  timeout: number;
  interval: number;
  numPacketsRemaining: NumberOfPacketsQuantity;
}

export interface AutoPingburst {
  on: boolean;
  packetSize: number;
  timeout: number;
  interval: number;
  numPacketsRemaining: NumberOfPacketsQuantity;
}

export class ColorThresholds {
  thresholds: number[];
  colors: Color[];

  constructor(thresholds: number[], colors: Color[]) {
    /** n thresholds make n + 1 segments
     * these segments are colored by the corresponding colors
     * thresholds should be sorted
     * e.g.
     *thresholds =  [0 , 1, 2 ,3 ]
     * colors = ['green','blue', 'red', 'yellow', 'orange]
     * for any x
     *  x <= 0 -> colored green
     *  0 <= x < 1 -> colored blue
     *  1 <= x < 2 -> colored red
     *  2 <= x < 3 -> colored yellow
     *  x > 3 colored orange
     */
    this.thresholds = thresholds;
    this.thresholds.sort();
    /**should include 1 more element than is in thresholds */
    this.colors = colors;
    if (this.thresholds.length + 1 !== this.colors.length) {
      console.assert('Invalid Thresholds/Colors Length');
    }
  }

  public getColor(value: number): Color {
    let index = this.thresholds.findIndex(threshold => value <= threshold);
    if (index === -1) {
      index = this.thresholds.length;
    }
    return this.colors[index];
  }
}
export interface Topology {
  graph: CytoscapeGraph;
  numConnected: number;
  connectedDevices: string[];
  routes: string[][];
}

export interface RequestStatus {
  wasSuccess: boolean;
  message?: string;
}
