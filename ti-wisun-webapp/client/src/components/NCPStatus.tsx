import {useCallback, useContext} from 'react';
import {APIService} from '../APIService';
import {AppContext} from '../Contexts';
import {deriveNCPIndicatorStatus, NCPStateIndicator} from './NCPStateIndicator';
import StatusIndicator from './StatusIndicator';
import ThemedButton, {THEMED_BUTTON_TYPE} from './ThemedButton';
import ThemedLabel from './ThemedLabel';
import Tooltip from './Tooltip';
import '../assets/NCPStatus.css';

interface NCPStatusProps {
  interfaceUp: boolean | null;
  stackUp: boolean | null;
  ncpState: string | null;
}

export function NCPStatus(props: NCPStatusProps) {
  const App = useContext(AppContext);
  const startStack = useCallback(async () => {
    try {
      let {wasSuccess} = await APIService.setProp('Interface:Up', true);
      await APIService.setProp('Stack:Up', true);
    } catch (e) {
      //network error
      if (App === null) {
        console.error('App is null');
        return;
      }
      App.receivedNetworkError(e);
    }
  }, [App]);

  const sendReset = useCallback(async () => {
    if (App === null) {
      console.error('App is null');
      return;
    }
    App.resetNCP();
  }, [App]);
  return (
    <div className="ncpStatusContainer">
      <div
        style={{
          width: '45%',
          display: 'flex',
          flexDirection: 'column',
          rowGap: 20,
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Tooltip
          content={props.ncpState}
          style={{top: -18}}
          containerStyle={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <NCPStateIndicator status={deriveNCPIndicatorStatus(props.ncpState)} />
        </Tooltip>

        <ThemedButton
          style={{width: '100%'}}
          onClick={startStack}
          themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
        >
          Start
        </ThemedButton>
      </div>
      <div
        style={{
          width: '45%',
          display: 'flex',
          flexDirection: 'column',
          rowGap: 20,
          height: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div className="ncpStatusRow">
          <ThemedLabel style={{fontSize: '100%'}}>Interface</ThemedLabel>
          <StatusIndicator isGoodStatus={props.interfaceUp}></StatusIndicator>
        </div>
        <div className="ncpStatusRow">
          <ThemedLabel style={{fontSize: '100%'}}>Stack</ThemedLabel>
          <StatusIndicator isGoodStatus={props.stackUp}></StatusIndicator>
        </div>

        <div className="ncpStatusRow">
          <ThemedButton
            style={{width: '100%'}}
            onClick={sendReset}
            themedButtonType={THEMED_BUTTON_TYPE.SECONDARY}
          >
            Reset
          </ThemedButton>
        </div>
      </div>
    </div>
  );
}
