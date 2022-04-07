import React, {useContext} from 'react';
import {Bar} from 'react-chartjs-2';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {FontSpec} from '../types';
import {ComponentThemeImplementations} from '../utils';
import {CategoryColorMap, ResultsMap} from './HealthMonitor';

interface BarChartProps {
  resultsMap: ResultsMap;
  categoryColorMap: CategoryColorMap;
}

interface BarChartTheme {
  titleFontSpec: Partial<FontSpec>;
  axisLabelFontSpec: Partial<FontSpec>;
  textColor: Color;
  gridColor: Color;
}
const barChartThemeImplementations = new ComponentThemeImplementations<BarChartTheme>();

const tiBarChartTheme = {
  titleFontSpec: {
    size: 24,
    weight: '600',
  },
  axisLabelFontSpec: {
    size: 18,
    weight: '400',
  },
  textColor: ColorScheme.getColor('gray', THEME.TI),
  gridColor: ColorScheme.getColorWithOpacity('grayLight', 0.6, THEME.TI),
};
barChartThemeImplementations.set(THEME.TI, tiBarChartTheme);
const gruvboxBarChartTheme = {
  titleFontSpec: {
    size: 24,
    weight: '600',
  },
  axisLabelFontSpec: {
    size: 18,
    weight: '400',
  },
  textColor: ColorScheme.getColor('white', THEME.GRUVBOX),
  gridColor: ColorScheme.getColorWithOpacity('gray', 0.6, THEME.GRUVBOX),
};
barChartThemeImplementations.set(THEME.GRUVBOX, gruvboxBarChartTheme);

export default function BarChart(props: BarChartProps) {
  const resultsMap = props.resultsMap;
  const resultsArray = [...resultsMap.values()];

  const colorMap = props.categoryColorMap;
  const data = resultsArray.map(result => result.averageSuccess);
  const backgroundColorArray: Color[] = [];
  const borderColorArray: Color[] = [];
  resultsArray.forEach(result => {
    let commonElements = colorMap.get(result.healthCategory);
    if (typeof commonElements === 'undefined') {
      backgroundColorArray.push('#000000');
      borderColorArray.push('#000000');
    } else {
      backgroundColorArray.push(commonElements.backgroundColor);
      borderColorArray.push(commonElements.backgroundColor);
    }
  });
  const theme = useContext(ThemeContext);
  const {textColor, gridColor, titleFontSpec, axisLabelFontSpec} =
    barChartThemeImplementations.get(theme);

  return (
    <div>
      <Bar
        data={{
          labels: [...resultsMap.keys()],
          datasets: [
            {
              // label: "average success rate",
              data,
              backgroundColor: backgroundColorArray,
              borderColor: borderColorArray,
              borderWidth: 2,
            },
          ],
        }}
        height={400} //
        // width={200}
        color={textColor}
        options={{
          plugins: {
            title: {
              display: true,
              text: 'Average Success Rate per Network Node',
              color: textColor,
              align: 'center',
              font: {
                family: 'Raleway',
                ...titleFontSpec,
              },
            },

            legend: {
              display: false,
            },
          },
          maintainAspectRatio: false,
          scales: {
            y: {
              max: 100,
              beginAtZero: true,
              ticks: {
                color: textColor,
              },
              grid: {
                color: gridColor,
              },
              title: {
                display: true,
                text: 'Percent Success',
                color: textColor,
                align: 'center',
                font: {
                  family: 'Raleway',
                  ...axisLabelFontSpec,
                },
              },
            },
            x: {
              ticks: {
                color: textColor,
                font: {
                  family: 'Raleway',
                  ...axisLabelFontSpec,
                },
              },
              grid: {
                color: gridColor,
              },
            },
          },
        }}
      />
    </div>
  );
}
