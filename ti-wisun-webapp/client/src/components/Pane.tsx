import { useContext } from "react";
import { ColorScheme, THEME, ThemeContext } from "../ColorScheme";
import { ComponentThemeImplementations } from "../utils";


interface PaneContainerTheme {
  paneContainerStyle: React.CSSProperties;
}
const paneThemeImplementations = new ComponentThemeImplementations<PaneContainerTheme>();
const tiPaneContainerTheme = {
  paneContainerStyle: {
    backgroundColor: 'rgba(0,0,0,0)',
  },
};
paneThemeImplementations.set(THEME.TI, tiPaneContainerTheme);
const gruvboxPaneContainerTheme = {
  paneContainerStyle: {
    backgroundColor: ColorScheme.getColor('bg1', THEME.GRUVBOX),
    borderRadius: 10,
  },
};
paneThemeImplementations.set(THEME.GRUVBOX, gruvboxPaneContainerTheme);


interface PaneProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}


export default function Pane(props: PaneProps) {
  const theme = useContext(ThemeContext);
  const {paneContainerStyle} = paneThemeImplementations.get(theme);
  return (
    <div style={{
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingBottom: 30,
    ...paneContainerStyle,
       ...props.style}}>
      {props.children}
    </div>
  );
}
