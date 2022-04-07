import React, {useCallback, useContext} from 'react';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import '../assets/Slider.css';
import ReactRangeSlider from './ReactRangeSlider';
import {ThemedInput} from './ThemedInput';
import {ComponentThemeImplementations} from '../utils';

interface SliderProps {
  min: number;
  max: number;
  value: number;
  step: number;
  changeHandler: (val: number) => void;
}

interface SliderTheme {
  handleStyle: React.CSSProperties;
  fillStyle: React.CSSProperties;
  railStyle: React.CSSProperties;
}
const sliderThemeImplementations = new ComponentThemeImplementations<SliderTheme>();

const sliderHeight = 12;
const tiSliderTheme = {
  handleStyle: {
    width: sliderHeight * 2,
    height: (sliderHeight * 3) / 2,
    backgroundColor: ColorScheme.getColor('blue', THEME.TI),
    boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
  },
  fillStyle: {
    height: sliderHeight,
    backgroundColor: ColorScheme.getColor('blue', THEME.TI),
  },
  railStyle: {
    height: sliderHeight,
    backgroundColor: ColorScheme.getColor('bg0', THEME.TI),
  },
};
sliderThemeImplementations.set(THEME.TI, tiSliderTheme);
const gruvboxHandleRadius = (sliderHeight * 5) / 6;
const gruvboxSliderTheme = {
  handleStyle: {
    borderRadius: gruvboxHandleRadius,
    width: gruvboxHandleRadius * 2,
    height: gruvboxHandleRadius * 2,
    backgroundColor: ColorScheme.getColor('blue', THEME.GRUVBOX),
    border: `1px solid ${ColorScheme.getColor('bg1', THEME.GRUVBOX)}`,
    boxShadow: 'none',
  },
  fillStyle: {
    height: sliderHeight,
    backgroundColor: ColorScheme.getColor('blue', THEME.GRUVBOX),
    borderRadius: 9,
  },
  railStyle: {
    height: sliderHeight,
    backgroundColor: ColorScheme.getColor('bg1', THEME.GRUVBOX),
    borderRadius: 9,
  },
};
sliderThemeImplementations.set(THEME.GRUVBOX, gruvboxSliderTheme);

export default function Slider(props: SliderProps) {
  const sliderContainerRef = React.useRef<HTMLDivElement>(null);
  const {min, max, changeHandler} = props;
  const textChangeHandler = useCallback(
    newText => {
      const isValidNumber = /^-{0,1}\d+$/.test(newText);
      if (!isValidNumber) {
        return;
      }
      let val = parseInt(newText, 10);
      val = Math.min(max, Math.max(min, val));
      changeHandler(val);
    },
    [min, max, changeHandler]
  );
  const theme = useContext(ThemeContext);
  let {handleStyle, fillStyle, railStyle} = sliderThemeImplementations.get(theme);
  handleStyle = {
    cursor: 'pointer',
    position: 'absolute',
    top: '50%',
    transform: 'translate3d(-50%, -50%, 0)',
    ...handleStyle,
  };
  fillStyle = {
    display: 'block',
    position: 'absolute',
    ...fillStyle,
  };
  railStyle = {
    position: 'relative',
    width: '60%',
    ...railStyle,
  };
  const step = props.step || 1;

  return (
    <div ref={sliderContainerRef} className="slider_container">
      <ReactRangeSlider
        handleStyle={handleStyle}
        fillStyle={fillStyle}
        railStyle={railStyle}
        min={min}
        max={max}
        step={step}
        value={props.value}
        onChange={changeHandler}
      />
      <ThemedInput
        style={{position: 'absolute'}}
        className="slider_input"
        value={props.value.toString(10)}
        onChange={textChangeHandler}
      />
    </div>
  );
}
