import {useContext, useRef, useState} from 'react';
import {App} from '../App';
import {NETWORK_TIMEOUT_WARNING_DURATION} from '../constants';
import {AppContext} from '../Contexts';
import {useSetSynchronizedPropertyWithTimeout} from '../hooks/useSetSynchronizedPropertyWithTimeout';
import {BorderRouterPropertyContainer} from './BorderRouterPropertyContainer';
import {ConfigPropertyContainer} from './ConfigPropertyContainer';
import {
  ErrorPropertyTooltipCard,
  InfoMessageTooltipCard,
  InfoPropertyTooltipCard,
  InfoTooltip,
  InfoTooltipMode,
} from './InfoTooltip';
import ThemedButton, {THEMED_BUTTON_TYPE} from './ThemedButton';
import {ThemedInput} from './ThemedInput';

interface ConfigPropertyInputProps {
  propertyValue: string | null;
  propertySetter: (App: App, value: string) => void;
  isInvalidTester: (inputValue: string) => boolean;
  name: string;
  description: string;
  //invalid headline and descripts indicate the why the current value is invalid
  invalidHeadline: string;
  invalidDescription: string;
  isDisabled?: boolean;
  disabledReason?: string;
}

export function ConfigPropertyInput({
  propertyValue,
  propertySetter,
  name,
  description,
  invalidHeadline,
  invalidDescription,
  isInvalidTester,
  isDisabled = false,
  disabledReason = 'N/A',
}: ConfigPropertyInputProps) {
  // This "sentPropertyInfo"  indicates when the property was sent client side and what it was set to
  const [currentInputValue, setInputValue] = useState(propertyValue);
  const inputValueInvalid = currentInputValue !== null && isInvalidTester(currentInputValue);

  const App = useContext(AppContext);
  if (App === null) {
    throw Error('App null');
  }
  const {timeoutHasOccurred, setProperty, resetToRemoteProperty} =
    useSetSynchronizedPropertyWithTimeout(
      currentInputValue,
      setInputValue,
      propertyValue,
      (val: string | null) => propertySetter(App, val || '')
    );

  let infoTooltipMode = InfoTooltipMode.INFO;
  if (inputValueInvalid) {
    infoTooltipMode = InfoTooltipMode.ERROR;
  } else if (timeoutHasOccurred) {
    infoTooltipMode = InfoTooltipMode.WARNING;
  }

  return (
    <ConfigPropertyContainer>
      <BorderRouterPropertyContainer name={name}>
        <ThemedInput
          value={currentInputValue}
          onChange={text => setInputValue(text)}
          onBlur={() => setProperty()}
          isDisabled={isDisabled}
        />
        <InfoTooltip mode={infoTooltipMode}>
          {isDisabled && (
            <InfoMessageTooltipCard name={'Property Locked'} description={disabledReason} />
          )}
          {inputValueInvalid && (
            <ErrorPropertyTooltipCard headline={invalidHeadline} description={invalidDescription}>
              <ThemedButton
                themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
                onClick={resetToRemoteProperty}
              >
                Reset
              </ThemedButton>
            </ErrorPropertyTooltipCard>
          )}
          {timeoutHasOccurred && (
            <ErrorPropertyTooltipCard
              headline={'Timeout Detected'}
              description={'Setting the property through wfantund was unsuccessful'}
              isWarning={true}
            >
              <ThemedButton
                themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
                onClick={resetToRemoteProperty}
              >
                Reset
              </ThemedButton>
            </ErrorPropertyTooltipCard>
          )}

          <InfoPropertyTooltipCard
            value={currentInputValue}
            name={name}
            description={description}
          />
        </InfoTooltip>
      </BorderRouterPropertyContainer>
    </ConfigPropertyContainer>
  );
}
