import React from 'react';
import {ReactNode, useContext, useRef} from 'react';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {useSize} from '../hooks/useSize';
import {ComponentThemeImplementations} from '../utils';
import Pane from './Pane';

interface MinMax {
  min: number;
  max: number;
}

interface PaneContainerPropsType {
  maxColumns: number;
  columnWidthMinMax: MinMax;
  // this list should have max Columns elements
  // each element should have children.length number of elements
  // e.g. [[[0,1,2]],[[0,1],[2]]]
  elementOrdering: number[][][];
  gutterWidth: number;
  children: ReactNode;
  style: React.CSSProperties;
}

export function PaneContainer({
  style,
  maxColumns,
  columnWidthMinMax,
  elementOrdering,
  gutterWidth,
  children,
}: PaneContainerPropsType) {
  const target = useRef<HTMLDivElement>(null);

  const size = useSize(target);
  let numColumns = maxColumns;
  let assignedWidthStyle = {};
  if (size !== null) {
    numColumns = Math.floor(
      (size.width - columnWidthMinMax.min) / (columnWidthMinMax.min + gutterWidth) + 1
    );
    numColumns = Math.min(maxColumns, numColumns);
    numColumns = Math.max(1, numColumns);
    if (size.width - columnWidthMinMax.min > 0) {
      let assignedWidth = (size.width - (numColumns - 1) * gutterWidth) / numColumns;
      assignedWidth = Math.min(columnWidthMinMax.max, assignedWidth);
      assignedWidth = Math.max(columnWidthMinMax.min, assignedWidth);
      assignedWidthStyle = {width: assignedWidth};
    }
  }
  const ordering = elementOrdering[numColumns - 1];
  const columns = [];
  for (let i = 0; i < numColumns; i++) {
    const childrenArray = React.Children.toArray(children);
    columns.push(
      <Pane
        key={`${numColumns}${i}`}
        style={{maxWidth: columnWidthMinMax.max, ...assignedWidthStyle}}
      >
        {ordering[i].map(key => childrenArray[key])}
      </Pane>
    );
  }

  return (
    <div
      ref={target}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        columnGap: gutterWidth,
        ...style,
      }}
    >
      {columns}
    </div>
  );
}
