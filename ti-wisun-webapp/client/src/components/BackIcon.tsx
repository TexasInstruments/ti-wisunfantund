import {CSSProperties} from 'react';
import {Color} from '../ColorScheme';

interface BackIconProps {
  style?: CSSProperties;
  fill: Color;
}

export function BackIcon({style, fill}: BackIconProps) {
  return (
    <svg style={style} viewBox="0 0 57 57" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="54.4473"
        y="30.4058"
        width="40"
        height="5"
        transform="rotate(-135 54.4473 30.4058)"
        fill={fill}
      />
      <rect
        x="56.5684"
        y="28.2844"
        width="40"
        height="5"
        transform="rotate(135 56.5684 28.2844)"
        fill={fill}
      />
    </svg>
  );
}
