import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Bars, WeightChart } from '../../src/charts';
import { allWeights, dayTotals, getSettings } from '../../src/db';
import {
  addDays, currentWeight, dayKey, daysBetween, fmtKcal, fmtMonth, progress, projection, rate, targetFor, toDisplay, trend,
} from '../../src/logic';
import { useLive } from '../../src/state';
import { useColors } from '../../src/theme';
import { Bar, Big, Btn, Card, Chip, H, Row, Screen, T } from '../../src/ui';

const RANGES = [7, 30, 90];

export default function Trends() {
  const c = useColors();
  const router = useRouter();
  const [range, setRange] = useState(30);
  const settings = useLive(getSettings);
  const today = dayKey(new Date(), settings?.rolloverHour ?? 0);
  const from = addDays(today, -(range - 1));
  const totals = useLive((db) => dayTotals(db, from, today), [from, today]);
  const weights = useLive(allWeights);
  if (!settings || !totals || !weights) return null;

  const byDay = new Map(totals.map((t) => [t.day, t.kcal]));
  const bars = Array.from({ length: range }, (_, i) => {
    const day = addDays(from, i);
    return { day, kcal: byDay.get(day) ?? 0, target: targetFor(day, settings) };
  });
  const logged = bars.filter((b) => b.kcal > 0);
  const avg = logged.length ? logged.reduce((t, b) => t + b.kcal, 0) / logged.length : 0;
  const over = logged.filter((b) => b.target !== null && b.kcal > b.target).length;
  const targets = bars.map((b) => b.target).filter((t): t is number => t !== null);
  const line = targets.length ? targets.reduce((a, b) => a + b, 0) / targets.length : null;

  const u = settings.units;
  const show = (kg: number) => `${toDisplay(kg, u)} ${u}`;
  const tr = trend(weights);
  const current = currentWeight(weights);
  const start = settings.startKg ?? weights[0]?.kg ?? null;
  const goal = settings.goalKg;
  const r = rate(weights, today);
  const proj = current !== null && goal !== null ? projection(current, goal, r, today) : null;
  const inRange = (d: string) => d >= from && d <= today;
  const headline =
    proj === 'reached' ? 'Reached' : proj === 'far' ? '2+ years' : proj ? fmtMonth(proj.day) : 'Not yet';
  const detail =
    proj === 'reached' ? `You are at ${show(goal!)}.`
      : proj === 'far' ? `More than two years to ${show(goal!)} at the current rate.`
      : proj ? `About ${Math.round(daysBetween(today, proj.day) / 7)} weeks to ${show(goal!)} at ${toDisplay(Math.abs(r!), u)} ${u} a week.`
      : r !== null ? `Your trend is moving away from ${goal !== null ? show(goal) : 'your goal'}.`
      : 'Log your weight for two weeks to see an estimate.';

  return (
    <Screen>
      {goal !== null ? (
        <Card style={{ alignItems: 'center', paddingVertical: 22, gap: 8, borderWidth: 1, borderColor: c.gold }}>
          <H>Estimated goal date</H>
          <Big size={46} color={proj ? c.text : c.muted}>{headline}</Big>
          <T muted size={14} style={{ textAlign: 'center' }}>{detail}</T>
          {start !== null && current !== null ? (
            <>
              <Bar value={progress(start, current, goal)} color={c.gold} />
              <T muted size={13}>
                {Math.round(progress(start, current, goal) * 100)}% of the way from {show(start)} to {show(goal)}
              </T>
            </>
          ) : null}
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          <T>Set a goal weight to see your estimated goal date.</T>
          <Btn title="Set a goal" onPress={() => router.push('/settings')} />
        </Card>
      )}

      <Row>
        {RANGES.map((n) => <Chip key={n} title={`${n} days`} active={range === n} onPress={() => setRange(n)} />)}
      </Row>

      <H>Calories</H>
      <Card>
        <Bars data={bars} target={line} />
        <T muted size={14}>
          {logged.length
            ? `Average ${fmtKcal(avg)} kcal on ${logged.length} logged ${logged.length === 1 ? 'day' : 'days'}` +
              (targets.length ? ` · ${over} over target` : '')
            : 'Nothing logged in this range.'}
        </T>
      </Card>

      <H>Weight</H>
      <Card>
        {weights.some((w) => inRange(w.day)) ? (
          <WeightChart
            from={from}
            to={today}
            goal={goal === null ? null : toDisplay(goal, u)}
            points={weights.filter((w) => inRange(w.day)).map((w) => ({ day: w.day, v: toDisplay(w.kg, u) }))}
            trend={tr.filter((p) => p.kg !== null && inRange(p.day)).map((p) => ({ day: p.day, v: toDisplay(p.kg!, u) }))}
          />
        ) : (
          <T muted>No weights in this range.</T>
        )}
        {current !== null ? <Big size={28}>{show(current)}</Big> : null}
        {start !== null && current !== null ? (
          <T muted size={14}>{`${current <= start ? '−' : '+'}${toDisplay(Math.abs(current - start), u)} ${u} since start`}</T>
        ) : null}
        {r !== null ? <T muted size={14}>{`${r <= 0 ? '−' : '+'}${toDisplay(Math.abs(r), u)} ${u} a week`}</T> : null}
      </Card>
      <Btn title="Log weight" onPress={() => router.push('/weight')} />
    </Screen>
  );
}
