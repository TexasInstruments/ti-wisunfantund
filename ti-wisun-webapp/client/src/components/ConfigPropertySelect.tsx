import {useContext, useRef, useState} from 'react';
import {App} from '../App';
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
import {findOptionByValue, OptionType, ThemedSelect} from './ThemedSelect';

interface ConfigPropertySelectProps {
  propertyValue: any | null;
  propertySetter: (App: App, value: string) => void;
  name: string;
  width?: number | string;
  fontSize?: number | string;
  description: string;
  options: OptionType[];
  isDisabled?: boolean;
  disabledReason?: string;
}

export function ConfigPropertySelect({
  propertyValue,
  propertySetter,
  name,
  width,
  fontSize,
  options,
  description,
  isDisabled = false,
  disabledReason = 'N/A',
}: ConfigPropertySelectProps) {
  // This "sentPropertyInfo"  indicates when the property was sent client side and what it was set to
  const [currentValue, setValue] = useState(propertyValue);
  const App = useContext(AppContext);
  if (App === null) {
    throw Error('App Null');
  }

  const {timeoutHasOccurred, setProperty, resetToRemoteProperty} =
    useSetSynchronizedPropertyWithTimeout(
      currentValue,
      setValue,
      propertyValue,
      (val: string | null) => propertySetter(App, val || '')
    );

  let infoTooltipMode = InfoTooltipMode.INFO;
  if (timeoutHasOccurred) {
    infoTooltipMode = InfoTooltipMode.WARNING;
  }
  const currentOption = findOptionByValue(options, currentValue);

  return (
    <ConfigPropertyContainer>
      <BorderRouterPropertyContainer name={name}>
        <ThemedSelect
          fontSize={fontSize}
          options={options}
          value={currentOption}
          onChange={({value}) => {
            setValue(value);
          }}
          onBlur={setProperty}
          width={width}
          isDisabled={isDisabled}
        />
        <InfoTooltip mode={infoTooltipMode}>
          {isDisabled && (
            <InfoMessageTooltipCard name={'Property Locked'} description={disabledReason} />
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
            value={(currentOption && currentOption.label) || 'N/A'}
            name={name}
            description={description}
          />
        </InfoTooltip>
      </BorderRouterPropertyContainer>
    </ConfigPropertyContainer>
  );
}
