import {CSSProperties, ReactEventHandler, useContext} from 'react';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {ComponentThemeImplementations} from '../utils';

interface HamburgerIconTheme {
  enabledColor: Color;
}

const hamburgerIconThemeImplementations = new ComponentThemeImplementations<HamburgerIconTheme>();
const tiHamburgerIconTheme = {
  enabledColor: ColorScheme.getColor('redDark', THEME.TI),
};
hamburgerIconThemeImplementations.set(THEME.TI, tiHamburgerIconTheme);
const gruvboxHamburgerIconTheme = {
  enabledColor: ColorScheme.getColor('bg1', THEME.GRUVBOX),
};
hamburgerIconThemeImplementations.set(THEME.GRUVBOX, gruvboxHamburgerIconTheme);

interface HamburgerIconProps {
  style?: CSSProperties;
  enabled?: boolean;
  onClick?: ReactEventHandler;
}

export function HamburgerIcon({style, enabled, onClick}: HamburgerIconProps) {
  const theme = useContext(ThemeContext);
  const {enabledColor} = hamburgerIconThemeImplementations.get(theme);

  return (
    <svg
      onClick={onClick}
      style={style}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="9" fill={enabled ? enabledColor : 'rgba(0,0,0,0)'} />
      <rect x="8.61523" y="8.61523" width="14.7692" height="2.46154" fill="white" />
      <rect x="8.61523" y="14.769" width="14.7692" height="2.46154" fill="white" />
      <rect x="8.61523" y="20.9231" width="14.7692" height="2.46154" fill="white" />
    </svg>
  );
}
