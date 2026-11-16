import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { applyBackup, exportData, pickBackup } from '../src/backup';
import { Mark, Wordmark } from '../src/brand';
import { allWeights, getSettings, saveSettings, wipe } from '../src/db';
import { removeAllPhotoFiles } from '../src/files';
import { currentWeight, fmtDay, fromDisplay, toDisplay, type Settings, type Units } from '../src/logic';
import { useColors } from '../src/theme';
import { seedDemo } from '../src/seed';
import { useBump } from '../src/state';
import { Btn, Card, Chip, Field, H, num, Row, Screen, T } from '../src/ui';

const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const str = (n: number | null) => (n === null ? '' : String(n));

export default function SettingsScreen() {
  const c = useColors();
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBump();
  const [s, setS] = useState<Settings | null>(null);
  const [units, setUnits] = useState<Units>('kg');
  const [target, setTarget] = useState('');
  const [week, setWeek] = useState<string[]>(Array(7).fill(''));
  const [goal, setGoal] = useState('');
  const [start, setStart] = useState('');
  const [rollover, setRollover] = useState('0');

  useEffect(() => {
    getSettings(db).then((s) => {
      setS(s);
      setUnits(s.units);
      setTarget(str(s.targetDefault));
      setWeek(s.targetByWeekday.map(str));
      setGoal(s.goalKg === null ? '' : String(toDisplay(s.goalKg, s.units)));
      setStart(s.startKg === null ? '' : String(toDisplay(s.startKg, s.units)));
      setRollover(String(s.rolloverHour));
    });
  }, [db]);
  if (!s) return null;

  const switchUnits = (u: Units) => {
    const conv = (v: string) => (num(v) === null ? '' : String(toDisplay(fromDisplay(num(v)!, units), u)));
    setGoal(conv(goal));
    setStart(conv(start));
    setUnits(u);
  };
  const kg = (v: string) => (num(v) === null ? null : fromDisplay(num(v)!, units));
  const save = async () => {
    const targetDefault = num(target);
    const targetByWeekday = week.map(num);
    const changed = targetDefault !== s.targetDefault || targetByWeekday.some((t, i) => t !== s.targetByWeekday[i]);
    // Changing targets resets the "you've lost weight, review your targets" reminder from today's weight.
    const reset = changed || s.targetSetKg === null ? { targetSetKg: currentWeight(await allWeights(db)) } : {};
    await saveSettings(db, {
      units, goalKg: kg(goal), startKg: kg(start), targetDefault, targetByWeekday,
      rolloverHour: Math.min(6, Math.max(0, Math.round(num(rollover) ?? 0))), ...reset,
    });
    bump();
    router.back();
  };
  const run = (f: () => Promise<void>) => f().catch((e: Error) => Alert.alert('Something went wrong', e.message));
  const importFile = () =>
    run(async () => {
      const b = await pickBackup();
      if (!b) return;
      Alert.alert('Import', `${b.entries.length} entries, ${b.foods.length} foods, ${b.weights.length} weights.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Merge', onPress: () => run(async () => { await applyBackup(db, b, 'merge'); bump(); }) },
        { text: 'Replace', style: 'destructive', onPress: () => run(async () => { await applyBackup(db, b, 'replace'); bump(); }) },
      ]);
    });
  const deleteAll = () =>
    Alert.alert('Delete all data?', 'Entries, foods, weights, photos and settings. Export first if you want a copy.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything', style: 'destructive',
        onPress: () => run(async () => { await wipe(db); removeAllPhotoFiles(); bump(); router.back(); }),
      },
    ]);

  return (
    <Screen>
      <H>Targets</H>
      <Field label="Daily target (kcal)" numeric value={target} onChangeText={setTarget} />
      <T muted size={13}>Per-weekday targets override it. Leave blank to use the daily target.</T>
      <Row style={{ flexWrap: 'wrap' }}>
        {WEEK.map((d) => (
          <Field key={d} style={{ width: 84 }} label={DAY[d]} numeric value={week[d]}
            onChangeText={(v) => setWeek((w) => w.map((x, i) => (i === d ? v : x)))} />
        ))}
      </Row>

      <H>Weight</H>
      <Row>{(['kg', 'lb'] as const).map((u) => <Chip key={u} title={u} active={units === u} onPress={() => switchUnits(u)} />)}</Row>
      <Row>
        <Field style={{ flex: 1 }} label={`Start (${units})`} numeric value={start} onChangeText={setStart} />
        <Field style={{ flex: 1 }} label={`Goal (${units})`} numeric value={goal} onChangeText={setGoal} />
      </Row>

      <H>Day</H>
      <Field label="New day starts at (hour, 0 to 6)" numeric value={rollover} onChangeText={setRollover} />

      <Btn title="Save" onPress={save} />

      <H>Your data</H>
      <T muted size={13}>{s.lastExported ? `Last exported ${fmtDay(s.lastExported)}.` : 'Never exported.'} Export is your backup: nothing is backed up anywhere else.</T>
      <Btn kind="plain" title="Export" onPress={() => run(async () => { await exportData(db); bump(); })} />
      <Btn kind="plain" title="Import" onPress={importFile} />
      <Btn kind="danger" title="Delete all data" onPress={deleteAll} />
      {__DEV__ ? (
        <Btn kind="plain" title="Load demo data (dev only)" onPress={() => run(async () => { await seedDemo(db); bump(); router.back(); })} />
      ) : null}

      <H>About</H>
      <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
        <Mark size={56} color={c.gold} />
        <Wordmark size={22} color={c.accent} />
        <T muted size={13}>Version {Constants.expoConfig?.version}</T>
      </Card>
      <Card>
        <T muted size={14}>This app makes no network requests and collects nothing. Your data stays on this phone.</T>
        <T muted size={14}>Calorie counts, trends and goal dates are estimates, not medical advice.</T>
        <T muted size={14}>Privacy and terms: caligula.paxiimus.com</T>
        <T muted size={14}>Open source under the MIT licence.</T>
        <T muted size={14}>Food data: contains public sector information licensed under the Open Government Licence v3.0.</T>
        <T muted size={14}>Fonts: Italiana, Gloock and Instrument Sans, under the SIL Open Font License.</T>
      </Card>
    </Screen>
  );
}
