import {CSSProperties, ReactNode} from 'react';

export function ConfigPropertyContainer({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
