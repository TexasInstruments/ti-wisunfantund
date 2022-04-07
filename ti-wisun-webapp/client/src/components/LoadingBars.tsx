import {useContext} from 'react';
import '../assets/LoadingBars.css';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {ComponentThemeImplementations} from '../utils';

interface LoadingBarsTheme {
  fill: Color;
}

const loadingBarsThemeImplementations = new ComponentThemeImplementations<LoadingBarsTheme>();
const tiLoadingBarTheme = {
  fill: ColorScheme.getColor('grayLight', THEME.TI),
};
loadingBarsThemeImplementations.set(THEME.TI, tiLoadingBarTheme);
const gruvboxLoadingBarTheme = {
  fill: ColorScheme.getColor('gray', THEME.GRUVBOX),
};
loadingBarsThemeImplementations.set(THEME.GRUVBOX, gruvboxLoadingBarTheme);

interface LoadingBarsProps {
  style?: React.CSSProperties;
}

export function LoadingBars(props: LoadingBarsProps) {
  const theme = useContext(ThemeContext);
  const {fill} = loadingBarsThemeImplementations.get(theme);
  return (
    <svg style={props.style} viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="barContainer">
        <rect x="11" y="23" width="66" height="255" fill={fill} />
        <rect x="117" y="23" width="65" height="255" fill={fill} />
        <rect x="222" y="23" width="66" height="255" fill={fill} />
      </g>
    </svg>
  );
}
