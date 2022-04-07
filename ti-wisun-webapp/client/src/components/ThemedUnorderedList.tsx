import {CSSProperties} from 'react';
import ThemedLabel from './ThemedLabel';

interface ThemedUnorderedListProps {
  items?: string[] | null;
  style?: CSSProperties;
}

export function ThemedUnorderedList(props: ThemedUnorderedListProps) {
  let stringItems = props.items ? props.items : ([] as string[]);
  const items = stringItems.map((item, index) => {
    const key = `${index}${item}`;
    return (
      <div key={key}>
        <ThemedLabel key={`${key}`}>{item}</ThemedLabel>
      </div>
    );
  });
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 20,
        rowGap: 10,
        ...props.style,
      }}
    >
      {items}
    </div>
  );
}
