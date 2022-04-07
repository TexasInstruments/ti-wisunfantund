import React, {ReactElement, useContext, useEffect, useRef, useState} from 'react';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {FixedSizeList} from 'react-window';
import {
  ComponentThemeImplementations,
  scrollbarVisible as getScrollbarVisible,
  scrollbarWidth,
} from '../utils';
import produce from 'immer';
import '../assets/FlexTable.css';
import {FlexTableFormat} from '../types';

const dividerHeight = 2;

interface HeaderDatumProps {
  widthCallback: (width: number) => void;
  headerValue: string | ReactElement;
  style: React.CSSProperties;
}

class HeaderDatum extends React.Component<HeaderDatumProps> {
  refContainer = React.createRef<HTMLDivElement>();
  width: number | null = null;
  ro: ResizeObserver | null = null;

  componentDidMount() {
    this.ro = new ResizeObserver(entries => {
      console.assert(entries.length === 1);
      const newWidth = entries[0].target.clientWidth;
      if (newWidth !== this.width) {
        this.props.widthCallback(newWidth);
        this.width = newWidth;
      }
    });
    if (this.refContainer.current === null) {
      console.error('Null Ref');
      return;
    }
    this.ro.observe(this.refContainer.current);
  }
  componentWillUnmount() {
    return () => {
      if (this.ro === null) {
        return;
      }
      this.ro.disconnect();
    };
  }

  render() {
    return (
      <div className="flex_table_datum" ref={this.refContainer} style={this.props.style}>
        {this.props.headerValue}
      </div>
    );
  }
}

interface FlexTableDataType<RowDataType> {
  records: RowDataType[];
}

export interface FlexTableProps<TableDataType extends FlexTableDataType<RowDataType>, RowDataType> {
  dataToElementsMapper: (
    index: number,
    tableData: TableDataType,
    {columnWidths, theme}: {columnWidths: number[]; theme: THEME}
  ) => (ReactElement | string)[];
  rowKeyGenerator: (index: number, tableData: TableDataType) => string;
  tableData: TableDataType;
  tableFormat: FlexTableFormat;
  rowHeight?: number;
  numVisibleRows?: number;
  onItemsRendered?: any;
}

interface FlexTableTheme {
  mainTableStyle: React.CSSProperties;
  bodyRowStyle: React.CSSProperties;
  headerRowStyle: React.CSSProperties;
}
const flexTableThemeImplementations = new ComponentThemeImplementations<FlexTableTheme>();

const tiFlexTableTheme = {
  mainTableStyle: {
    color: ColorScheme.getColor('gray', THEME.TI),
    backgroundColor: ColorScheme.getColor('bg2', THEME.TI),
    boxShadow: '0px 1px 14px rgba(0, 0, 0, 0.3)',
  },
  bodyRowStyle: {
    borderBottom: `${dividerHeight}px solid ${ColorScheme.getColor('grayLight', THEME.TI)}`,
  },
  headerRowStyle: {
    backgroundColor: ColorScheme.getColor('red', THEME.TI),
    color: ColorScheme.getColor('white', THEME.TI),
  },
};
flexTableThemeImplementations.set(THEME.TI, tiFlexTableTheme);
const gruvboxFlexTableTheme = {
  mainTableStyle: {
    color: ColorScheme.getColor('white', THEME.GRUVBOX),
    backgroundColor: ColorScheme.getColor('bg2', THEME.GRUVBOX),
    boxShadow: '0px 1px 14px rgba(0, 0, 0, 0.3)',
    borderBottomRightRadius: 9,
    borderBottomLeftRadius: 9,
  },
  bodyRowStyle: {
    borderBottom: `${dividerHeight}px solid ${ColorScheme.getColor('bg1', THEME.GRUVBOX)}`,
  },
  headerRowStyle: {
    backgroundColor: ColorScheme.getColor('bg3', THEME.GRUVBOX),
    color: ColorScheme.getColor('white', THEME.GRUVBOX),
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
};
flexTableThemeImplementations.set(THEME.GRUVBOX, gruvboxFlexTableTheme);

export default function FlexTable<
  TableDataType extends FlexTableDataType<RowDataType>,
  RowDataType
>(props: FlexTableProps<TableDataType, RowDataType>) {
  const [columnWidths, setColumnWidths] = useState(props.tableFormat.map(() => -1));
  // Theming
  const theme = useContext(ThemeContext);
  const {mainTableStyle, bodyRowStyle, headerRowStyle} = flexTableThemeImplementations.get(theme);

  function widthCallbackGenerator(index: number) {
    return (width: number) => {
      setColumnWidths(
        produce(columnWidths, draft => {
          draft[index] = width;
        })
      );
    };
  }

  const tableHeaders = props.tableFormat.map((colFormat, index: number) => {
    return <HeaderDatum widthCallback={widthCallbackGenerator(index)} key={index} {...colFormat} />;
  });

  const dataToElementsMapper = props.dataToElementsMapper;
  const totalColumns = props.tableFormat.length;
  interface RowRendererProps {
    index: number;
    style: React.CSSProperties;
  }

  const RowRenderer = (rowProps: RowRendererProps) => {
    const elements = dataToElementsMapper(rowProps.index, props.tableData, {
      columnWidths,
      theme,
    });
    console.assert(elements.length === totalColumns);
    const wrappedElems = elements.map((ele, index) => {
      let datumStyle = props.tableFormat[index].style;
      return (
        <div className="flex_table_datum" style={datumStyle} key={index}>
          {ele}
        </div>
      );
    });
    return (
      <div style={{...rowProps.style, ...bodyRowStyle}} className="flex_table_row">
        {wrappedElems}
      </div>
    );
  };

  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const outerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (outerRef.current === null) {
      return;
    }
    const newScrollbarVisible = getScrollbarVisible(outerRef.current);
    if (newScrollbarVisible !== scrollbarVisible) {
      setScrollbarVisible(newScrollbarVisible);
    }
  }, [setScrollbarVisible, scrollbarVisible]);
  const rowHeight = props.rowHeight || 50;
  const itemCount = props.tableData.records.length;
  const numVisibleRows = props.numVisibleRows || 8;
  return (
    <div>
      <div
        style={{
          paddingRight: scrollbarVisible ? scrollbarWidth : 0,
          height: rowHeight,
          ...headerRowStyle,
        }}
        className="flex_table_row"
      >
        {tableHeaders}
      </div>
      <FixedSizeList
        outerRef={outerRef}
        className={'flex_table '.concat(theme)}
        style={mainTableStyle}
        height={rowHeight * numVisibleRows}
        itemCount={itemCount}
        itemSize={rowHeight}
        width="100%"
        itemData={props.tableData}
        itemKey={props.rowKeyGenerator}
        overscanCount={5}
        onItemsRendered={props.onItemsRendered}
      >
        {RowRenderer}
      </FixedSizeList>
    </div>
  );
}
