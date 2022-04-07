import {
  CSSProperties,
  ReactEventHandler,
  ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import ReactDOM from 'react-dom';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {useLoc} from '../hooks/useLoc';
import {useSize} from '../hooks/useSize';
import {ComponentThemeImplementations} from '../utils';

interface InfoTooltipTheme {
  infoColor: Color;
  errorColor: Color;
  warningColor: Color;
  mainTextColor: Color;
  descriptionTextColor: Color;
}

function TooltipInteriorContainer({children}: {children: ReactNode}) {
  const theme = useContext(ThemeContext);
  const {backgroundColor} = infoTooltipThemeImplementations.get(theme);
  return (
    <div
      style={{
        zIndex: 1,
        boxShadow: '0px 0px 14px rgba(0, 0, 0, 0.3)',
        backgroundColor,
        borderRadius: 9,
        padding: 20,
        minHeight: 70,
        display: 'flex',
        flexDirection: 'column',
        rowGap: 10,
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}

function TooltipTriangle({
  style,
  fill,
  isPointingLeft,
}: {
  style: CSSProperties;
  fill: Color;
  isPointingLeft: boolean;
}) {
  const pointingStyle = isPointingLeft
    ? {}
    : {
        transformOrigin: 'center',
        transform: 'scale(-1,1)',
      };
  return (
    <div style={{position: 'relative', ...style}}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        style={{
          overflow: 'visible',
          zIndex: 2,
          width: '100%',
          position: 'absolute',
          left: 0,
          top: 0,
          ...pointingStyle,
        }}
        fill="none"
        viewBox="0 0 25 39"
      >
        <path
          fill={fill}
          d="M1.138 20.137a3 3 0 010-4.704L19.555.85c1.967-1.557 4.862-.157 4.862 2.352v35.367L1.137 20.137z"
        />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        style={{
          overflow: 'visible',
          zIndex: 0,
          width: '100%',
          position: 'absolute',
          left: 0,
          top: 0,
          ...pointingStyle,
        }}
        fill="none"
        viewBox="0 0 25 39"
      >
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodOpacity={0.3} />
          </filter>
        </defs>
        <path
          filter="url(#shadow)"
          fill={fill}
          d="M1.138 20.137a3 3 0 010-4.704L19.555.85c1.967-1.557 4.862-.157 4.862 2.352v35.367L1.137 20.137z"
        />
      </svg>
    </div>
  );
}

interface TooltipProps {
  right: number;
  left: number;
  top: number;
  children?: ReactNode;
  onMouseLeave?: ReactEventHandler;
  onMouseEnter?: ReactEventHandler;
}

function LeftPointingTootip({
  right: targetRight,
  top,
  children,
  overflowCallback,
}: {
  right: number;
  top: number;
  children: ReactNode;
  overflowCallback: () => void;
}) {
  const targetRef = useRef<HTMLDivElement>(null);
  const size = useSize(targetRef);
  const theme = useContext(ThemeContext);
  const {backgroundColor} = infoTooltipThemeImplementations.get(theme);
  const {left} = useLoc(targetRef);
  useLayoutEffect(() => {
    if (size !== null && left + size.width >= document.body.clientWidth) {
      overflowCallback();
    }
  }, [size, left]);
  return (
    <div
      ref={targetRef}
      style={{
        position: 'absolute',
        display: 'flex',
        maxWidth: 500,
        left: targetRight,
        top: top - 18,
        flexDirection: 'row',
        justifyContent: 'start',
        paddingLeft: 22,
      }}
    >
      <TooltipTriangle
        fill={backgroundColor}
        style={{
          position: 'absolute',
          left: 3,
          top: 10,
          width: 27,
        }}
        isPointingLeft={true}
      />
      <TooltipInteriorContainer>{children}</TooltipInteriorContainer>
    </div>
  );
}

function RightPointingTootip({
  left,
  top,
  children,
}: {
  left: number;
  top: number;
  children: ReactNode;
}) {
  const theme = useContext(ThemeContext);
  const {backgroundColor} = infoTooltipThemeImplementations.get(theme);

  return (
    <div
      style={{
        position: 'absolute',
        maxWidth: 500,
        display: 'flex',
        right: document.body.offsetWidth - left,
        top: top - 18,
        flexDirection: 'row',
        justifyContent: 'start',
        paddingRight: 22,
      }}
    >
      <TooltipTriangle
        fill={backgroundColor}
        isPointingLeft={false}
        style={{
          position: 'absolute',
          right: 3,
          top: 10,
          width: 27,
        }}
      />

      <TooltipInteriorContainer>{children}</TooltipInteriorContainer>
    </div>
  );
}

function Tooltip({right, left, top, children, onMouseEnter, onMouseLeave}: TooltipProps) {
  const [isPointingLeft, setPointingLeft] = useState(true);
  const WrapperElement = isPointingLeft ? LeftPointingTootip : RightPointingTootip;

  return ReactDOM.createPortal(
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <WrapperElement
        overflowCallback={() => setPointingLeft(false)}
        right={right}
        top={top}
        left={left}
      >
        {children}
      </WrapperElement>
    </div>,
    document.body
  );
}

interface InfoTooltipTheme {
  infoColor: Color;
  errorColor: Color;
  warningColor: Color;
  mainTextColor: Color;
  descriptionTextColor: Color;
  backgroundColor: Color;
  secondaryBackgroundColor: Color;
}

const infoTooltipThemeImplementations = new ComponentThemeImplementations<InfoTooltipTheme>();
const tiInfoTooltipTheme = {
  infoColor: ColorScheme.getColor('grayLight', THEME.TI),
  errorColor: ColorScheme.getColor('red', THEME.TI),
  warningColor: ColorScheme.getColor('yellowDark', THEME.TI),
  mainTextColor: ColorScheme.getColor('gray', THEME.TI),
  descriptionTextColor: ColorScheme.getColor('grayLight', THEME.TI),
  backgroundColor: ColorScheme.getColor('white', THEME.TI),
  secondaryBackgroundColor: ColorScheme.getColor('bg0', THEME.TI),
};
infoTooltipThemeImplementations.set(THEME.TI, tiInfoTooltipTheme);
const gruvboxInfoTooltipTheme = {
  infoColor: ColorScheme.getColor('gray', THEME.GRUVBOX),
  errorColor: ColorScheme.getColor('red', THEME.GRUVBOX),
  warningColor: ColorScheme.getColor('yellowDark', THEME.GRUVBOX),
  mainTextColor: ColorScheme.getColor('white', THEME.GRUVBOX),
  descriptionTextColor: ColorScheme.getColor('gray', THEME.GRUVBOX),
  backgroundColor: ColorScheme.getColor('bg1', THEME.GRUVBOX),
  secondaryBackgroundColor: ColorScheme.getColor('bg0', THEME.GRUVBOX),
};
infoTooltipThemeImplementations.set(THEME.GRUVBOX, gruvboxInfoTooltipTheme);

function InfoIcon({style}: {style?: CSSProperties}) {
  const theme = useContext(ThemeContext);
  const {infoColor} = infoTooltipThemeImplementations.get(theme);
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={infoColor} strokeWidth="2" />
      <path
        d="M12.5 7.5C12.5 7.77614 12.2761 8 12 8C11.7239 8 11.5 7.77614 11.5 7.5C11.5 7.22386 11.7239 7 12 7C12.2761 7 12.5 7.22386 12.5 7.5Z"
        fill={infoColor}
        stroke={infoColor}
      />
      <path d="M12 17V10" stroke={infoColor} strokeWidth="2" />
    </svg>
  );
}

function WarningIcon({isWarning}: {isWarning: boolean}) {
  const theme = useContext(ThemeContext);
  const {warningColor, errorColor} = infoTooltipThemeImplementations.get(theme);
  const mainColor = isWarning ? warningColor : errorColor;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="12"
        cy="12"
        r="9"
        transform="rotate(-180 12 12)"
        stroke={mainColor}
        strokeWidth="2"
      />
      <path
        d="M11.5 16.5C11.5 16.2239 11.7239 16 12 16C12.2761 16 12.5 16.2239 12.5 16.5C12.5 16.7761 12.2761 17 12 17C11.7239 17 11.5 16.7761 11.5 16.5Z"
        fill={mainColor}
        stroke={mainColor}
      />
      <path d="M12 7L12 14" stroke={mainColor} strokeWidth="2" />
    </svg>
  );
}

export enum InfoTooltipMode {
  INFO,
  WARNING,
  ERROR,
}

export function InfoTooltip({children, mode}: {children: ReactNode; mode?: InfoTooltipMode}) {
  //the number  of shown indicates
  const [shownCounter, setShownCounter] = useState(0);
  const targetRef = useRef<HTMLDivElement>(null);
  const {right, left, top} = useLoc(targetRef, shownCounter !== 0);
  let icon;
  switch (mode || InfoTooltipMode.INFO) {
    case InfoTooltipMode.INFO:
      icon = <InfoIcon />;
      break;
    case InfoTooltipMode.WARNING:
      icon = <WarningIcon isWarning={true} />;
      break;
    case InfoTooltipMode.ERROR:
      icon = <WarningIcon isWarning={false} />;
      break;
  }

  return (
    <>
      <div
        onMouseEnter={() => setShownCounter(shownCounter => shownCounter + 1)}
        onMouseLeave={() => setShownCounter(shownCounter => shownCounter - 1)}
        ref={targetRef}
      >
        {icon}
      </div>
      {shownCounter !== 0 && (
        <Tooltip
          onMouseEnter={() => setShownCounter(shownCounter => shownCounter + 1)}
          onMouseLeave={() => setShownCounter(shownCounter => shownCounter - 1)}
          right={right}
          left={left}
          top={top}
        >
          {children}
        </Tooltip>
      )}
    </>
  );
}

interface InfoMessageTooltipCard {
  name: string;
  description?: string;
  additionalDescriptions?: string[];
  children?: Object;
}

export function InfoMessageTooltipCard({
  name,
  description,
  additionalDescriptions,
  children,
}: InfoMessageTooltipCard) {
  const theme = useContext(ThemeContext);
  const {mainTextColor, descriptionTextColor} = infoTooltipThemeImplementations.get(theme);

  const displayDescription = (description: string) => {
    return <span style={{color: descriptionTextColor, fontSize: 15}}>{description}</span>;
  };

  return (
    <div
      style={{
        display: 'flex',
        fontWeight: 600,
        flexDirection: 'column',
        borderLeft: `1px solid ${mainTextColor}`,
        paddingLeft: 5,
      }}
    >
      <span style={{color: mainTextColor, fontSize: 18}}>{name}</span>
      {description && (
        <span style={{color: descriptionTextColor, fontSize: 15}}>{description}</span>
      )}
      {additionalDescriptions?.map(displayDescription)}
      {children}
    </div>
  );
}

interface InfoPropertyTooltipCard {
  value: string | null;
  name: string;
  description: string;
}

export function InfoPropertyTooltipCard({value, name, description}: InfoPropertyTooltipCard) {
  const theme = useContext(ThemeContext);
  const {secondaryBackgroundColor, mainTextColor} = infoTooltipThemeImplementations.get(theme);
  return (
    <div
      style={{
        display: 'flex',
        fontWeight: 600,
        flexDirection: 'row',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: 10,
        }}
      >
        <div
          style={{
            borderRadius: 2,
            paddingTop: 2,
            paddingBottom: 2,
            paddingLeft: 5,
            paddingRight: 5,
            backgroundColor: secondaryBackgroundColor,
            color: mainTextColor,
            fontSize: 15,
            fontWeight: 500,
            minHeight: 18,
            maxWidth: 600,
            textOverflow: 'ellipsis',
            overflow: 'auto',
            fontFamily: 'Roboto Mono, monospace',
            borderLeft: '1px solid gray',
          }}
        >
          {value !== null ? value : 'Loading...'}
        </div>
        <InfoMessageTooltipCard name={name} description={description} />
      </div>
    </div>
  );
}

interface ErrorPropertyTooltipCard {
  headline: string;
  description: string;
  isWarning?: boolean;
  children?: ReactNode;
}

export function ErrorPropertyTooltipCard({
  headline,
  description,
  isWarning = false,
  children,
}: ErrorPropertyTooltipCard) {
  const theme = useContext(ThemeContext);
  const {warningColor, errorColor, mainTextColor, descriptionTextColor} =
    infoTooltipThemeImplementations.get(theme);
  return (
    <div
      style={{
        display: 'flex',
        fontWeight: 600,
        flexDirection: 'row',
        columnGap: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderLeft: `1px solid ${isWarning ? warningColor : errorColor}`,
          paddingLeft: 5,
        }}
      >
        <span style={{color: mainTextColor, fontSize: 18}}>{headline}</span>
        <span style={{color: descriptionTextColor, fontSize: 15}}>{description}</span>
      </div>
      {children}
    </div>
  );
}
