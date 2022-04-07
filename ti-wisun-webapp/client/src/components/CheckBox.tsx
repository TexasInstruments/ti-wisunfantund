import React, {useContext} from 'react';
import '../assets/CheckBox.css';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {ComponentThemeImplementations} from '../utils';

interface CheckBoxProps {
  isChecked: boolean;
  className?: string;
  clickHandler: (newVal: boolean) => void;
}

interface CheckBoxTheme {
  //**Style of the Background Element that is always shown*/
  outerStyle: React.CSSProperties;
  //**Style of the Element That is shown when box is checked */
  innerStyle: React.CSSProperties;
}
const checkBoxThemeImplementations = new ComponentThemeImplementations<CheckBoxTheme>();
const tiCheckBoxTheme = {
  outerStyle: {
    backgroundColor: ColorScheme.getColor('bg0', THEME.TI),
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25) ',
  },
  innerStyle: {
    backgroundColor: ColorScheme.getColor('gray', THEME.TI),
  },
};
checkBoxThemeImplementations.set(THEME.TI, tiCheckBoxTheme);
const gruvboxCheckBoxTheme = {
  outerStyle: {
    backgroundColor: ColorScheme.getColor('bg1', THEME.GRUVBOX),
  },
  innerStyle: {
    backgroundColor: ColorScheme.getColor('fg0', THEME.GRUVBOX),
  },
};
checkBoxThemeImplementations.set(THEME.GRUVBOX, gruvboxCheckBoxTheme);

export default function CheckBox(props: CheckBoxProps) {
  const theme = useContext(ThemeContext);
  const {innerStyle, outerStyle} = checkBoxThemeImplementations.get(theme);
  let className = 'checkbox_bg';
  if (props.className !== undefined) {
    className = `${props.className} ${className}`;
  }
  return (
    <div
      style={outerStyle}
      className={className}
      onClick={event => {
        props.clickHandler(!props.isChecked);
      }}
    >
      {props.isChecked && <div style={innerStyle} className="checkbox_fg"></div>}
    </div>
  );
}
