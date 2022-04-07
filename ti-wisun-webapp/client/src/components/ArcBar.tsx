import React, {CSSProperties, useContext} from 'react';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import '../assets/ArcBar.css';
import {ComponentThemeImplementations} from '../utils';
import {ColorThresholds} from '../types';

type LineCapType = 'square' | 'round';

interface ArcBarTheme {
  backgroundColor: Color;
  subLabelColor: Color;
  labelColor: Color;
  lineCapType: LineCapType;
  isShadow: boolean;
}

const ArcBarThemeImplementions = new ComponentThemeImplementations<ArcBarTheme>();

const tiArcBarTheme: ArcBarTheme = {
  isShadow: true,
  backgroundColor: ColorScheme.getColor('bg0', THEME.TI),
  subLabelColor: ColorScheme.getColor('grayLight', THEME.TI),
  labelColor: ColorScheme.getColor('gray', THEME.TI),
  lineCapType: 'square',
};
ArcBarThemeImplementions.set(THEME.TI, tiArcBarTheme);

const gruvboxArcBarTheme: ArcBarTheme = {
  isShadow: false,
  backgroundColor: ColorScheme.getColor('bg1', THEME.GRUVBOX),
  subLabelColor: ColorScheme.getColor('gray', THEME.GRUVBOX),
  labelColor: ColorScheme.getColor('white', THEME.GRUVBOX),
  lineCapType: 'round',
};
ArcBarThemeImplementions.set(THEME.GRUVBOX, gruvboxArcBarTheme);

interface ArcBarProps {
  /** value for color taken from percentFull */
  colorThresholds: ColorThresholds;
  style?: CSSProperties;
  /** value in [0,1] */
  percentFull: number;
  maxLabel: string;
  minLabel: string;
  valueText: string;
  valueDescription: string;
}

export default function ArcBar(props: ArcBarProps) {
  const theme = useContext(ThemeContext);
  const arcBarTheme = ArcBarThemeImplementions.get(theme);
  const {labelColor, subLabelColor, lineCapType, backgroundColor, isShadow} = arcBarTheme;

  let progressColor = props.colorThresholds.getColor(props.percentFull);
  let totalArcLength = 210.487;

  const strokeDash = {
    strokeDasharray: totalArcLength,
    strokeDashoffset: -1 * totalArcLength * (1 - props.percentFull),
  };
  return (
    <div className="arc_bar_container" style={props.style}>
      <svg className="arc_bar" viewBox="0 0 144 77" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter={isShadow ? `url(#arc_bar_shadow)` : undefined}>
          <path
            style={{stroke: backgroundColor}}
            d="M139 72
        C139 54.2305 131.941 37.1888 119.376 24.6238
        C106.811 12.0589 89.7695 5 72 5
        C54.2305 5 37.1888 12.0589 24.6239 24.6238
        C12.0589 37.1888 5 54.2305 5 72"
            strokeWidth="10"
            strokeLinecap={lineCapType}
          />
          <path
            style={{stroke: progressColor, ...strokeDash}}
            d="M139 72
        C139 54.2305 131.941 37.1888 119.376 24.6238
        C106.811 12.0589 89.7695 5 72 5
        C54.2305 5 37.1888 12.0589 24.6239 24.6238
        C12.0589 37.1888 5 54.2305 5 72"
            strokeWidth="10"
            strokeLinecap={lineCapType}
          />
        </g>
        <defs>
          <filter
            id="arc_bar_shadow"
            x="0.889893"
            y="0"
            width="166.92"
            height="94.5"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="2" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_176:280" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect1_dropShadow_176:280"
              result="shape"
            />
          </filter>
        </defs>
      </svg>
      <h3 style={{color: labelColor}} className="arc_bar_label_top">
        {props.valueText}
      </h3>
      <h4 style={{color: labelColor}} className="arc_bar_label_bottom">
        {props.valueDescription}
      </h4>
      <p style={{color: subLabelColor}} className="arc_bar_tick arc_bar_tick_left">
        {props.minLabel}
      </p>
      <p style={{color: subLabelColor}} className="arc_bar_tick arc_bar_tick_right">
        {props.maxLabel}
      </p>
    </div>
  );
}
