import React from 'react';
import * as d3 from 'd3';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {average, ComponentThemeImplementations, getNickname, timestampStringToDate} from '../utils';
import {IPAddressInfo, Pingburst, PingRecord} from '../types';

interface Datum {
  movingAverage: number;
  cumulativeAverage: number;
  start: Date;
  wasSuccess: boolean;
}

interface IPSeries {
  data: Datum[];
  color: Color;
  label: string;
  id: string;
}

interface Path {
  label: string;
  color: Color;
  movAveDString: string;
  cumAveDString: string;
}

function ipSeries(pingrecords: PingRecord[], destIP: string, color: Color): IPSeries {
  let data: Datum[] = [];

  for (const pingrecord of pingrecords) {
    data.push({
      start: timestampStringToDate(pingrecord.start),
      wasSuccess: pingrecord.wasSuccess,
      movingAverage: -1,
      cumulativeAverage: -1,
    });
  }

  data = d3.sort(data, datum => datum.start);
  let cumulativeAverage: number | null = null;
  function datumWasSuccessNum(datum: Datum) {
    return datum.wasSuccess ? 1 : 0;
  }

  const NUM_PREVIOUS = 8; //for moving point average
  data.forEach((datum, index) => {
    const lowerBound = Math.max(0, index - NUM_PREVIOUS); //inclusive
    const upperBound = index + 1; //noninclusive
    datum['movingAverage'] = average(
      Array.from(data.slice(lowerBound, upperBound), datumWasSuccessNum)
    );
    if (cumulativeAverage === null) {
      cumulativeAverage = datumWasSuccessNum(datum);
    } else {
      cumulativeAverage = (cumulativeAverage * index + datumWasSuccessNum(datum)) / (index + 1);
    }
    datum['cumulativeAverage'] = cumulativeAverage;
  });
  return {data, color, id: destIP, label: getNickname(destIP)};
}

interface SuccessRateLineChartProps {
  pingrecords: PingRecord[];
  ipAddressInfoArray: IPAddressInfo[];
}
interface SuccessRateLineChartState {
  seriesPaths: Path[];
}

interface SuccessRateLineChartTheme {
  textColor: Color;
  gridColor: Color;
  availableLineColors: Color[];
}
const errorRateLineChartThemeImplementations =
  new ComponentThemeImplementations<SuccessRateLineChartTheme>();
const tiSuccessRateLineChartTheme = {
  textColor: ColorScheme.getColor('gray', THEME.TI),
  gridColor: ColorScheme.getColorWithOpacity('grayLight', 0.6, THEME.TI),
  availableLineColors: ['blue', 'green', 'yellow', 'orange'].map(colorName =>
    ColorScheme.getColor(colorName, THEME.TI)
  ),
};
errorRateLineChartThemeImplementations.set(THEME.TI, tiSuccessRateLineChartTheme);

const gruvboxSuccessRateLineChartTheme = {
  textColor: ColorScheme.getColor('white', THEME.GRUVBOX),
  gridColor: ColorScheme.getColorWithOpacity('gray', 0.6, THEME.GRUVBOX),
  availableLineColors: ['blue', 'green', 'yellow', 'orange'].map(colorName =>
    ColorScheme.getColor(colorName, THEME.GRUVBOX)
  ),
};
errorRateLineChartThemeImplementations.set(THEME.GRUVBOX, gruvboxSuccessRateLineChartTheme);
// if (theme === THEME.TI) {
// } else {
//   textColor = ColorScheme.getColor("white", theme);
//   gridColor = ColorScheme.getColorWithOpacity("gray", 0.6, theme);
// }
// let availableLineColors = ["blue", "green", "yellow", "orange"].map(
//   (colorName) => ColorScheme.getColor(colorName, theme)
// );

export default class SuccessRateLineChart extends React.Component<
  SuccessRateLineChartProps,
  SuccessRateLineChartState
> {
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
  movingAveragelineGenerator = d3
    .line<Datum>()
    .curve(d3.curveBumpX)
    .x(datum => this.xScale(datum.start))
    .y(datum => this.yScale(datum.movingAverage));
  cumulativeAveragelineGenerator = d3
    .line<Datum>()
    .x(datum => this.xScale(datum.start))
    .y(datum => this.yScale(datum.cumulativeAverage));

  // .tickSizeOuter(0);
  //   const yAxis = d3.axisLeft(yScale).ticks(height / 40, yFormat);
  componentDidUpdate() {
    this.yScale.domain([0, 100]);
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
    this.yScale.domain([0, 100]);
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
      errorRateLineChartThemeImplementations.get(theme);

    const {pingrecords, ipAddressInfoArray} = this.props;
    const seriesArray = ipAddressInfoArray
      .filter(info => info.isSelected)
      .map((info, index) => {
        return ipSeries(
          pingrecords,
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
    this.yScale.domain([0, 1]);
    const seriesPaths: Path[] = seriesArray.map(series => {
      //changes a null to an empty string
      const nToS = (s: string | null) => (s === null ? '' : s);
      return {
        ...series,
        cumAveDString: nToS(this.movingAveragelineGenerator(series.data)),
        movAveDString: nToS(this.cumulativeAveragelineGenerator(series.data)),
      };
    });

    const lines = seriesPaths.map(path => {
      return (
        // <g key={path.id}>
        <>
          <path fill="none" stroke={path.color} d={path.cumAveDString} strokeWidth="3"></path>
          <path fill="none" stroke={path.color} strokeDasharray="3" d={path.movAveDString}></path>
        </>
      );
    });

    const legendElements = seriesPaths.map((path: Path, index: number) => {
      const side = 14;
      const spacing = side * 1.5;
      return (
        <g transform={`translate(5,${spacing * index})`}>
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
            <text fill={textColor}>Success Rate %</text>
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
            Success Rate vs. Time
          </text>
        </g>
        <g transform={`translate(${this.viewportWidth - this.margin.right},${this.margin.top})`}>
          {legendElements}
        </g>
      </svg>
    );
  }
}
