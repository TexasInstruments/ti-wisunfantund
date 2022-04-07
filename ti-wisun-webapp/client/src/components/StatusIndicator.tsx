import React, {useContext} from 'react';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {ComponentThemeImplementations} from '../utils';
import '../assets/StatusIndicator.css'

interface StatusIndicatorProps {
  isGoodStatus: boolean | null;
}
interface StatusIndicatorTheme {
  goodColor: Color;
  badColor: Color;
  loadingColor: Color;
  style: React.CSSProperties;
}
const statusIndicatorThemeImplementations =
  new ComponentThemeImplementations<StatusIndicatorTheme>();
const tiStatusIndicatorTheme = {
  goodColor: ColorScheme.getColor('green', THEME.TI),
  badColor: ColorScheme.getColor('red', THEME.TI),
  loadingColor: ColorScheme.getColor('gray', THEME.TI),
  style: {
    width: 28,
    height: 28,
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
  },
};
statusIndicatorThemeImplementations.set(THEME.TI, tiStatusIndicatorTheme);

const gruvboxStatusIndicatorTheme = {
  goodColor: ColorScheme.getColor('green', THEME.GRUVBOX),
  badColor: ColorScheme.getColor('red', THEME.GRUVBOX),
  loadingColor: ColorScheme.getColor('gray', THEME.GRUVBOX),
  style: {
    width: 22,
    height: 22,
    border: `3px solid ${ColorScheme.getColor('bg1', THEME.GRUVBOX)}`,
    borderRadius: 16,
  },
};
statusIndicatorThemeImplementations.set(THEME.GRUVBOX, gruvboxStatusIndicatorTheme);

export default function StatusIndicator({isGoodStatus}: StatusIndicatorProps) {
  const theme = useContext(ThemeContext);
  let {goodColor, badColor, loadingColor, style} = statusIndicatorThemeImplementations.get(theme);
  let statusColor;
  if (isGoodStatus === null){
    statusColor =  loadingColor
  }else if(isGoodStatus){
    statusColor =  goodColor
  }else{
    statusColor =  badColor
  }
  style = {
    backgroundColor: statusColor,
    ...style,
  };

  return <div className={`statusIndicator ${isGoodStatus===null ? "loadingStatus": ""}`} style={style}></div>;
}
