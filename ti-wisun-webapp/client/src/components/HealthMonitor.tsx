import Tile from './Tile';
import BarChart from './BarChart';
import PieChart from './PieChart';
import {getIPAddressInfoByIP} from '../App';
import {useContext} from 'react';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import SuccessRateLineChart from './SuccessRateLineChart';
import {average, ComponentThemeImplementations, getNickname} from '../utils';
import {IPAddressInfo, Pingburst, PingRecord} from '../types';
// the values of the enum will be labels of graphs

export enum HEALTH_CATEGORY {
  URGENT = '0%-30%',
  POOR = '30%-60%',
  FAIR = '60%-90%',
  GOOD = '90%-100%',
}

export interface IPHealthInfo {
  averageSuccess: number;
  numSamples: number;
  healthCategory: HEALTH_CATEGORY;
}

export type ResultsMap = Map<string, IPHealthInfo>;

interface ChartCommonElementOptions {
  backgroundColor: string;
  borderColor: string;
}
export type CategoryColorMap = Map<HEALTH_CATEGORY, ChartCommonElementOptions>;

function successRateToCategory(successRate: number) {
  if (successRate <= 30) {
    return HEALTH_CATEGORY.URGENT;
  } else if (successRate <= 60) {
    return HEALTH_CATEGORY.POOR;
  } else if (successRate <= 90) {
    return HEALTH_CATEGORY.FAIR;
  } else {
    return HEALTH_CATEGORY.GOOD;
  }
}

interface HealthMonitorCommonChartTheme {
  //colors indicate health categories urgent, poor, fair, good in that order
  backgroundColors: Color[];
  borderColors: Color[];
}
const healthMonitorCommonChartThemeImplementations =
  new ComponentThemeImplementations<HealthMonitorCommonChartTheme>();

const tiHealthMonitorCommonChartTheme = {
  backgroundColors: ['red', 'orange', 'yellow', 'green'].map<Color>((color: Color) =>
    ColorScheme.getColorWithOpacity(color, 0.6, THEME.TI)
  ),
  borderColors: ['red', 'orange', 'yellow', 'green'].map<Color>((color: Color) =>
    ColorScheme.getColor(color, THEME.TI)
  ),
};
healthMonitorCommonChartThemeImplementations.set(THEME.TI, tiHealthMonitorCommonChartTheme);
const gruvboxHealthMonitorCommonChartTheme = {
  backgroundColors: ['red', 'orange', 'yellow', 'green'].map<Color>((color: Color) =>
    ColorScheme.getColorWithOpacity(color, 0.6, THEME.GRUVBOX)
  ),
  borderColors: ['red', 'orange', 'yellow', 'green'].map<Color>((color: Color) =>
    ColorScheme.getColor(color, THEME.GRUVBOX)
  ),
};
healthMonitorCommonChartThemeImplementations.set(
  THEME.GRUVBOX,
  gruvboxHealthMonitorCommonChartTheme
);

interface HealthMonitorProps {
  pingbursts: Pingburst[];
  pingrecords: PingRecord[];
  ipAddressInfoArray: IPAddressInfo[];
}

export default function HealthMonitor(props: HealthMonitorProps) {
  const pingrecords = props.pingrecords;
  const pingbursts = props.pingbursts;
  //has the ip's ->  average success rate, health category, number of samples used for the average
  let resultsMap: ResultsMap = new Map();

  pingbursts.forEach(pingburst => {
    const destIP = pingburst.destIP;
    const pingRecordsForThisDestIP: PingRecord[] = pingrecords.filter(
      pingrecord => pingrecord.destIP === destIP
    );
    let pingburstAverageSuccess =
      average(pingRecordsForThisDestIP.map(record => (record['wasSuccess'] ? 1 : 0))) * 100; //get the average of the current ping records

    const label = getNickname(destIP);

    let ipHealthInfo = null;
    const healthInfo = resultsMap.get(label);
    if (healthInfo !== undefined) {
      const pingburstNumSamples = pingRecordsForThisDestIP.length;
      const numSamples = healthInfo.numSamples + pingburstNumSamples;
      //the new average, has to take into account previous amount of samples the average
      const averageSuccess =
        (healthInfo.averageSuccess * healthInfo.numSamples +
          pingburstAverageSuccess * pingburstNumSamples) /
        numSamples;
      ipHealthInfo = {
        averageSuccess,
        numSamples,
        healthCategory: successRateToCategory(averageSuccess),
      };
    } else {
      ipHealthInfo = {
        averageSuccess: pingburstAverageSuccess,
        numSamples: pingRecordsForThisDestIP.length,
        healthCategory: successRateToCategory(pingburstAverageSuccess),
      };
    }

    resultsMap.set(label, ipHealthInfo);
  });

  const theme = useContext(ThemeContext);
  const {backgroundColors, borderColors} = healthMonitorCommonChartThemeImplementations.get(theme);
  const categoryColorMap = new Map<HEALTH_CATEGORY, ChartCommonElementOptions>();
  const categoryOrder = [
    HEALTH_CATEGORY.URGENT,
    HEALTH_CATEGORY.POOR,
    HEALTH_CATEGORY.FAIR,
    HEALTH_CATEGORY.GOOD,
  ];
  for (const [index, category] of categoryOrder.entries()) {
    categoryColorMap.set(category, {
      backgroundColor: backgroundColors[index],
      borderColor: borderColors[index],
    });
  }

  return (
    <Tile omitHeader={true}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: 20,
          marginLeft: 'auto',
          marginRight: 'auto',
          width: '80%',
          marginBottom: 40,
          gap: 50,
        }}
      >
        <SuccessRateLineChart {...props} />
        <BarChart resultsMap={resultsMap} categoryColorMap={categoryColorMap} />
        <PieChart resultsMap={resultsMap} categoryColorMap={categoryColorMap} />
      </div>
    </Tile>
  );
}
