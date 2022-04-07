import {useContext} from 'react';
import {Pie} from 'react-chartjs-2';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {FontSpec} from '../types';
import {ComponentThemeImplementations} from '../utils';
import {CategoryColorMap, HEALTH_CATEGORY, IPHealthInfo, ResultsMap} from './HealthMonitor';

interface PieChartProps {
  resultsMap: ResultsMap;
  categoryColorMap: CategoryColorMap;
}

interface BarChartTheme {
  titleFontSpec: Partial<FontSpec>;
  textColor: Color;
}
const pieChartThemeImplementations = new ComponentThemeImplementations<BarChartTheme>();

const tiPieChartTheme = {
  titleFontSpec: {
    size: 24,
    weight: '600',
  },
  textColor: ColorScheme.getColor('gray', THEME.TI),
};
pieChartThemeImplementations.set(THEME.TI, tiPieChartTheme);
const gruvboxPieChartTheme = {
  titleFontSpec: {
    size: 24,
    weight: '600',
  },
  textColor: ColorScheme.getColor('white', THEME.GRUVBOX),
};
pieChartThemeImplementations.set(THEME.GRUVBOX, gruvboxPieChartTheme);

export default function PieChart(props: PieChartProps) {
  const resultsMap = props.resultsMap;
  const resultsArray = [...resultsMap.values()];
  const categoryMap = new Map<HEALTH_CATEGORY, IPHealthInfo[]>();

  function constructCategory(healthCategory: HEALTH_CATEGORY) {
    const filteredResults = resultsArray.filter(result => result.healthCategory === healthCategory);
    categoryMap.set(healthCategory, filteredResults);
  }
  constructCategory(HEALTH_CATEGORY.URGENT);
  constructCategory(HEALTH_CATEGORY.POOR);
  constructCategory(HEALTH_CATEGORY.FAIR);
  constructCategory(HEALTH_CATEGORY.GOOD);

  const theme = useContext(ThemeContext);
  const {textColor, titleFontSpec} = pieChartThemeImplementations.get(theme);
  const backgroundColorArray = [];
  const borderColorArray = [];
  for (const {backgroundColor, borderColor} of props.categoryColorMap.values()) {
    backgroundColorArray.push(backgroundColor);
    borderColorArray.push(borderColor);
  }

  return (
    <div>
      <Pie
        data={{
          labels: [...categoryMap.keys()],
          datasets: [
            {
              data: [...categoryMap.values()].map(x => x.length),
              backgroundColor: backgroundColorArray,
              borderColor: borderColorArray,
              borderWidth: 2,
            },
          ],
        }}
        height={400}
        // width="100%"
        options={{
          plugins: {
            title: {
              display: true,
              text: 'Average Success Rate of Network Nodes',
              color: textColor,
              align: 'center',
              font: {
                family: 'Raleway',
                ...titleFontSpec,
              },
            },
            legend: {
              labels: {
                color: textColor,
              },
            },
          },
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
}
