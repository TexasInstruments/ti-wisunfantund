/** @jsxImportSource @emotion/react */
import React, {ReactEventHandler, useCallback, useContext} from 'react';
import '../assets/ThemedInput.css';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {ComponentThemeImplementations} from '../utils';
import {CSSInterpolation} from '@emotion/serialize';
import {LoadingBars} from './LoadingBars';

export interface ThemedInputTheme {
  inputStyle: CSSInterpolation;
}
const themedInputThemeImplementations = new ComponentThemeImplementations<ThemedInputTheme>();
const tiThemedInputTheme = {
  inputStyle: {
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25) ',
    backgroundColor: ColorScheme.getColor('bg0', THEME.TI),
    borderTop: `1px solid transparent`,
    outline: 'none',
    '&:focus': {
      borderTop: `1px solid ${ColorScheme.getColor('red', THEME.TI)}`,
    },
    borderRadius: 0,
    color: ColorScheme.getColor('gray', THEME.TI),
    fontWeight: 600,
    '&:disabled': {
      color: ColorScheme.getColor('grayLight', THEME.TI),
    },
  },
};
themedInputThemeImplementations.set(THEME.TI, tiThemedInputTheme);
const gruvboxThemedInputTheme = {
  inputStyle: {
    backgroundColor: ColorScheme.getColor('bg1', THEME.GRUVBOX),
    color: ColorScheme.getColor('white', THEME.GRUVBOX),
    borderTop: `1px solid transparent`,
    outline: 'none',
    '&:focus': {
      borderTop: `1px solid ${ColorScheme.getColor('fg0', THEME.GRUVBOX)}`,
    },
    '&:disabled': {
      // borderTop: `1px solid ${ColorScheme.getColor("red", THEME.GRUVBOX)}`,
      color: ColorScheme.getColor('gray', THEME.GRUVBOX),
    },
  },
};
themedInputThemeImplementations.set(THEME.GRUVBOX, gruvboxThemedInputTheme);

const loadingBarsStyle = {
  position: 'absolute' as 'absolute',
  height: '80%',
  marginLeft: 'auto',
  marginRight: 'auto',
  marginTop: 'auto',
  marginBottom: 'auto',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  // zIndex: 10,
};

export interface ThemedInputProps {
  isDisabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  //if value is null the input will go into a "loading" state
  value: string | null;
  onChange: (newValue: string) => void;
  onBlur?: ReactEventHandler;
}

export function ThemedInput({
  isDisabled = false,
  className = '',
  style = {},
  inputStyle = {},
  value = null,
  onChange = () => {},
  onBlur,
}: ThemedInputProps) {
  const theme = useContext(ThemeContext);
  let {inputStyle: themeInputStyle} = themedInputThemeImplementations.get(theme);
  const onChangeHandler = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange]
  );
  const isLoading = value === null;
  return (
    <div style={{position: 'relative', ...style}} className={className}>
      {isLoading && <LoadingBars style={loadingBarsStyle} />}
      <input
        css={{fontVariant: 'lining-nums', height: 26, ...inputStyle, ...(themeInputStyle as any)}}
        disabled={isDisabled || isLoading}
        className={'themed_input '}
        type="text"
        spellCheck="false"
        value={value === null ? '' : value}
        onChange={onChangeHandler}
        onBlur={onBlur}
      />
    </div>
  );
}
