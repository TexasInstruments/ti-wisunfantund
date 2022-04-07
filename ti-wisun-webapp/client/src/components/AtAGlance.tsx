import React, {useContext} from 'react';
import '../assets/AtAGlance.css';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {ColorThresholds, Pingburst, PingRecord} from '../types';
import {ComponentThemeImplementations} from '../utils';
import ArcBar from './ArcBar';
interface AtAGlanceTheme {
  gradeStyle: {
    color: Color;
    fontWeight?: number;
  };
  delayThresholdColors: Color[];
  successThresholdColors: Color[];
}
const AtAGlanceThemeImplementions = new ComponentThemeImplementations<AtAGlanceTheme>();

const tiAtAGlanceTheme = {
  gradeStyle: {
    color: ColorScheme.getColor('gray', THEME.TI),
    fontWeight: 600,
  },
  delayThresholdColors: [
    ColorScheme.getColor('green', THEME.TI),
    ColorScheme.getColor('yellow', THEME.TI),
    ColorScheme.getColor('orange', THEME.TI),
    ColorScheme.getColor('red', THEME.TI),
  ],
  successThresholdColors: [
    ColorScheme.getColor('red', THEME.TI),
    ColorScheme.getColor('orange', THEME.TI),
    ColorScheme.getColor('yellow', THEME.TI),
    ColorScheme.getColor('green', THEME.TI),
  ],
};
AtAGlanceThemeImplementions.set(THEME.TI, tiAtAGlanceTheme);
const gruvboxAtAGlanceTheme = {
  gradeStyle: {
    color: ColorScheme.getColor('white', THEME.GRUVBOX),
  },
  delayThresholdColors: [
    ColorScheme.getColor('green', THEME.GRUVBOX),
    ColorScheme.getColor('yellow', THEME.GRUVBOX),
    ColorScheme.getColor('orange', THEME.GRUVBOX),
    ColorScheme.getColor('red', THEME.GRUVBOX),
  ],
  successThresholdColors: [
    ColorScheme.getColor('red', THEME.GRUVBOX),
    ColorScheme.getColor('orange', THEME.GRUVBOX),
    ColorScheme.getColor('yellow', THEME.GRUVBOX),
    ColorScheme.getColor('green', THEME.GRUVBOX),
  ],
};
AtAGlanceThemeImplementions.set(THEME.GRUVBOX, gruvboxAtAGlanceTheme);

interface AtAGlanceProps {
  pingbursts: Pingburst[];
  pingrecords: PingRecord[];
}

export default function AtAGlance(props: AtAGlanceProps) {
  const pingbursts = props.pingbursts;
  const pingrecords = props.pingrecords;
  let successCounter = 0;
  let packetCounter = 0;
  let durationSum = 0;
  let successSum = 0;
  for (const record of pingrecords) {
    successSum += record.wasSuccess ? 1 : 0;
    packetCounter++;
    if (record.wasSuccess) {
      durationSum += record.duration;
      successCounter++;
    }
  }

  const averageDuration = successCounter !== 0 ? durationSum / successCounter : 1;
  const successRate = packetCounter !== 0 ? successSum / packetCounter : 1;
  const maxDuration = 1000;
  let durationPercent = Math.min(1, averageDuration / maxDuration);

  let thresholds = [0.5, 0.6, 0.7, 0.8];
  let thresholdGrades = ['C', 'B', 'A', 'A+'];
  const overallMetric = (1 - durationPercent + successRate) / 2;
  let grade = 'D';
  for (const [index, threshold] of thresholds.entries()) {
    if (threshold < overallMetric) {
      grade = thresholdGrades[index];
    }
  }
  const theme = useContext(ThemeContext);
  const {gradeStyle, successThresholdColors, delayThresholdColors} =
    AtAGlanceThemeImplementions.get(theme);
  const successThreshold = new ColorThresholds([0.2, 0.5, 0.7], successThresholdColors);
  const delayThreshold = new ColorThresholds([0.2, 0.5, 0.7], delayThresholdColors);
  return (
    <div className="at_a_glance_container">
      <ArcBar
        minLabel="0%"
        maxLabel="100%"
        valueText={`${(successRate * 100).toFixed(1)}%`}
        valueDescription="Success Rate"
        style={{width: '55%'}}
        percentFull={successRate}
        colorThresholds={successThreshold}
      />
      <ArcBar
        minLabel="0"
        maxLabel={`${maxDuration}`}
        valueText={`${Math.floor(averageDuration)}ms`}
        valueDescription="Average Delay"
        style={{width: '55%'}}
        percentFull={durationPercent}
        colorThresholds={delayThreshold}
      />
      {/* <h2 style={gradeStyle} className="at_a_glance_grade">
        Grade: {grade}
      </h2> */}
    </div>
  );
}
