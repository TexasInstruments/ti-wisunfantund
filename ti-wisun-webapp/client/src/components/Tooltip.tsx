import React, {ReactNode, RefObject, useEffect, useRef, useState} from 'react';
import reactDom from 'react-dom';
import '../assets/Tooltip.css';
import {useLoc} from '../hooks/useLoc';

interface Location {
  top: number;
  left: number;
}

interface TooltipPortalProps {
  loc: Location;
  content?: ReactNode;
  style?: React.CSSProperties;
}

function TooltipPortal(props: TooltipPortalProps) {
  const {top, left} = props.loc;
  const style = {
    transformOrigin: 'center top',
    transform: `translate(calc(-50% + ${left}px),${top}px)`,
    height: 25,
    paddingLeft: 10,
    paddingRight: 10,
    position: 'absolute' as 'absolute',
    top: '0',
    left: '0',
    ...props.style,
  };

  return reactDom.createPortal(
    <div style={style} className="tooltip-text">
      {props.content || 'N/A'}
    </div>,
    document.body
  );
}

interface TooltipProps {
  content?: ReactNode;
  children?: ReactNode;
  style?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
}

export default function Tooltip(props: TooltipProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const {left, top} = useLoc(localRef, shown);
  return (
    <div
      className="tooltip-container"
      style={{width: '100%', display: 'relative', ...props.containerStyle}}
      onMouseEnter={() => setShown(true)}
      onMouseLeave={() => setShown(false)}
    >
      {props.children}
      <div ref={localRef} className="tooltip-bottom-center"></div>
      {shown && (
        <TooltipPortal
          loc={{top, left}}
          style={props.style}
          content={props.content}
        ></TooltipPortal>
      )}
    </div>
  );
}
