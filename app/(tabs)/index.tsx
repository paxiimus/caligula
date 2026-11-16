import { Redirect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { allWeights, deleteEntry, entriesForDay, getSettings, restoreEntry, saveSettings, type Entry } from '../../src/db';
import {
  addDays, currentWeight, dayKey, fmtDay, fmtKcal, fmtTime, targetFor, targetReview, toDisplay,
} from '../../src/logic';
import { QuickAdd } from '../../src/quick-add';
import { dayAtom, useBump, useLive } from '../../src/state';
import { FONTS, useColors } from '../../src/theme';
import { Bar, Big, Btn, Card, Row, T } from '../../src/ui';

export default function Today() {
  const c = useColors();
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBump();
  const [picked, setPicked] = useAtom(dayAtom);
  const settings = useLive(getSettings);
  const weights = useLive(allWeights);
  const today = dayKey(new Date(), settings?.rolloverHour ?? 0);
  const day = picked ?? today;
  const entries = useLive((db) => entriesForDay(db, day), [day]);
  const [quick, setQuick] = useState(false);
  const [undo, setUndo] = useState<Entry | null>(null);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);

  if (!settings) return null;
  if (!settings.onboarded) return <Redirect href="/welcome" />;

  const total = (entries ?? []).reduce((t, e) => t + e.kcal, 0);
  const target = targetFor(day, settings);
  const hasTargets = settings.targetDefault !== null || settings.targetByWeekday.some((t) => t !== null);
  const current = weights ? currentWeight(weights) : null;
  const review = hasTargets && day === today ? targetReview(settings.targetSetKg, current) : null;
  const u = settings.units;

  const go = (n: number) => {
    const d = addDays(day, n);
    setPicked(d >= today ? null : d);
  };
  const remove = async (e: Entry) => {
    await deleteEntry(db, e.id);
    setUndo(e);
    bump();
  };
  const options = (e: Entry) =>
    Alert.alert(e.label ?? `${e.kcal} kcal`, undefined, [
      { text: 'Edit', onPress: () => router.push({ pathname: '/add', params: { entry: String(e.id) } }) },
      { text: 'Delete', style: 'destructive', onPress: () => remove(e) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 140 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Btn kind="plain" title="‹ Prev" onPress={() => go(-1)} />
          <Pressable accessibilityRole="button" accessibilityLabel="Back to today" onPress={() => setPicked(null)}>
            <T bold size={17}>{day === today ? 'Today' : fmtDay(day)}</T>
          </Pressable>
          <Btn kind="plain" title="Next ›" onPress={() => go(1)} disabled={day >= today} />
        </Row>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${total} kilocalories eaten. Tap to add.`}
          onPress={() => setQuick(true)}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Card style={{ alignItems: 'center', paddingVertical: 26, gap: 8 }}>
            <Big size={68} style={{ lineHeight: 78 }}>{fmtKcal(total)}</Big>
            <T muted>
              {target
                ? `of ${fmtKcal(target)} kcal · ${total <= target ? `${fmtKcal(target - total)} left` : `${fmtKcal(total - target)} over`}`
                : 'kcal'}
            </T>
            {target ? <Bar value={total / target} color={total > target ? c.muted : c.gold} /> : null}
            <T bold size={13} style={{ color: c.accent, letterSpacing: 0.6 }}>TAP TO ADD</T>
          </Card>
        </Pressable>

        {review && current !== null ? (
          <Card style={{ borderLeftWidth: 4, borderLeftColor: c.gold }}>
            <T bold>Down {toDisplay(review.lostKg, u)} {u} since you set your targets</T>
            <T muted size={14}>
              Your body burns less as you get lighter, roughly {review.kcal} kcal a day less by now. Lowering your targets keeps
              the loss going at the same pace.
            </T>
            <Row>
              <Btn kind="plain" title="Keep for now" style={{ flex: 1 }}
                onPress={async () => { await saveSettings(db, { targetSetKg: current }); bump(); }} />
              <Btn title="Review targets" style={{ flex: 1 }} onPress={() => router.push('/settings')} />
            </Row>
          </Card>
        ) : null}

        {entries?.map((e) => (
          <Pressable key={e.id} onPress={() => options(e)} accessibilityRole="button">
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <T>{e.label ?? 'Quick add'}</T>
                  <T muted size={13}>
                    {fmtTime(e.logged_at)}
                    {e.qty && e.qty !== 1 ? ` · ×${Math.round(e.qty * 100) / 100}` : ''}
                  </T>
                </View>
                <Big size={22}>{fmtKcal(e.kcal)}</Big>
              </Row>
            </Card>
          </Pressable>
        ))}
        {entries?.length === 0 ? <T muted style={{ textAlign: 'center', marginTop: 24 }}>Nothing logged yet.</T> : null}
      </ScrollView>

      {undo ? (
        <View style={{ position: 'absolute', left: 16, right: 100, bottom: 28, backgroundColor: c.text, borderRadius: 12, padding: 6, paddingLeft: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: c.bg, fontFamily: FONTS.body }}>Entry deleted</Text>
            <Pressable
              accessibilityRole="button"
              style={{ padding: 10 }}
              onPress={async () => {
                await restoreEntry(db, undo);
                setUndo(null);
                bump();
              }}
            >
              <Text style={{ color: c.bg, fontFamily: FONTS.bold }}>UNDO</Text>
            </Pressable>
          </Row>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add foods"
        onPress={() => router.push('/add')}
        style={{
          position: 'absolute', right: 20, bottom: 24, width: 64, height: 64, borderRadius: 32,
          backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', elevation: 4,
        }}
      >
        <Text style={{ color: c.accentText, fontSize: 36, lineHeight: 40, fontFamily: FONTS.body }}>+</Text>
      </Pressable>

      <QuickAdd visible={quick} day={day} onClose={() => setQuick(false)} />
    </View>
  );
}
