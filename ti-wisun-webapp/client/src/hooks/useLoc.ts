import {RefObject, useEffect, useLayoutEffect, useState} from 'react';

export function useLoc(targetRef: RefObject<HTMLElement>, isEnabled: boolean = true) {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);
  const [right, setRight] = useState(0);
  const [bottom, setBottom] = useState(0);
  useLayoutEffect(() => {
    if (!isEnabled) {
      return;
    }
    if (targetRef.current === null) {
      return;
    }
    const boundingRect = targetRef.current.getBoundingClientRect();
    const currentLeft = boundingRect.left;
    const currentRight = boundingRect.right;
    const currentTop = boundingRect.top + window.scrollY;
    const currentBottom = boundingRect.bottom + window.scrollY;
    if (top !== currentTop) {
      setTop(currentTop);
    }
    if (bottom !== currentBottom) {
      setBottom(currentBottom);
    }
    if (left !== currentLeft) {
      setLeft(currentLeft);
    }
    if (right !== currentRight) {
      setRight(currentRight);
    }
  }, [left, top, isEnabled, setTop]);
  return {left, top, right, bottom};
}
