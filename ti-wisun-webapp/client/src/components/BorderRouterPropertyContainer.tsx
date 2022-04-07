import {Children, ReactNode} from 'react';
import ThemedLabel from './ThemedLabel';

export function BorderRouterPropertyContainer({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const childrenArray = Children.toArray(children);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <ThemedLabel
        style={{
          fontSize: 15,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '48%',
        }}
      >
        {name}
      </ThemedLabel>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          width: '48%',
          height: '100%',
          columnGap: 3,
        }}
      >
        {childrenArray[0]}
        {childrenArray[1]}
      </div>
    </div>
  );
}
