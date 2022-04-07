import React, {ReactNode, useContext} from 'react';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import '../assets/Tile.css';
import {ComponentThemeImplementations} from '../utils';

interface TileHeaderTheme {
  titleStyle?: React.CSSProperties;
}
const tileHeaderThemeImplementations = new ComponentThemeImplementations<TileHeaderTheme>();
const tiTileHeaderTheme = {
  titleStyle: {
    color: ColorScheme.getColor('gray', THEME.TI),
    fontWeight: 600,
  },
};
tileHeaderThemeImplementations.set(THEME.TI, tiTileHeaderTheme);
const gruvboxTileHeaderTheme = {};
tileHeaderThemeImplementations.set(THEME.GRUVBOX, gruvboxTileHeaderTheme);

interface TileHeaderProps {
  title?: string;
}

export function TileHeader(props: TileHeaderProps) {
  const theme = useContext(ThemeContext);
  let {titleStyle} = tileHeaderThemeImplementations.get(theme);
  return (
    <h2 style={titleStyle} className="tile_header">
      {props.title}
    </h2>
  );
}
interface TileProps {
  style?: React.CSSProperties;
  children?: ReactNode;
  title?: string;
  omitHeader?: boolean;
}
interface TileTheme {
  surfaceStyle: React.CSSProperties;
}

const tileThemeImplementations = new ComponentThemeImplementations<TileTheme>();
const tiTileTheme = {
  surfaceStyle: {
    backgroundColor: ColorScheme.getColor('bg2', THEME.TI),
    borderTop: `3px solid ${ColorScheme.getColor('red', THEME.TI)}`,
    boxShadow: '0px 0px 14px rgba(0, 0, 0, 0.3)',
    borderRadius: 0,
  },
};
tileThemeImplementations.set(THEME.TI, tiTileTheme);
const gruvboxTileTheme = {
  surfaceStyle: {
    borderTop: `3px solid rgba(0,0,0,0)`,
    backgroundColor: ColorScheme.getColor('bg2', THEME.GRUVBOX),
    borderRadius: 10,
  },
};
tileThemeImplementations.set(THEME.GRUVBOX, gruvboxTileTheme);

export default function Tile(props: TileProps) {
  const theme = useContext(ThemeContext);
  let {surfaceStyle} = tileThemeImplementations.get(theme);
  surfaceStyle = {...surfaceStyle, ...props.style};

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      {!props.omitHeader && <TileHeader title={props.title} />}
      <div style={surfaceStyle} className="tile">
        {props.children}
      </div>
    </div>
  );
}
