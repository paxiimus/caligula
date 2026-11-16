import { Text } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { LEAVES, STEM } from './brand-mark';
import { FONTS } from './theme';

/** The laurel "C". */
export function Mark({ size = 48, color }: { size?: number; color: string }) {
  return (
    <Svg width={size * (690 / 800)} height={size} viewBox="110 130 690 800" accessibilityLabel="Caligula">
      <Path d={STEM} fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" />
      {LEAVES.map((l, i) => <Path key={i} d={l.d} transform={l.t} fill={color} />)}
    </Svg>
  );
}

export function Wordmark({ size = 22, color }: { size?: number; color: string }) {
  return (
    <Text accessibilityRole="header" style={{ fontFamily: FONTS.brand, fontSize: size, letterSpacing: size * 0.18, color }}>
      CALIGULA
    </Text>
  );
}

export type IconName = 'today' | 'trends' | 'photos' | 'foods' | 'settings';

/** Line icons on a 24 grid. */
export function Icon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  const s = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'today' ? (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Circle cx={12} cy={12} r={5} {...s} />
        </>
      ) : name === 'trends' ? (
        <>
          <Polyline points="3,16 9,10 13,14 21,6" {...s} />
          <Polyline points="16,6 21,6 21,11" {...s} />
          <Line x1={3} y1={20} x2={21} y2={20} {...s} />
        </>
      ) : name === 'photos' ? (
        <>
          <Rect x={2.5} y={7} width={19} height={13} rx={3} {...s} />
          <Path d="M8 7l1.6-2.5h4.8L16 7" {...s} />
          <Circle cx={12} cy={13.5} r={3.5} {...s} />
        </>
      ) : name === 'foods' ? (
        <>
          <Path d="M3 11h18a9 7 0 0 1-18 0z" {...s} />
          <Path d="M9 7c0-1.5 1.5-1.5 1.5-3M13.5 7c0-1.5 1.5-1.5 1.5-3" {...s} />
        </>
      ) : (
        <>
          <Line x1={4} y1={7} x2={20} y2={7} {...s} />
          <Line x1={4} y1={17} x2={20} y2={17} {...s} />
          <Circle cx={9} cy={7} r={2.4} {...s} fill={color} />
          <Circle cx={15} cy={17} r={2.4} {...s} fill={color} />
        </>
      )}
    </Svg>
  );
}
