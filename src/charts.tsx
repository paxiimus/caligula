import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { daysBetween } from './logic';
import { useColors } from './theme';

function useWidth() {
  const [w, setW] = useState(0);
  return [w, (e: { nativeEvent: { layout: { width: number } } }) => setW(e.nativeEvent.layout.width)] as const;
}

/** Daily kcal bars with the target as a dashed line. Days over target are drawn muted, not red. */
export function Bars({ data, target, height = 140 }: { data: { day: string; kcal: number }[]; target: number | null; height?: number }) {
  const c = useColors();
  const [w, onLayout] = useWidth();
  const max = Math.max(1, target ?? 0, ...data.map((d) => d.kcal)) * 1.1;
  const bw = data.length ? w / data.length : 0;
  const y = (v: number) => height - (v / max) * height;
  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {data.map((d, i) =>
            d.kcal > 0 ? (
              <Rect key={d.day} x={i * bw + bw * 0.15} y={y(d.kcal)} width={bw * 0.7} height={height - y(d.kcal)}
                rx={Math.min(3, bw * 0.2)} fill={target && d.kcal > target ? c.muted : c.accent} />
            ) : null,
          )}
          {target ? <Line x1={0} x2={w} y1={y(target)} y2={y(target)} stroke={c.text} strokeWidth={1} strokeDasharray="4 4" /> : null}
        </Svg>
      )}
    </View>
  );
}

type Pt = { day: string; v: number };

/** Daily weights as dots, the 7-day trend as a line, the goal as a dashed line. */
export function WeightChart(p: { points: Pt[]; trend: Pt[]; goal: number | null; from: string; to: string; height?: number }) {
  const c = useColors();
  const [w, onLayout] = useWidth();
  const h = p.height ?? 160;
  const vs = [...p.points, ...p.trend].map((x) => x.v).concat(p.goal ?? []);
  const lo = Math.min(...vs) - 0.5;
  const hi = Math.max(...vs) + 0.5;
  const span = Math.max(1, daysBetween(p.from, p.to));
  const x = (day: string) => 8 + (daysBetween(p.from, day) / span) * (w - 16);
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo)) * (h - 16);
  if (!vs.length) return null;
  return (
    <View onLayout={onLayout} style={{ height: h }}>
      {w > 0 && (
        <Svg width={w} height={h}>
          {p.goal !== null ? (
            <Line x1={0} x2={w} y1={y(p.goal)} y2={y(p.goal)} stroke={c.muted} strokeWidth={1} strokeDasharray="4 4" />
          ) : null}
          {p.points.map((pt) => <Circle key={pt.day} cx={x(pt.day)} cy={y(pt.v)} r={3} fill={c.muted} />)}
          {p.trend.length > 1 ? (
            <Polyline points={p.trend.map((pt) => `${x(pt.day)},${y(pt.v)}`).join(' ')} fill="none" stroke={c.accent} strokeWidth={2.5} />
          ) : null}
          <Rect x={0} y={0} width={w} height={h} fill="none" stroke={c.line} rx={8} />
        </Svg>
      )}
    </View>
  );
}
