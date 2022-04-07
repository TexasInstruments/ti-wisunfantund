import CheckBox from './CheckBox';
import StatusIndicator from './StatusIndicator';
import FlexTable from './FlexTable';
import '../assets/IPAddressTable.css';
import Tooltip from './Tooltip';
import {FlexTableFormat, IPAddressInfo} from '../types';
import {ReactElement, useCallback} from 'react';
import React from 'react';
import {getNickname} from '../utils';

interface IPAddressRow extends IPAddressInfo {
  ipSelectionHandler: (ip: string, isSelected: boolean) => void;
  id: string;
  // ipAddress: string;
  // isSelected: boolean;
  nickname: string;
}

interface IPAddressTableDataType {
  records: IPAddressRow[];
}

function ipDataToElementsMapper(
  index: number,
  ipTableRows: IPAddressTableDataType,
  {columnWidths}: {columnWidths: number[]}
): (ReactElement | string)[] {
  const ipRow = ipTableRows.records[index];
  const ipAddressMaxWidth = columnWidths[1];

  const ipAddressStyle: React.CSSProperties = {
    marginLeft: 'auto',
    marginRight: 'auto',
  };
  if (ipAddressMaxWidth !== -1) {
    ipAddressStyle.width = ipAddressMaxWidth - 30;
  }

  const ipLength = ipRow.ipAddress.length;
  const ipAddressSubstring = '...' + ipRow.ipAddress.substring(ipLength - 9, ipLength);

  return [
    <CheckBox
      clickHandler={(newVal: boolean) => ipRow.ipSelectionHandler(ipRow.ipAddress, newVal)}
      isChecked={ipRow.isSelected}
    />,
    <Tooltip
      content={ipRow.ipAddress}
      style={{
        paddingLeft: 10,
        paddingRight: 10,
        height: 30,
      }}
    >
      <div className="ip-address-table-ip-address" style={ipAddressStyle}>
        {/* {ipRow.ipAddress} */}
        {ipAddressSubstring}
      </div>
    </Tooltip>,
    ipRow.nickname,
    <StatusIndicator isGoodStatus={ipRow.isConnected} />,
  ];
}

interface IPAddressTableProps {
  ipAddressInfoArray: IPAddressInfo[];
  ipSelectionHandler: (ip: string, isSelected: boolean) => void;
}

export default function IPAddressTable(props: IPAddressTableProps) {
  let allIPsSelected = true;
  for (const ipInfo of props.ipAddressInfoArray) {
    if (!ipInfo.isSelected) {
      allIPsSelected = false;
      break;
    }
  }

  const toggleSelectionAllIPs = (val: boolean) => {
    for (const ipInfo of props.ipAddressInfoArray) {
      props.ipSelectionHandler(ipInfo.ipAddress, val);
    }
  };

  const tableFormat: FlexTableFormat = [
    {
      headerValue: <CheckBox isChecked={allIPsSelected} clickHandler={toggleSelectionAllIPs} />,
      style: {
        flexBasis: '40px',
        flexGrow: '0',
      },
    },
    {
      headerValue: 'IP',
      style: {
        flexGrow: '1',
      },
    },
    {
      headerValue: 'Nickname',
      style: {
        flexGrow: '1',
      },
    },
    {
      headerValue: 'Status',
      style: {
        flexBasis: '100px',
        flexGrow: '0',
      },
    },
  ];

  const tableRows = props.ipAddressInfoArray.map((ipAddressInfo: IPAddressInfo) => {
    return {
      id: ipAddressInfo.ipAddress,
      nickname: getNickname(ipAddressInfo.ipAddress),
      ipSelectionHandler: props.ipSelectionHandler,
      ...ipAddressInfo,
    };
  });

  const rowKeyGenerator = useCallback(
    (index: number, table: IPAddressTableDataType) => table.records[index].id,
    []
  );
  const tableProps = {
    rowKeyGenerator,
    tableData: {
      records: tableRows,
    },
    dataToElementsMapper: ipDataToElementsMapper,
    tableFormat,
  };
  return <FlexTable<IPAddressTableDataType, IPAddressRow> {...tableProps} />;
}
