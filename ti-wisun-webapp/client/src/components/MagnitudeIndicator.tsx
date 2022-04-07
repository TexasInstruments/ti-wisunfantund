import React, {useContext} from 'react';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {motion} from 'framer-motion';
import '../assets/Tooltip.css';
import Tooltip from './Tooltip';
import {ComponentThemeImplementations} from '../utils';
import {ColorThresholds} from '../types';

interface MagnitudeIndicatorTheme {
  backgroundStyle: React.CSSProperties;
  foregroundStyle: React.CSSProperties;
}
const magnitudeIndicatorThemeImplementations =
  new ComponentThemeImplementations<MagnitudeIndicatorTheme>();
const tiMagnitudeIndicatorTheme = {
  backgroundStyle: {
    backgroundColor: ColorScheme.getColor('bg0', THEME.TI),
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.3)',
  },
  foregroundStyle: {},
};
magnitudeIndicatorThemeImplementations.set(THEME.TI, tiMagnitudeIndicatorTheme);
const gruvboxMagnitudeIndicatorTheme = {
  backgroundStyle: {
    backgroundColor: ColorScheme.getColor('bg1', THEME.GRUVBOX),
    borderRadius: 9,
  },
  foregroundStyle: {
    borderRadius: 9,
  },
};
magnitudeIndicatorThemeImplementations.set(THEME.GRUVBOX, gruvboxMagnitudeIndicatorTheme);

interface MagnitudeIndicatorProps {
  colorThresholds: ColorThresholds;
  tooltip?: string;
  height?: number;
  //number in [0,1]. will be clamped otherwise
  value: number;
}

export default function MagnitudeIndicator(props: MagnitudeIndicatorProps) {
  const height = props.height || 21;
  const theme = useContext(ThemeContext);
  let {foregroundStyle, backgroundStyle} = magnitudeIndicatorThemeImplementations.get(theme);

  backgroundStyle = {
    height,
    position: 'relative',
    width: '80%',
    marginLeft: 'auto',
    marginRight: 'auto',
    overflow: 'hidden',
    ...backgroundStyle,
  };

  const value = Math.max(Math.min(1, props.value), 0);
  let foregroundColor = props.colorThresholds.getColor(value);
  foregroundStyle = {
    backgroundColor: foregroundColor,
    height,
    width: `${value * 100}%`,
    ...foregroundStyle,
  };

  const width = value * 100;
  // style={{width: '80%', left: '10%', right: 0}}
  return (
    <Tooltip content={props.tooltip || 'N/A'}>
      <div style={backgroundStyle}>
        <motion.div
          animate={{width}}
          transition={{duration: 0.5}}
          initial={false}
          style={foregroundStyle}
        />
      </div>
    </Tooltip>
  );
}
