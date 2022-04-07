import {useRef} from 'react';

export function useJustUpdated(targetVariable: any) {
  //the ! is just to always have the first run return
  const targetVariableRef = useRef(!targetVariable);
  if (targetVariableRef.current !== targetVariable) {
    targetVariableRef.current = targetVariable;
    return true;
  } else {
    return false;
  }
}
