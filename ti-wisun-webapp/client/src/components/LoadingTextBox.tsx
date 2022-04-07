import {motion} from 'framer-motion';
import {Color} from '../ColorScheme';

export function LoadingTextBox({maxWidth}: {maxWidth: number}) {
  const duration = 1.7;
  const initialOpacity = 0.3;
  const lowOpacity = 0.14;
  return (
    <motion.div
      style={{
        borderRadius: 3,
        marginLeft: 4,
        marginRight: 4,
        backgroundColor: 'rgb(0.5,0.5,0.5)',
        height: '100%',
      }}
      transition={{
        delay: Math.random(),
        duration,
        repeat: Infinity,
      }}
      animate={{
        opacity: [initialOpacity, lowOpacity, initialOpacity],
        width: [maxWidth, 0.5 * maxWidth, maxWidth],
      }}
    ></motion.div>
  );
}
