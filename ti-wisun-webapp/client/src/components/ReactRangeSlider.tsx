/**
 * Code from https://github.com/whoisandy/react-rangeslider/blob/master/src/Rangeslider.js
 *
 */

import React, {Component, KeyboardEventHandler} from 'react';
import ResizeObserver from 'resize-observer-polyfill';

/**
 * Clamp position between a range
 * @param  {number} - Value to be clamped
 * @param  {number} - Minimum value in range
 * @param  {number} - Maximum value in range
 * @return {number} - Clamped value
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
type Dimension = 'width' | 'height';
type Direction = 'left' | 'right' | 'top' | 'bottom';
type Coordinate = 'x' | 'y';

interface OrientationMode {
  dimension: Dimension;
  direction: Direction;
  reverseDirection: Direction;
  coordinate: Coordinate;
}
interface Constants {
  orientation: {
    horizontal: OrientationMode;
    vertical: OrientationMode;
  };
}

const constants: Constants = {
  orientation: {
    horizontal: {
      dimension: 'width',
      direction: 'left',
      reverseDirection: 'right',
      coordinate: 'x',
    },
    vertical: {
      dimension: 'height',
      direction: 'top',
      reverseDirection: 'bottom',
      coordinate: 'y',
    },
  },
};

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  orientation: 'horizontal' | 'vertical';
  reverse: boolean;
  labels: object;
  handleLabel: string;
  handleStyle: React.CSSProperties;
  fillStyle: React.CSSProperties;
  format?: (val: number) => number;
  onChangeStart?: () => void;
  onChange?: (val: number) => void;
  onChangeComplete?: () => void;
  railStyle: React.CSSProperties;
}

interface SliderState {
  active: boolean;
  limit: number;
  grab: number;
}

interface CoordinatesData {
  fill: number;
  handle: number;
}

class Slider extends Component<SliderProps, SliderState> {
  static defaultProps = {
    min: 0,
    max: 100,
    step: 1,
    value: 0,
    orientation: 'horizontal',
    reverse: false,
    labels: {},
    handleLabel: '',
  };

  slider = React.createRef<HTMLDivElement>();
  handle = React.createRef<HTMLDivElement>();

  state = {
    active: false,
    limit: 0,
    grab: 0,
  };

  componentDidMount() {
    this.handleUpdate();
    const resizeObserver = new ResizeObserver(this.handleUpdate);
    if (this.slider.current === null) {
      return;
    }
    resizeObserver.observe(this.slider.current);
  }

  /**
   * Format label/tooltip value
   * @param  {Number} - value
   * @return {Formatted Number}
   */
  handleFormat = (value: number): number => {
    const {format} = this.props;
    return format ? format(value) : value;
  };

  /**
   * Update slider state on change
   * @return {void}
   */
  handleUpdate = (): void => {
    if (this.slider.current === null || this.handle.current === null) {
      // for shallow rendering
      return;
    }
    const {orientation} = this.props;
    const offsetString =
      constants.orientation[orientation].dimension === 'width' ? 'offsetWidth' : 'offsetHeight';
    if (this.slider === null || this.slider.current === null) {
      return;
    }
    const sliderPos = this.slider.current[offsetString];
    const handlePos = this.handle.current[offsetString];
    this.setState({
      limit: sliderPos - handlePos,
      grab: handlePos / 2,
    });
  };

  /**
   * Attach event listeners to mousemove/mouseup events
   */
  handleStart = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // const { onChangeStart } = this.props;
    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('mouseup', this.handleEnd);
    this.setState(
      {
        active: true,
      },
      () => {
        // onChangeStart && onChangeStart(e);
      }
    );
  };

  /**
   * Handle drag/mousemove event
   */
  handleDrag = (e: MouseEvent): void => {
    e.stopPropagation();
    const {onChange} = this.props;
    if (!(e.target instanceof HTMLElement)) {
      return;
    }
    const {
      target: {className, classList, dataset},
    } = e;
    if (!onChange || className === 'rangeslider__labels') return;

    let value = this.position(e);

    if (classList && classList.contains('rangeslider__label-item') && dataset.value) {
      value = parseFloat(dataset.value);
    }

    onChange && onChange(value);
  };

  /**
   * Detach event listeners to mousemove/mouseup events
   * @return {void}
   */
  handleEnd = (e: MouseEvent) => {
    const {onChangeComplete} = this.props;
    this.setState(
      {
        active: false,
      },
      () => {
        onChangeComplete && onChangeComplete();
      }
    );
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.handleEnd);
  };

  /**
   * Support for key events on the slider handle
   * @param  {Object} e - Event object
   * @return {void}
   */
  handleKeyDown: KeyboardEventHandler<HTMLDivElement> = e => {
    e.preventDefault();
    const {key} = e;
    const {value, min, max, step, onChange} = this.props;
    let sliderValue;

    switch (key) {
      case 'ArrowRight':
      case 'ArrowUp':
        sliderValue = value + step > max ? max : value + step;
        onChange && onChange(sliderValue);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        sliderValue = value - step < min ? min : value - step;
        onChange && onChange(sliderValue);
        break;
      default:
        break;
    }
  };

  /**
   * Calculate position of slider based on its value
   * @param  {number} value - Current value of slider
   * @return {position} pos - Calculated position of slider based on value
   */
  getPositionFromValue = (value: number): number => {
    const {limit} = this.state;
    const {min, max} = this.props;
    const diffMaxMin = max - min;
    const diffValMin = value - min;
    const percentage = diffValMin / diffMaxMin;
    const pos = Math.round(percentage * limit);

    return pos;
  };

  /**
   * Translate position of slider to slider value
   * @param  {number} pos - Current position/coordinates of slider
   * @return {number} value - Slider value
   */
  getValueFromPosition = (pos: number): number => {
    const {limit} = this.state;
    const {orientation, min, max, step} = this.props;
    const percentage = clamp(pos, 0, limit) / (limit || 1);
    const baseVal = step * Math.round((percentage * (max - min)) / step);
    const value = orientation === 'horizontal' ? baseVal + min : max - baseVal;

    return clamp(value, min, max);
  };

  /**
   * Calculate position of slider based on value
   * @param  {Object} e - Event object
   * @return {number} value - Slider value
   */
  // position = (e: React.MouseEvent<HTMLDivElement>): number => {
  position = (e: MouseEvent): number => {
    const {grab} = this.state;
    const {orientation, reverse} = this.props;

    const node = this.slider.current;
    if (node === null) {
      console.error('null ref');
      return 0;
    }
    const coordinateStyle = constants.orientation[orientation].coordinate;
    const directionStyle = reverse
      ? constants.orientation[orientation].reverseDirection
      : constants.orientation[orientation].direction;
    const coordinate = coordinateStyle === 'x' ? e.clientX : e.clientY;
    const direction = node.getBoundingClientRect()[directionStyle];
    const pos = reverse ? direction - coordinate - grab : coordinate - direction - grab;
    const value = this.getValueFromPosition(pos);

    return value;
  };

  /**
   * Grab coordinates of slider
   * @param  {number} pos - Position object
   * @return {Object} - Slider fill/handle coordinates
   */
  coordinates = (pos: number): CoordinatesData => {
    const {limit, grab} = this.state;
    const {orientation} = this.props;
    const value = this.getValueFromPosition(pos);
    const position = this.getPositionFromValue(value);
    const handlePos = orientation === 'horizontal' ? position + grab : position;
    const fillPos = orientation === 'horizontal' ? handlePos : limit - handlePos;

    return {
      fill: fillPos,
      handle: handlePos,
    };
  };

  render() {
    const {value, orientation, reverse, min, max, handleLabel} = this.props;
    // const { active } = this.state;
    const dimension = constants.orientation[orientation].dimension;
    const direction = reverse
      ? constants.orientation[orientation].reverseDirection
      : constants.orientation[orientation].direction;
    const position = this.getPositionFromValue(value);
    const coords = this.coordinates(position);
    const fillStyle = Object.assign({}, this.props.fillStyle, {
      [dimension]: `${coords.fill}px`,
    });
    const handleStyle = Object.assign({}, this.props.handleStyle, {
      [direction]: `${coords.handle}px`,
    });

    return (
      <div
        ref={this.slider}
        // onMouseDown={this.handleDrag}
        // onMouseUp={this.handleEnd}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-orientation={orientation}
        style={this.props.railStyle}
      >
        <div style={fillStyle} />
        <div
          ref={this.handle}
          onMouseDown={this.handleStart}
          // onMouseMove={this.handleDrag}
          // onMouseUp={this.handleEnd}
          onKeyDown={this.handleKeyDown}
          style={handleStyle}
          tabIndex={0}
        >
          <div className="rangeslider__handle-label">{handleLabel}</div>
        </div>
      </div>
    );
  }
}

export default Slider;
