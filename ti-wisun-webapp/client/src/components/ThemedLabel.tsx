import {ReactNode, useContext} from 'react';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {ComponentThemeImplementations} from '../utils';

interface ThemedLabelProps {
  style?: React.CSSProperties;
  children: ReactNode;
  className?: string;
}

interface ThemedLabelTheme {
  labelStyle: React.CSSProperties;
}
const themedLabelThemeImplementations = new ComponentThemeImplementations<ThemedLabelTheme>();
const tiThemedLabelTheme = {
  labelStyle: {
    color: ColorScheme.getColor('gray', THEME.TI),
    fontWeight: 600,
  },
};
themedLabelThemeImplementations.set(THEME.TI, tiThemedLabelTheme);

const gruvboxThemedLabelTheme = {
  labelStyle: {},
};
themedLabelThemeImplementations.set(THEME.GRUVBOX, gruvboxThemedLabelTheme);

export default function ThemedLabel(props: ThemedLabelProps) {
  const theme = useContext(ThemeContext);
  let {labelStyle} = themedLabelThemeImplementations.get(theme);
  labelStyle = {
    fontSize: 16,
    ...labelStyle,
    ...props.style,
  };
  return (
    <label style={labelStyle} className={props.className}>
      {props.children}
    </label>
  );
}
