import React, {useState, useContext, ReactNode, useCallback} from 'react';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import '../assets/ThemedButton.css';
import {ComponentThemeImplementations} from '../utils';

export enum THEMED_BUTTON_TYPE {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
}

interface ButtonColors {
  default: Color;
  click: Color;
  hover: Color;
}
export interface ThemedButtonTheme {
  /**Color of seconday Style Button*/
  [THEMED_BUTTON_TYPE.PRIMARY]: ButtonColors;
  /**Color of secondary Style Button*/
  [THEMED_BUTTON_TYPE.SECONDARY]: ButtonColors;
  /**default style style of button. will get overwritten when clicked/hovered */
  defaultStyle: React.CSSProperties;
  hoverStyle: React.CSSProperties;
  clickStyle: React.CSSProperties;
}
const themedButtonThemeImplementations = new ComponentThemeImplementations<ThemedButtonTheme>();
const tiThemedButtonTheme = {
  [THEMED_BUTTON_TYPE.PRIMARY]: {
    default: ColorScheme.getColor('blue', THEME.TI),
    click: ColorScheme.getColorWithOpacity('blue', 0.25, THEME.TI),
    hover: ColorScheme.getColorWithOpacity('blue', 0.75, THEME.TI),
  },
  [THEMED_BUTTON_TYPE.SECONDARY]: {
    default: ColorScheme.getColor('red', THEME.TI),
    click: ColorScheme.getColorWithOpacity('red', 0.25, THEME.TI),
    hover: ColorScheme.getColorWithOpacity('red', 0.75, THEME.TI),
  },
  defaultStyle: {
    borderRadius: 0,
  },
  hoverStyle: {},
  clickStyle: {},
};
themedButtonThemeImplementations.set(THEME.TI, tiThemedButtonTheme);
const gruvboxThemedButtonTheme = {
  [THEMED_BUTTON_TYPE.PRIMARY]: {
    default: ColorScheme.getColor('blue', THEME.GRUVBOX),
    click: ColorScheme.getColorWithOpacity('blue', 0.25, THEME.GRUVBOX),
    hover: ColorScheme.getColorWithOpacity('blue', 0.75, THEME.GRUVBOX),
  },
  [THEMED_BUTTON_TYPE.SECONDARY]: {
    default: ColorScheme.getColor('red', THEME.GRUVBOX),
    click: ColorScheme.getColorWithOpacity('red', 0.25, THEME.GRUVBOX),
    hover: ColorScheme.getColorWithOpacity('red', 0.75, THEME.GRUVBOX),
  },
  defaultStyle: {
    borderRadius: 0,
  },
  hoverStyle: {},
  clickStyle: {},
};
themedButtonThemeImplementations.set(THEME.GRUVBOX, gruvboxThemedButtonTheme);

interface ThemedButtonProps {
  themedButtonType: THEMED_BUTTON_TYPE;
  children?: ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function ThemedButton(props: ThemedButtonProps) {
  const [isHovering, setHoverState] = useState(false);
  const [isClicked, setClickState] = useState(false);
  const theme = useContext(ThemeContext);
  const {
    [props.themedButtonType]: buttonColors,
    hoverStyle,
    clickStyle,
    defaultStyle,
  } = themedButtonThemeImplementations.get(theme);
  let buttonStyle: React.CSSProperties = {
    backgroundColor: buttonColors.default,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    ...defaultStyle,
    ...(props.style ? props.style : {}),
  };
  if (isHovering) {
    buttonStyle = {
      ...buttonStyle,
      ...hoverStyle,
      boxShadow: `0px 0px 11px 0px ${buttonColors.hover}`,
    };
  }
  if (isClicked) {
    buttonStyle = {
      ...buttonStyle,
      ...clickStyle,
      backgroundColor: buttonColors.click,
    };
  }

  const {onClick} = props;
  const onClickHandler = useCallback(() => {
    setClickState(true);
    setTimeout(() => setClickState(false), 50);
    onClick && onClick();
  }, [onClick]);

  return (
    <div
      // type="button"
      // whileHover={{ scale: 1.05 }}
      // whileTap={{ scale: 0.95 }}
      style={buttonStyle}
      onMouseEnter={() => setHoverState(true)}
      onMouseLeave={() => setHoverState(false)}
      onClick={onClickHandler}
      className="themed_button"
    >
      {props.children}
    </div>
  );
}
