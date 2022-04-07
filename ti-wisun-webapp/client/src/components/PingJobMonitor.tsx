import {motion} from 'framer-motion';
import {useContext, useState} from 'react';
import reactDom from 'react-dom';
import {APIService} from '../APIService';
import {getIPAddressInfoByIP} from '../App';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {Pingburst, IPAddressInfo, FlexTableFormat, NumberOfPacketsQuantity} from '../types';
import {ComponentThemeImplementations, getNickname} from '../utils';
import {BackIcon} from './BackIcon';
import FlexTable, {FlexTableProps} from './FlexTable';
import ThemedButton, {THEMED_BUTTON_TYPE} from './ThemedButton';

interface CloseIconTheme {
  light: {
    color: Color;
  };
  dark: {
    color: Color;
  };
}
const closeIconThemeImplementions = new ComponentThemeImplementations<CloseIconTheme>();

const tiCloseIconTheme = {
  light: {
    color: ColorScheme.getColor('white', THEME.TI),
  },
  dark: {
    color: ColorScheme.getColor('gray', THEME.TI),
  },
};
closeIconThemeImplementions.set(THEME.TI, tiCloseIconTheme);
const gruvboxCloseIconTheme = {
  light: {
    color: ColorScheme.getColor('white', THEME.GRUVBOX),
  },
  dark: {
    color: ColorScheme.getColor('white', THEME.GRUVBOX),
  },
};
closeIconThemeImplementions.set(THEME.GRUVBOX, gruvboxCloseIconTheme);

interface CloseIconProps {
  isLight: boolean;
  isHovering: boolean;
}

function pingJobToElementsMapper(index: number, pingJobs: PingJobTable) {
  const job = pingJobs.records[index];
  const elements = [
    getNickname(job.destIP),
    job.packetSize.toString(10),
    job.timeout.toString(10),
    job.interval.toString(10),
    job.numPacketsRemaining.toString(10),
    <CloseButton isLight={false} closeHandler={() => APIService.abortPingburst(job.destIP)} />,
  ];
  return elements;
}

interface CloseButtonProps {
  closeHandler: () => void;
  isLight: boolean;
}

function CloseIcon(props: CloseIconProps) {
  const theme = useContext(ThemeContext);
  const {
    [props.isLight ? 'light' : 'dark']: {color},
  } = closeIconThemeImplementions.get(theme);

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 6L6 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 6L18 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseButton(props: CloseButtonProps) {
  const [isHovering, setHovering] = useState(false);
  return (
    <motion.div
      whileTap={{scale: 1.2}}
      style={{
        cursor: 'pointer',
      }}
      onClick={() => {
        props.closeHandler();
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <CloseIcon isLight={props.isLight} isHovering={isHovering} />
    </motion.div>
  );
}

interface PingJobMonitorProps {
  pingbursts: Pingburst[];
  ipAddressInfoArray: IPAddressInfo[];
  closePingJobs: () => void;
}
interface PingJobTable {
  records: Pingburst[];
}

export function PingJobMonitor(props: PingJobMonitorProps) {
  const pingJobRows: Pingburst[] = props.pingbursts;

  function abortAllPingJobs() {
    APIService.abortAllPingbursts();
  }

  const tableFormat: FlexTableFormat = [
    {
      headerValue: 'Dest IP',
      style: {
        flexGrow: '1',
      },
    },
    {
      headerValue: 'Packet Size [B]',
      style: {
        flexGrow: 1,
      },
    },
    {
      headerValue: 'Timeout [s]',
      style: {
        flexGrow: 1,
      },
    },
    {
      headerValue: 'Interval [s]',
      style: {
        flexGrow: 1,
      },
    },
    {
      headerValue: 'Remaining',
      style: {
        flexGrow: '1',
      },
    },
    {
      headerValue: (
        <div
          onClick={props.closePingJobs}
          style={{display: 'flex', flexDirection: 'row', cursor: 'pointer'}}
        >
          <span>Back</span>
          <BackIcon style={{width: 18}} fill="white" />
        </div>
      ),
      style: {
        flexBasis: '100px',
        flexGrow: '0',
      },
    },
  ];
  const tableProps: FlexTableProps<PingJobTable, Pingburst> = {
    rowKeyGenerator: (index: number, table: PingJobTable) => table.records[index].destIP,
    tableData: {
      records: pingJobRows,
    },
    dataToElementsMapper: pingJobToElementsMapper,
    tableFormat,
  };

  return reactDom.createPortal(
    <div
      onClick={event => {
        event.preventDefault();
        if (event.target === event.currentTarget) {
          props.closePingJobs();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '100vh',
        zIndex: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 'max(50vw,400px)',
          zIndex: 1,
          position: 'relative',
        }}
      >
        <FlexTable<PingJobTable, Pingburst> {...tableProps} />
        <ThemedButton
          themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
          style={{position: 'absolute', bottom: 10, right: 20}}
          onClick={() => abortAllPingJobs()}
        >
          Clear All
        </ThemedButton>
      </div>
    </div>,
    document.body
  );
}
