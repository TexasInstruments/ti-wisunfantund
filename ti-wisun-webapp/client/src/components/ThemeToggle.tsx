import {useCallback, useContext} from 'react';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
// import dayIcon from "../icons/dayIcon.svg";
// import nightIcon from "../icons/nightIcon.svg";

function NightIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.3333 7C18.0182 7 18.3607 7 18.5969 7.14044C18.983 7.36999 19.1687 7.82915 19.0508 8.26258C18.9786 8.52775 18.6009 8.89311 17.8454 9.62384C16.0908 11.3208 15 13.6997 15 16.3333C15 18.967 16.0908 21.3459 17.8454 23.0428C18.6009 23.7736 18.9786 24.1389 19.0508 24.4041C19.1687 24.8375 18.983 25.2967 18.5969 25.5262C18.3607 25.6667 18.0182 25.6667 17.3333 25.6667V25.6667C12.1787 25.6667 8 21.488 8 16.3333C8 11.1787 12.1787 7 17.3333 7V7Z"
        fill="white"
      />
    </svg>
  );
}

function DayIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="5" fill="white" />
      <path d="M12 8V4" stroke="white" strokeWidth="2" />
      <path d="M12 20V16" stroke="white" strokeWidth="2" />
      <path d="M9.17169 9.1712L6.34326 6.34277" stroke="white" strokeWidth="2" />
      <path d="M17.6568 17.6566L14.8284 14.8281" stroke="white" strokeWidth="2" />
      <path d="M16 12L20 12" stroke="white" strokeWidth="2" />
      <path d="M4 12L8 12" stroke="white" strokeWidth="2" />
      <path d="M14.8283 9.1712L17.6567 6.34277" stroke="white" strokeWidth="2" />
      <path d="M6.3432 17.6566L9.17163 14.8281" stroke="white" strokeWidth="2" />
    </svg>
  );
}

interface ThemeToggleProps {
  handleNewTheme: (t: THEME) => void;
}

export default function ThemeToggle(props: ThemeToggleProps) {
  const theme = useContext(ThemeContext);
  // let borderRadius = props.theme === THEME.TI ? 0 : 9;

  const isTIThemed = theme === THEME.TI;
  let borderRadius = 9;
  const boxShadow = isTIThemed ? '0px 0px 11px rgba(0, 0, 0, 0.4)' : undefined;

  let displayElement = null;
  let sliderBackground = null;
  if (isTIThemed) {
    sliderBackground = ColorScheme.getColor('redDark', theme);
    displayElement = (
      <>
        <DayIcon />
        <div
          style={{
            backgroundColor: ColorScheme.getColor('bg3', THEME.TI),
            width: 32,
            height: 32,
            borderRadius,
          }}
        ></div>
      </>
    );
  } else {
    sliderBackground = ColorScheme.getColor('bg1', theme);

    displayElement = (
      <>
        <div
          style={{
            backgroundColor: ColorScheme.getColor('bg2', theme),
            width: 32,
            height: 32,
            borderRadius,
          }}
        ></div>
        <NightIcon />
      </>
    );
  }
  const {handleNewTheme} = props;
  const clickHandler = useCallback(() => {
    const newIsTIThemed = !isTIThemed;
    handleNewTheme(newIsTIThemed ? THEME.TI : THEME.GRUVBOX);
  }, [isTIThemed, handleNewTheme]);

  return (
    <div
      style={{
        width: 64,
        height: 32,
        backgroundColor: sliderBackground,
        borderRadius,
        display: 'flex',
        cursor: 'pointer',
        flexDirection: 'row',
        boxShadow,
      }}
      onClick={clickHandler}
    >
      {displayElement}
    </div>
  );
}
