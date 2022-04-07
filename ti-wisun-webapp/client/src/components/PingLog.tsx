import React, {ReactElement, useCallback} from 'react';
import MagnitudeIndicator from './MagnitudeIndicator';
import {getIPAddressInfoByIP} from '../App';
import FlexTable, {FlexTableProps} from './FlexTable';
import {sort} from 'd3-array';
import {ComponentThemeImplementations, getNickname, timestampStringToDate} from '../utils';
import {APIService} from '../APIService';
import {ColorThresholds, FlexTableFormat, IPAddressInfo, Pingburst, PingRecord} from '../types';
import {Color, ColorScheme, THEME} from '../ColorScheme';
const durationMaxBaseline = 600;

interface PingLogTable {
  ipAddressInfoArray: IPAddressInfo[];
  records: PingRecord[];
  tableFormat: FlexTableFormat;
}

interface PingLogProps {
  ipAddressInfoArray: IPAddressInfo[];
  pingbursts: Pingburst[];
  pingrecords: PingRecord[];
}

interface PingRowTheme {
  durationColorThresholds: ColorThresholds;
}
const pingRowThemeImplementations = new ComponentThemeImplementations<PingRowTheme>();
const tiPingRowThemeImplementations = {
  durationColorThresholds: new ColorThresholds(
    [0.33, 0.66, 0.9],
    ['green', 'yellow', 'orange', 'red'].map((color: Color) =>
      ColorScheme.getColor(color, THEME.TI)
    )
  ),
};
pingRowThemeImplementations.set(THEME.TI, tiPingRowThemeImplementations);
const gruvboxPingRowThemeImplementations = {
  durationColorThresholds: new ColorThresholds(
    [0.33, 0.66, 0.9],
    ['green', 'yellow', 'orange', 'red'].map((color: Color) =>
      ColorScheme.getColor(color, THEME.GRUVBOX)
    )
  ),
};
pingRowThemeImplementations.set(THEME.GRUVBOX, gruvboxPingRowThemeImplementations);

function pingDataToElementsMapper(
  index: number,
  data: PingLogTable,
  {theme}: {theme: THEME}
): (ReactElement | string)[] {
  const pingInfo = data.records[index];
  let startMatches = pingInfo.start.match(/(\d{1,2}:\d{1,2}:\d{1,2}.*M)/);
  let start;
  if (startMatches === null) {
    start = 'N/A';
  } else {
    start = startMatches[1];
  }
  const {durationColorThresholds} = pingRowThemeImplementations.get(theme);
  const pingCols = [
    '', //toggle filler,
    getNickname(pingInfo.destIP),
    start,
    <MagnitudeIndicator
      colorThresholds={durationColorThresholds}
      value={pingInfo.duration / durationMaxBaseline}
      tooltip={`${pingInfo.duration.toFixed(2)}ms`}
    />,
  ];
  return pingCols;
}

export default function PingLog(props: PingLogProps) {
  const csvDownloadButton = (
    // <a href={}>
    // <img
    //   style={{
    //     cursor: 'pointer',
    //   }}
    //   alt="download"
    //   onClick={() => window.open(APIService.pingResultsRoute)}
    //   src={downloadIcon}
    // ></img>

    <svg
      style={{
        cursor: 'pointer',
      }}
      onClick={() => window.open(APIService.pingResultsRoute)}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.5 9.21922C2.5 9.257 2.5 9.29504 2.5 9.33334V12.3333C2.5 15.1618 2.5 16.576 3.37868 17.4547C4.25736 18.3333 5.67157 18.3333 8.5 18.3333H11.5C14.3284 18.3333 15.7426 18.3333 16.6213 17.4547C17.5 16.576 17.5 15.1618 17.5 12.3333V9.33334C17.5 9.29111 17.5 9.2492 17.5 9.2076C17.5 9.64514 17.4989 9.86941 17.4616 10.0569C17.3038 10.8502 16.6836 11.4704 15.8902 11.6282C15.697 11.6667 15.4647 11.6667 15 11.6667H14.4371C14.0701 11.6667 13.8866 11.6667 13.7283 11.7212C13.5425 11.7853 13.3797 11.9026 13.2602 12.0586C13.1584 12.1915 13.1003 12.3656 12.9843 12.7138L12.9843 12.7138L12.9843 12.7138L12.9167 12.9167C12.7351 13.4614 12.6443 13.7338 12.4475 13.9106C12.3942 13.9585 12.3359 14.0005 12.2737 14.0359C12.0437 14.1667 11.7566 14.1667 11.1824 14.1667H8.81762C8.24338 14.1667 7.95625 14.1667 7.72634 14.0359C7.66407 14.0005 7.60578 13.9585 7.55249 13.9106C7.35572 13.7338 7.26492 13.4614 7.08333 12.9167L7.08333 12.9167L7.01572 12.7138C6.89966 12.3656 6.84163 12.1916 6.73978 12.0586C6.6203 11.9026 6.45751 11.7853 6.27174 11.7212C6.11339 11.6667 5.92989 11.6667 5.56287 11.6667H5C4.53534 11.6667 4.30302 11.6667 4.10982 11.6282C3.31644 11.4704 2.69624 10.8502 2.53843 10.0569C2.50148 9.87108 2.50006 9.64913 2.5 9.21922Z"
        fill="white"
      />
      <path
        d="M13.3333 5H13.5C15.3856 5 16.3284 5 16.9142 5.58579C17.5 6.17157 17.5 7.11438 17.5 9V14.3333C17.5 16.219 17.5 17.1618 16.9142 17.7475C16.3284 18.3333 15.3856 18.3333 13.5 18.3333H6.5C4.61438 18.3333 3.67157 18.3333 3.08579 17.7475C2.5 17.1618 2.5 16.219 2.5 14.3333V9C2.5 7.11438 2.5 6.17157 3.08579 5.58579C3.67157 5 4.61438 5 6.5 5H6.66667"
        stroke="white"
        strokeWidth="2"
      />
      <path
        d="M6.66675 8.33333L10.0001 10.8333M10.0001 10.8333L13.3334 8.33333M10.0001 10.8333L10.0001 2.49999"
        stroke="white"
        strokeWidth="2"
      />
    </svg>
    // </a>
  );
  const tableFormat: FlexTableFormat = [
    {
      headerValue: csvDownloadButton,
      style: {
        flexBasis: '45px',
        flexGrow: '0',
      },
    },
    {
      headerValue: 'Nickname',
      style: {
        flexGrow: '1',
      },
    },
    {
      headerValue: 'Start',
      style: {
        flexGrow: '1',
      },
    },

    {
      headerValue: 'Duration [ms]',
      style: {
        flexGrow: '1',
      },
    },
  ];

  const tableData: PingLogTable = {
    ipAddressInfoArray: props.ipAddressInfoArray,
    records: [],
    tableFormat,
  };

  tableData.records = props.pingrecords;

  // the startDate is minus in order to sort form latest -> oldest
  // tableData.records = sort(tableData.records, datum => -datum.start);
  function onItemsRendered({
    overscanStartIndex,
    overscanStopIndex,
    visibleStartIndex,
    visibleStopIndex,
  }: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) {
    // All index params are numbers.
  }
  const rowKeyGenerator = useCallback((index: number, tableData: PingLogTable) => {
    const pingLogRow = tableData.records[index];
    const key = `${pingLogRow.start} ${pingLogRow}`;
    return key;
  }, []);

  const tableProps: FlexTableProps<PingLogTable, PingRecord> = {
    rowKeyGenerator,
    tableData,
    dataToElementsMapper: pingDataToElementsMapper,
    tableFormat,
    onItemsRendered,
  };
  return <FlexTable<PingLogTable, PingRecord> {...tableProps}></FlexTable>;
}
