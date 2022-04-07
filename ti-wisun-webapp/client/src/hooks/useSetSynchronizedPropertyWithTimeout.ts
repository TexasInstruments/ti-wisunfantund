import {useRef} from 'react';
import {NETWORK_TIMEOUT_WARNING_DURATION} from '../constants';
import {useForceUpdate} from './useForceUpdate';
import {useJustUpdated} from './useJustUpdated';

export function useSetSynchronizedPropertyWithTimeout<T>(
  localPropertyValue: T,
  setLocalProperty: (val: T) => void,
  remotePropertyValue: T,
  setRemoteProperty: ((val: T) => Promise<any>) | ((val: T) => void)
) {
  const sentPropertyInfo = useRef({
    dateSent: Infinity,
    value: remotePropertyValue,
  });

  const forceUpdate = useForceUpdate();
  const remotePropertyJustUpdated = useJustUpdated(remotePropertyValue);
  if (remotePropertyJustUpdated) {
    setLocalProperty(remotePropertyValue);
    sentPropertyInfo.current = {
      dateSent: Infinity,
      value: localPropertyValue,
    };
  }

  const timeoutHasOccurred =
    Date.now() - sentPropertyInfo.current.dateSent > NETWORK_TIMEOUT_WARNING_DURATION &&
    remotePropertyValue !== sentPropertyInfo.current.value;

  async function setProperty() {
    sentPropertyInfo.current = {dateSent: Date.now(), value: localPropertyValue};
    await setRemoteProperty(localPropertyValue);
    setTimeout(forceUpdate, NETWORK_TIMEOUT_WARNING_DURATION);
  }

  function resetToRemoteProperty() {
    setLocalProperty(remotePropertyValue);
    sentPropertyInfo.current = {
      dateSent: Infinity,
      value: remotePropertyValue,
    };
  }

  return {timeoutHasOccurred, setProperty, resetToRemoteProperty};
}
