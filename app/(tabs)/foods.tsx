import { Tabs, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { foodsByRecentUse } from '../../src/db';
import { REF, saveRefFood } from '../../src/foods';
import { fmtKcal, searchRef } from '../../src/logic';
import { useBump, useLive } from '../../src/state';
import { FONTS, useColors } from '../../src/theme';
import { Card, Field, H, Row, Screen, T } from '../../src/ui';

export default function Foods() {
  const c = useColors();
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBump();
  const foods = useLive(foodsByRecentUse);
  const [q, setQ] = useState('');

  const words = q.trim().toLowerCase();
  const mine = (foods ?? []).filter((f) => !words || f.name.toLowerCase().includes(words));
  const names = new Set((foods ?? []).map((f) => f.name.toLowerCase()));
  const refs = searchRef(REF, q).filter(([n]) => !names.has(n.toLowerCase())).slice(0, 20);

  return (
    <Screen>
      <Tabs.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" onPress={() => router.push('/food')} style={{ padding: 12 }}>
              <Text style={{ color: c.accent, fontSize: 16, fontFamily: FONTS.bold }}>New food</Text>
            </Pressable>
          ),
        }}
      />
      <Field value={q} onChangeText={setQ} placeholder="Search your foods and the food database" />

      {foods?.length === 0 && !words ? (
        <T muted style={{ textAlign: 'center', marginTop: 24 }}>
          Foods you log appear here automatically. Search above to add from the food database.
        </T>
      ) : null}
      {words && mine.length ? <H>Your foods</H> : null}
      {mine.map((f) => (
        <Pressable key={f.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/food', params: { id: String(f.id) } })}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ flex: 1 }}>{f.name}</T>
              <T bold>{fmtKcal(f.kcal_per_serving)}</T>
            </Row>
            <T muted size={13}>
              {f.serving_label} · logged {f.uses} {f.uses === 1 ? 'time' : 'times'}
            </T>
          </Card>
        </Pressable>
      ))}

      {refs.length ? <H>Food database · tap to add to your foods</H> : null}
      {refs.map((r) => (
        <Pressable key={r[0]} accessibilityRole="button" accessibilityHint="Adds it to your foods"
          onPress={async () => { await saveRefFood(db, r); bump(); }}>
          <Card style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.line }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ flex: 1 }}>{r[0]}</T>
              <T muted>{fmtKcal(r[1])} / 100 g  +</T>
            </Row>
          </Card>
        </Pressable>
      ))}
      {words && !mine.length && !refs.length ? (
        <T muted>{REF.length ? 'No matches.' : 'No matches. The food database is empty in this build; see the README.'}</T>
      ) : null}
    </Screen>
  );
}
