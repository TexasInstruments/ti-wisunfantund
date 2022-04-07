import React, {useContext, useState} from 'react';
import '../assets/Monitor.css';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import PingLog from './PingLog';
import DelayMonitor from './DelayMonitor';
import HealthMonitor from './HealthMonitor';
import {IPAddressInfo, Pingburst, PingRecord} from '../types';
import {ComponentThemeImplementations} from '../utils';

enum MONITOR_STATE {
  LOG,
  HEALTH,
  DELAY,
}

interface MonitorProps {
  pingbursts: Pingburst[];
  pingrecords: PingRecord[];
  ipAddressInfoArray: IPAddressInfo[];
}

interface MonitorHeaderTheme {
  monitorTabButtonStyle: React.CSSProperties;
}
const monitorHeaderTheme = new ComponentThemeImplementations<MonitorHeaderTheme>();
const tiMonitorHeaderTheme = {
  monitorTabButtonStyle: {
    backgroundColor: ColorScheme.getColor('gray', THEME.TI),
  },
};
monitorHeaderTheme.set(THEME.TI, tiMonitorHeaderTheme);
const gruvboxMonitorHeaderTheme = {
  monitorTabButtonStyle: {
    backgroundColor: ColorScheme.getColor('bg0', THEME.GRUVBOX),
  },
};
monitorHeaderTheme.set(THEME.GRUVBOX, gruvboxMonitorHeaderTheme);

function LogIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="4" width="14" height="17" rx="2" stroke="white" strokeWidth="2" />
      <path d="M9 9H15" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 13H15" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 17H13" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HealthIcon() {
  return (
    <svg width="29" height="23" viewBox="0 0 29 23" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 14.8519H4.76639C5.2171 14.8519 5.6121 14.5504 5.73098 14.1157L9.0794 1.87032C9.35419 0.865398 10.7906 0.897963 11.0195 1.91431L15.2437 20.6647C15.4781 21.7053 16.961 21.7049 17.1949 20.6643L19.4831 10.4842C19.6884 9.57045 20.9246 9.41505 21.3498 10.2495L22.9464 13.3833C23.1171 13.7184 23.4613 13.9294 23.8374 13.9294H29"
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  );
}
function DelayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11.999 22C7.05569 21.9348 3.06417 17.9433 2.99902 13C3.06417 8.05668 7.05569 4.06516 11.999 4C16.9423 4.06516 20.9339 8.05668 20.999 13C20.9339 17.9433 16.9423 21.9348 11.999 22ZM11.999 6C8.15418 6.05062 5.04963 9.15517 4.99902 13C5.04963 16.8448 8.15418 19.9494 11.999 20C15.8438 19.9494 18.9484 16.8448 18.999 13C18.9484 9.15517 15.8438 6.05062 11.999 6ZM16.999 14H10.999V8H12.999V12H16.999V14ZM20.291 6.708L17.282 3.708L18.691 2.291L21.701 5.291L20.291 6.707V6.708ZM3.70602 6.708L2.29102 5.291L5.28202 2.291L6.69702 3.708L3.70802 6.708H3.70602Z"
        fill="white"
      />
    </svg>
  );
}

export default function Monitor(props: MonitorProps) {
  const [monitorState, setMonitorState] = useState<MONITOR_STATE>(MONITOR_STATE.LOG);
  let currentDisplay = null;
  switch (monitorState) {
    case MONITOR_STATE.DELAY:
      currentDisplay = <DelayMonitor {...props} />;
      break;
    case MONITOR_STATE.LOG:
      currentDisplay = <PingLog {...props} />;
      break;
    case MONITOR_STATE.HEALTH:
      currentDisplay = <HealthMonitor {...props} />;
      break;
    default:
      console.error('Encountered invalid MONITOR_STATE', monitorState);
  }

  const theme = useContext(ThemeContext);
  const {monitorTabButtonStyle} = monitorHeaderTheme.get(theme);

  return (
    <React.Fragment>
      <div className="monitor_tab_button_array">
        <button
          style={monitorTabButtonStyle}
          className="monitor_tab_button"
          onClick={() => {
            setMonitorState(MONITOR_STATE.LOG);
          }}
        >
          <LogIcon />
        </button>
        <button
          style={monitorTabButtonStyle}
          className="monitor_tab_button"
          onClick={() => {
            setMonitorState(MONITOR_STATE.HEALTH);
          }}
        >
          <HealthIcon />
        </button>
        <button
          style={monitorTabButtonStyle}
          className="monitor_tab_button"
          onClick={() => {
            setMonitorState(MONITOR_STATE.DELAY);
          }}
        >
          <DelayIcon />
        </button>
      </div>
      {currentDisplay}
    </React.Fragment>
  );
}
