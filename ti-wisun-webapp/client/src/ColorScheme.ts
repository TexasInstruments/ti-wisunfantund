import gruvboxColorTheme from './colors/gruvbox';
import tiColorTheme from './colors/tiColors';
import {createContext} from 'react';

export type Color = string;
enum THEME {
  TI = 'ti',
  GRUVBOX = 'gruvbox',
}
const ThemeContext = createContext(THEME.GRUVBOX);

const ColorScheme = {
  colorMaps: {
    gruvbox: gruvboxColorTheme,
    ti: tiColorTheme,
  },

  getColor: function (name: string, theme: THEME = THEME.GRUVBOX) {
    //TODO Add a type for the Color Map
    return (this.colorMaps[theme] as any)[name];
  },
  getColorWithOpacity: function (color: string, opacity: number, theme: THEME = THEME.GRUVBOX) {
    //opacity [0,1]
    let hexcolor = this.getColor(color, theme);
    const r = parseInt(hexcolor.substring(1, 3), 16);
    const g = parseInt(hexcolor.substring(3, 5), 16);
    const b = parseInt(hexcolor.substring(5), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  },
};

export {ColorScheme, THEME, ThemeContext};
