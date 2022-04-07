import {ColorScheme, THEME} from '../ColorScheme';

export interface LEDprops {
  theme: THEME;
  color: string;
  ledState: boolean | null;
}

export default function LEDObject(props: LEDprops) {
  if (props.ledState == null) return <></>;

  let lightColor, darkColor;
  if (props.color == 'red') {
    lightColor = 'red';
    darkColor = 'redDark';
  } else if (props.color == 'green') {
    lightColor = 'green';
    darkColor = 'greenDark';
  } else {
    lightColor = 'white';
    darkColor = 'white';
  }

  return (
    <div
      style={{
        margin: 10,
        height: 20,
        width: 20,
        borderRadius: 10,
        backgroundColor: ColorScheme.getColor(props.ledState ? lightColor : darkColor, props.theme),
        boxShadow: `0px 0px 2px 5px ${ColorScheme.getColorWithOpacity(
          lightColor,
          props.ledState ? 0.5 : 0, // If LED is on, have boxShadow, otherwise don't
          props.theme
        )}`,
      }}
    ></div>
  );
}
