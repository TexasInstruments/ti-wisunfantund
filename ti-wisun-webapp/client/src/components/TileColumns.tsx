import {ReactNode, useRef} from 'react';
import {useSize} from '../hooks/useSize';

interface TileColumnsProps {
  children: ReactNode;
  minColumnWidth: number;
  gutterWidth: number;
}

// currently hardcoded for up to 2 columns
export function TileColumns({children, minColumnWidth, gutterWidth}: TileColumnsProps) {
  const target = useRef<HTMLDivElement | null>(null);
  const size = useSize(target);
  const width = size === null ? 1600 : size.width;
  let numColumns = 2;
  if (size !== null) {
    numColumns = Math.floor((width - minColumnWidth) / (minColumnWidth + gutterWidth) + 1);
    numColumns = Math.min(2, numColumns);
    numColumns = Math.max(1, numColumns);
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '92%',
        justifyContent: 'space-between',
        columnGap: gutterWidth,
        flexDirection: numColumns === 2 ? 'row' : 'column',
      }}
      ref={target}
    >
      {children}
    </div>
  );
}
