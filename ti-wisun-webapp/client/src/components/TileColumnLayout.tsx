import {CSSProperties, ReactNode} from 'react';

export function TileColumnLayout({style, children}: {children: ReactNode; style?: CSSProperties}) {
  return (
    <div
      style={{
        display: 'flex',
        rowGap: 10,
        flexDirection: 'column',
        alignItems: 'center',
        width: '80%',
        marginTop: 20,
        marginBottom: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
