import {useContext} from 'react';
import '../assets/NCPStateIndicator.css';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {ComponentThemeImplementations} from '../utils';
import {motion, AnimatePresence} from 'framer-motion';

export enum NCP_STATE_INDICATOR_STATUS {
  ONLINE,
  OFFLINE,
  LOADING,
  INVALID,
}

export function deriveNCPIndicatorStatus(ncpStateString: string | null) {
  if (ncpStateString === null) {
    return NCP_STATE_INDICATOR_STATUS.LOADING;
  }
  const ncpStateUpper = ncpStateString.toUpperCase();
  switch (ncpStateUpper) {
    case 'ASSOCIATED':
      return NCP_STATE_INDICATOR_STATUS.ONLINE;
    case 'OFFLINE':
      return NCP_STATE_INDICATOR_STATUS.OFFLINE;
    default:
      return NCP_STATE_INDICATOR_STATUS.INVALID;
  }
}

interface NCPStateIndicatorTheme {
  onlineFill: Color;
  offlineFill: Color;
  loadingFill: Color;
  invalidFill: Color;
}
const ncpStateIndicatorThemeImplementations =
  new ComponentThemeImplementations<NCPStateIndicatorTheme>();
const tiStateIndicatorTheme = {
  onlineFill: ColorScheme.getColor('green', THEME.TI),
  offlineFill: ColorScheme.getColor('red', THEME.TI),
  loadingFill: ColorScheme.getColor('gray', THEME.TI),
  invalidFill: ColorScheme.getColor('orange', THEME.TI),
};
ncpStateIndicatorThemeImplementations.set(THEME.TI, tiStateIndicatorTheme);
const gruvboxStateIndicatorTheme = {
  onlineFill: ColorScheme.getColor('green', THEME.GRUVBOX),
  offlineFill: ColorScheme.getColor('red', THEME.GRUVBOX),
  loadingFill: ColorScheme.getColor('gray', THEME.GRUVBOX),
  invalidFill: ColorScheme.getColor('orange', THEME.GRUVBOX),
};
ncpStateIndicatorThemeImplementations.set(THEME.GRUVBOX, gruvboxStateIndicatorTheme);

const statusToFillMap = new Map<NCP_STATE_INDICATOR_STATUS, keyof NCPStateIndicatorTheme>();
statusToFillMap.set(NCP_STATE_INDICATOR_STATUS.ONLINE, 'onlineFill');
statusToFillMap.set(NCP_STATE_INDICATOR_STATUS.OFFLINE, 'offlineFill');
statusToFillMap.set(NCP_STATE_INDICATOR_STATUS.LOADING, 'loadingFill');
statusToFillMap.set(NCP_STATE_INDICATOR_STATUS.INVALID, 'invalidFill');

interface NCPStateIndicatorProps {
  status: NCP_STATE_INDICATOR_STATUS;
  message?: string;
}

export function NCPStateIndicator(props: NCPStateIndicatorProps) {
  const theme = useContext(ThemeContext);
  const {status} = props;

  const statusFills = ncpStateIndicatorThemeImplementations.get(theme);
  const fillType = statusToFillMap.get(status);
  if (fillType === undefined) {
    return null;
  }
  const fill = statusFills[fillType];
  const duration = 1;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="70%" fill="none" viewBox="0 0 300 300">
      <motion.path
        initial={{stroke: fill}}
        animate={{
          stroke: fill,
        }}
        transition={{
          duration,
        }}
        stroke="#000"
        strokeLinecap="round"
        strokeWidth="30"
        d="M18.727 112.349C34.822 95.642 54.92 82.144 77.69 72.891c22.771-9.254 47.597-14.009 72.738-13.889 25.142.12 49.906 5.111 72.559 14.58 22.652 9.467 42.58 23.152 58.467 40.005M62.03 153.862c10.715-11.193 24.126-20.269 39.364-26.5 15.238-6.232 31.871-9.441 48.728-9.361 16.856.081 33.447 3.45 48.605 9.826 15.157 6.375 28.453 15.575 39.029 26.864M97.645 193.919c6.265-6.465 14.162-11.762 23.209-15.417 9.049-3.656 18.956-5.549 29.017-5.501 10.061.048 19.941 2.035 28.94 5.773 8.997 3.738 16.822 9.106 23.003 15.624"
      />
      <motion.circle
        cx="149.5"
        cy="239.5"
        r="19.5"
        initial={{fill}}
        animate={{fill}}
        transition={{
          duration,
        }}
      />
      <AnimatePresence>
        {status === NCP_STATE_INDICATOR_STATUS.OFFLINE && (
          <motion.rect
            width="25"
            height="287.117"
            y="-3.536"
            initial={{fill, opacity: 0}}
            animate={{fill, opacity: 1}}
            exit={{opacity: 0}}
            stroke="var(--bg2)"
            strokeWidth="5"
            rx="12.5"
            transform="scale(1 -1) rotate(45 412.57 153.215)"
          />
        )}
        {status === NCP_STATE_INDICATOR_STATUS.INVALID && (
          <g>
            <motion.path
              initial={{fill, opacity: 0}}
              stroke="var(--bg2)"
              strokeWidth="5"
              animate={{fill, opacity: 1}}
              exit={{opacity: 0}}
              d="M191.34 133.16c0-3.267.373-6.113 1.12-8.54.747-2.52 1.913-4.9 3.5-7.14 1.68-2.24 4.013-4.527 7-6.86 3.08-2.427 5.413-4.527 7-6.3 1.68-1.773 2.847-3.5 3.5-5.18.653-1.773.98-3.78.98-6.02 0-3.547-1.12-6.253-3.36-8.12-2.147-1.867-5.133-2.8-8.96-2.8-3.827 0-7.513.607-11.06 1.82-3.547 1.12-7.14 2.66-10.78 4.62l-6.58-13.16c4.2-2.24 8.727-4.107 13.58-5.6 4.853-1.493 10.267-2.24 16.24-2.24 8.96 0 15.913 2.287 20.86 6.86 5.04 4.573 7.56 10.5 7.56 17.78 0 4.013-.607 7.42-1.82 10.22-1.213 2.8-2.94 5.413-5.18 7.84-2.24 2.427-5.04 5.04-8.4 7.84-2.707 2.24-4.807 4.153-6.3 5.74-1.4 1.587-2.38 3.173-2.94 4.76-.56 1.493-.84 3.36-.84 5.6v3.5h-15.12v-4.62zm-2.66 26.88c0-4.013 1.027-6.813 3.08-8.4 2.147-1.587 4.76-2.38 7.84-2.38 2.893 0 5.413.793 7.56 2.38 2.147 1.587 3.22 4.387 3.22 8.4 0 3.827-1.073 6.58-3.22 8.26-2.147 1.68-4.667 2.52-7.56 2.52-3.08 0-5.693-.84-7.84-2.52-2.053-1.68-3.08-4.433-3.08-8.26z"
            />
          </g>
        )}
      </AnimatePresence>
    </svg>
  );
}
