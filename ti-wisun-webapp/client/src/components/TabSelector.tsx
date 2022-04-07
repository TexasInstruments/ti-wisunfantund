import '../assets/TabSelector.css';

interface TabSelectorProps {
  name: string;
  isSelected: boolean;
  selectTab: () => void;
}

export default function TabSelector(props: TabSelectorProps) {
  return (
    <h3
      className="tab_selector"
      style={{fontSize: 24, fontWeight: props.isSelected ? 600 : 400}}
      onClick={() => props.selectTab()}
    >
      {props.name}
    </h3>
  );
}
