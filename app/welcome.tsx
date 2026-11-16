import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';
import { Mark, Wordmark } from '../src/brand';
import { saveSettings, setWeight } from '../src/db';
import { dayKey, fromDisplay, type Units } from '../src/logic';
import { useBump } from '../src/state';
import { useColors } from '../src/theme';
import { Btn, Chip, Field, H, num, Row, Screen, T } from '../src/ui';

const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Welcome() {
  const c = useColors();
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBump();
  const [units, setUnits] = useState<Units>('kg');
  const [current, setCurrent] = useState('');
  const [goal, setGoal] = useState('');
  const [target, setTarget] = useState('');
  const [varies, setVaries] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [other, setOther] = useState('');

  const toggle = (d: number) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]));
  const finish = async (skip: boolean) => {
    const kg = (v: string) => (num(v) === null ? null : fromDisplay(num(v)!, units));
    const now = skip ? null : kg(current);
    await saveSettings(db, skip ? { onboarded: true } : {
      onboarded: true, units, startKg: now, goalKg: kg(goal), targetSetKg: now, targetDefault: num(target),
      targetByWeekday: [0, 1, 2, 3, 4, 5, 6].map((d) => (varies && days.includes(d) ? num(other) : null)),
    });
    if (now !== null) await setWeight(db, dayKey(new Date()), now);
    bump();
    router.replace('/');
  };

  return (
    <Screen style={{ paddingTop: 64 }}>
      <View style={{ alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Mark size={96} color={c.gold} />
        <Wordmark size={34} color={c.accent} />
        <T muted style={{ textAlign: 'center' }}>Count calories. Nothing leaves your phone.</T>
      </View>

      <H>Your weight</H>
      <Row>{(['kg', 'lb'] as const).map((u) => <Chip key={u} title={u} active={units === u} onPress={() => setUnits(u)} />)}</Row>
      <Row>
        <Field style={{ flex: 1 }} label={`Current (${units})`} numeric value={current} onChangeText={setCurrent} />
        <Field style={{ flex: 1 }} label={`Goal (${units})`} numeric value={goal} onChangeText={setGoal} />
      </Row>

      <H>Daily calories</H>
      <Field label={varies ? 'Most days (kcal)' : 'Every day (kcal)'} numeric value={target} onChangeText={setTarget} />
      <T muted size={14}>Do you need a different amount on some days, such as training or work days?</T>
      <Row>
        <Chip title="Same every day" active={!varies} onPress={() => setVaries(false)} />
        <Chip title="Some days differ" active={varies} onPress={() => setVaries(true)} />
      </Row>
      {varies ? (
        <>
          <T muted size={14}>Which days?</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {WEEK.map((d) => <Chip key={d} title={DAY[d]} active={days.includes(d)} onPress={() => toggle(d)} />)}
          </Row>
          <Field label="Those days (kcal)" numeric value={other} onChangeText={setOther} />
        </>
      ) : null}
      <T muted size={13}>You can change all of this later in Settings.</T>

      <Btn title="Start" onPress={() => finish(false)} />
      <Btn kind="plain" title="Skip" onPress={() => finish(true)} />
    </Screen>
  );
}
