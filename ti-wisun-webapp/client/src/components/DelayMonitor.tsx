import React from 'react';
import Tile from './Tile';
import * as d3 from 'd3';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {IPAddressInfo, Pingburst, PingRecord} from '../types';
import {ComponentThemeImplementations, getNickname, timestampStringToDate} from '../utils';

//// NOTE Success Rate Line Chart implements different Datum /IPSeries/Path Types

interface Path {
  label: string;
  dString: string;
}
interface Datum {
  start: Date;
  duration: number;
}

interface IPSeries {
  data: Datum[];
  color: Color;
  label: string;
  id: string;
}

interface NetworkDelayChartTheme {
  textColor: Color;
  gridColor: Color;
  availableLineColors: Color[];
}
const networkDelayChartThemeImplementations =
  new ComponentThemeImplementations<NetworkDelayChartTheme>();

const tiNetworkDelayChartTheme = {
  textColor: ColorScheme.getColor('gray', THEME.TI),
  gridColor: ColorScheme.getColorWithOpacity('grayLight', 0.6, THEME.TI),
  availableLineColors: ['blue', 'green', 'yellow', 'orange'].map(colorName =>
    ColorScheme.getColor(colorName, THEME.TI)
  ),
};
networkDelayChartThemeImplementations.set(THEME.TI, tiNetworkDelayChartTheme);

const gruvboxNetworkDelayChartTheme = {
  textColor: ColorScheme.getColor('white', THEME.GRUVBOX),
  gridColor: ColorScheme.getColorWithOpacity('gray', 0.6, THEME.GRUVBOX),
  availableLineColors: ['blue', 'green', 'yellow', 'orange'].map(colorName =>
    ColorScheme.getColor(colorName, THEME.GRUVBOX)
  ),
};
networkDelayChartThemeImplementations.set(THEME.GRUVBOX, gruvboxNetworkDelayChartTheme);

function ipSeries(
  pingrecords: PingRecord[],
  pingbursts: Pingburst[],
  destIP: string,
  color: Color
): IPSeries {
  let data = [];
  for (let record of pingrecords) {
    data.push({
      start: timestampStringToDate(record.start),
      duration: record.duration,
    });
  }
  data = d3.sort(data, datum => datum.start);
  return {data, color, id: destIP, label: getNickname(destIP)};
}

interface NetworkDelayChartProps {
  pingbursts: Pingburst[];
  pingrecords: PingRecord[];
  ipAddressInfoArray: IPAddressInfo[];
}
interface NetworkDelayChartState {
  seriesPaths: Path[];
}

class NetworkDelayChart extends React.Component<NetworkDelayChartProps, NetworkDelayChartState> {
  static contextType = ThemeContext;

  state = {
    seriesPaths: [],
  };
  aspectRatio = 19 / 15;
  viewportHeight = 401;
  viewportWidth = this.aspectRatio * this.viewportHeight;
  margin = {
    top: 50,
    bottom: 50,
    right: 80,
    left: 80,
  };
  xAxisRef = React.createRef<SVGGElement>();
  yAxisRef = React.createRef<SVGGElement>();
  xGridlinesRef = React.createRef<SVGGElement>();
  yGridlinesRef = React.createRef<SVGGElement>();
  xScale = d3.scaleTime().range([this.margin.left, this.viewportWidth - this.margin.right]);
  yScale = d3.scaleLinear().range([this.viewportHeight - this.margin.bottom, this.margin.top]);
  xAxis = d3.axisBottom(this.xScale).ticks(d3.timeMinute.every(1));
  xGridlines = d3
    .axisBottom(this.xScale)
    .ticks(d3.timeMinute.every(1))
    .tickSize(-this.viewportHeight + this.margin.top + this.margin.bottom)
    .tickFormat(() => '');
  yAxis = d3.axisLeft(this.yScale);
  yGridlines = d3
    .axisLeft(this.yScale)
    // .ticks(20)
    .tickSize(-this.viewportWidth + this.margin.right + this.margin.left)
    .tickFormat(() => '');
  lineGenerator = d3
    .line<Datum>()
    .x(datum => this.xScale(datum.start))
    .y(datum => this.yScale(datum.duration))
    .defined(datum => datum.duration !== -1);

  // .tickSizeOuter(0);
  //   const yAxis = d3.axisLeft(yScale).ticks(height / 40, yFormat);
  componentDidUpdate() {
    if (
      this.xGridlinesRef.current === null ||
      this.yGridlinesRef.current === null ||
      this.yAxisRef.current === null ||
      this.xAxisRef.current === null
    ) {
      return;
    }
    d3.select(this.xAxisRef.current).call(this.xAxis);
    d3.select(this.yAxisRef.current).call(this.yAxis);
    d3.select(this.xGridlinesRef.current).call(this.xGridlines);
    d3.select(this.yGridlinesRef.current).call(this.yGridlines);
  }
  componentDidMount() {
    if (
      this.xGridlinesRef.current === null ||
      this.yGridlinesRef.current === null ||
      this.yAxisRef.current === null ||
      this.xAxisRef.current === null
    ) {
      return;
    }
    d3.select(this.xGridlinesRef.current).call(this.xGridlines);
    d3.select(this.yGridlinesRef.current).call(this.yGridlines);
    d3.select(this.xAxisRef.current).call(this.xAxis);
    d3.select(this.yAxisRef.current).call(this.yAxis);
  }

  render() {
    const theme = this.context;
    const {textColor, gridColor, availableLineColors} =
      networkDelayChartThemeImplementations.get(theme);

    const {pingrecords, pingbursts, ipAddressInfoArray} = this.props;
    const seriesArray = ipAddressInfoArray
      .filter(info => info.isSelected)
      .map((info, index) => {
        return ipSeries(
          pingrecords,
          pingbursts,
          info.ipAddress,
          availableLineColors[index % availableLineColors.length]
        );
      });

    const start = new Date();
    start.setMinutes(start.getMinutes() - 5);
    const finish = new Date();

    //cull_times
    for (const series of seriesArray) {
      series.data = series.data.filter(datum => start < datum.start && datum.start < finish);
    }
    //make domain
    this.xScale.domain([start, finish]);

    const allYMaxes = seriesArray.map<number>((series: IPSeries) => {
      let max = d3.max<Datum, number>(series.data, datum => datum.duration);
      if (typeof max === 'undefined') {
        max = -Infinity;
      }
      return max;
    });
    let max = d3.max(allYMaxes);
    if (typeof max === 'undefined') {
      max = -Infinity;
    }
    this.yScale.domain([0, max]);

    const seriesPaths = seriesArray.map(series => {
      const nToS = (s: string | null) => (s === null ? '' : s);
      return {
        ...series,
        dString: nToS(this.lineGenerator(series.data)),
      };
    });

    const lines = seriesPaths.map(path => (
      <path fill="none" key={path.id} stroke={path.color} strokeWidth="2" d={path.dString}></path>
    ));

    const legendElements = seriesPaths.map((path, index) => {
      const side = 14;
      const spacing = side * 1.5;
      return (
        <g key={path.dString} transform={`translate(5,${spacing * index})`}>
          <rect fill={path.color} width={`${side}`} height={`${side}`}></rect>
          <text fill={textColor} style={{fontSize: 12}} textAnchor="start" dx="20" dy="12">
            {path.label}
          </text>
        </g>
      );
    });

    return (
      <svg
        style={{width: '100%', color: textColor, overflow: 'visible'}}
        viewBox={`0 0 ${this.viewportWidth} ${this.viewportHeight}`}
        preserveAspectRatio={'xMidYMid'}
      >
        {lines}
        <g
          ref={this.xAxisRef}
          transform={`translate(0, ${this.viewportHeight - this.margin.bottom})`}
        />
        <g
          ref={this.xGridlinesRef}
          style={{color: gridColor}}
          transform={`translate(0, ${this.viewportHeight - this.margin.bottom})`}
        />
        <g
          ref={this.yGridlinesRef}
          transform={`translate(${this.margin.left}, 0)`}
          style={{color: gridColor}}
        />
        <g ref={this.yAxisRef} transform={`translate(${this.margin.left}, 0)`} />
        <g
          transform={`translate(${this.margin.left / 3}, ${
            (this.viewportHeight - this.margin.top - this.margin.bottom) / 2 + this.margin.top
          })`}
        >
          <g transform="rotate(-90)" textAnchor="middle">
            <text fill={textColor}>Duration [ms]</text>
          </g>
        </g>

        <g
          textAnchor="middle"
          transform={`translate(${
            (this.viewportWidth - this.margin.left - this.margin.right) / 2 + this.margin.left
          },${this.viewportHeight})`}
        >
          <text fill={textColor}>Start Time</text>
        </g>
        <g
          textAnchor="middle"
          transform={`translate(${
            (this.viewportWidth - this.margin.left - this.margin.right) / 2 + this.margin.left
          },${this.margin.top / 2})`}
        >
          <text transform="scale(1.5,1.5)" fill={textColor} style={{fontWeight: 600}}>
            Node Delay vs. Time
          </text>
        </g>
        <g transform={`translate(${this.viewportWidth - this.margin.right},${this.margin.top})`}>
          {legendElements}
        </g>
      </svg>
    );
  }
}

interface DelayMonitorProps {
  pingbursts: Pingburst[];
  pingrecords: PingRecord[];
  ipAddressInfoArray: IPAddressInfo[];
}

export default class DelayMonitor extends React.Component<DelayMonitorProps> {
  render() {
    return (
      <Tile omitHeader={true}>
        <div
          style={{
            width: '90%',
            marginTop: 20,
            marginLeft: 'auto',
            marginRight: 'auto',
            marginBottom: 60,
          }}
        >
          <NetworkDelayChart {...this.props} />
        </div>
      </Tile>
    );
  }
}
