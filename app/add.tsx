import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  addEntries, allFoods, entriesForDay, foodUses, getEntry, getSettings, mealUses, updateEntry,
  type Food, type NewItem,
} from '../src/db';
import { REF, saveRefFood } from '../src/foods';
import {
  addDays, dayKey, fmtKcal, frequentFoods, minuteOfDay, searchRef, suggestMeals, targetFor, type RefFood,
} from '../src/logic';
import { dayAtom, useBump, useLive } from '../src/state';
import { useColors } from '../src/theme';
import { Btn, Card, Chip, Field, H, num, Row, Screen, T } from '../src/ui';

type CartItem = { foodId: number; name: string; kcal: number; qty: number }; // kcal per serving

export default function Add() {
  const c = useColors();
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBump();
  const { entry } = useLocalSearchParams<{ entry?: string }>();
  const editing = entry ? Number(entry) : null;
  const picked = useAtomValue(dayAtom);
  const settings = useLive(getSettings);
  const today = dayKey(new Date(), settings?.rolloverHour ?? 0);
  const day = picked ?? today;

  const [kcal, setKcal] = useState('');
  const [label, setLabel] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [q, setQ] = useState('');
  const [ref, setRef] = useState<RefFood | null>(null);
  const [grams, setGrams] = useState('100');

  useEffect(() => {
    if (editing)
      getEntry(db, editing).then((e) => {
        if (e) {
          setKcal(String(e.kcal));
          setLabel(e.label ?? '');
        }
      });
  }, [db, editing]);

  const data = useLive(
    async (db) => {
      const [foods, uses, meals, eaten] = await Promise.all([
        allFoods(db), foodUses(db, addDays(today, -60)), mealUses(db, addDays(today, -90)), entriesForDay(db, day),
      ]);
      return { foods, uses, meals, eaten: eaten.reduce((t, e) => t + e.kcal, 0) };
    },
    [today, day],
  );
  const byId = useMemo(() => new Map((data?.foods ?? []).map((f) => [f.id, f])), [data]);

  const typed = num(kcal) ?? 0;
  const cartKcal = cart.reduce((t, i) => t + i.kcal * i.qty, 0);
  const total = Math.round(cartKcal + typed);
  const target = settings ? targetFor(day, settings) : null;
  const remaining = target === null ? Infinity : target - (data?.eaten ?? 0) - total;

  const frequent = data
    ? frequentFoods(data.uses, today).map((id) => byId.get(id)).filter((f): f is Food => !!f)
    : [];
  const meals = data ? suggestMeals(data.meals, today, minuteOfDay(new Date().toISOString()), remaining) : [];
  const singles = meals.length || remaining === Infinity ? [] : frequent.filter((f) => f.kcal_per_serving <= remaining * 1.1).slice(0, 3);

  const words = q.trim().toLowerCase();
  const own = words ? (data?.foods ?? []).filter((f) => f.name.toLowerCase().includes(words)).slice(0, 8) : [];
  const ownNames = new Set(own.map((f) => f.name.toLowerCase()));
  const refs = searchRef(REF, q).filter(([n]) => !ownNames.has(n.toLowerCase())).slice(0, 12);

  const add = (f: Food, qty = 1) =>
    setCart((cart) => {
      const hit = cart.find((i) => i.foodId === f.id);
      return hit
        ? cart.map((i) => (i === hit ? { ...i, qty: i.qty + qty } : i))
        : [...cart, { foodId: f.id, name: f.name, kcal: f.kcal_per_serving, qty }];
    });

  const addRef = async () => {
    if (!ref) return;
    const g = num(grams) ?? 100;
    const existing = data?.foods.find((f) => f.name === ref[0]);
    const id = existing?.id ?? (await saveRefFood(db, ref));
    setCart((cart) => [...cart, { foodId: id, name: ref[0], kcal: ref[1], qty: g / 100 }]);
    setRef(null);
    setQ('');
    bump();
  };

  const submit = async () => {
    if (editing) {
      if (typed > 0) await updateEntry(db, editing, typed, label.trim() || null);
    } else {
      const items: NewItem[] = cart.map((i) => ({ kcal: i.kcal * i.qty, label: i.name, foodId: i.foodId, qty: i.qty }));
      if (typed > 0) items.push({ kcal: typed, label: label.trim() || null, foodId: null, qty: null });
      if (!items.length) return;
      await addEntries(db, day, items);
    }
    bump();
    router.back();
  };

  return (
    <Screen>
      <Field big autoFocus numeric value={kcal} onChangeText={setKcal} placeholder="kcal" />
      <Field value={label} onChangeText={setLabel} placeholder="Label (optional)" />
      <Btn
        title={editing ? 'Save' : total > 0 ? `Add ${fmtKcal(total)} kcal` : 'Add'}
        onPress={submit}
        disabled={editing ? typed <= 0 : total <= 0}
      />
      {target !== null && !editing ? (
        <T muted size={14} style={{ textAlign: 'center' }}>
          {remaining >= 0 ? `${fmtKcal(remaining)} kcal left after this` : `${fmtKcal(-remaining)} kcal over after this`}
        </T>
      ) : null}

      {editing ? null : (
        <>
          {cart.length ? (
            <Card>
              {cart.map((i) => (
                <Pressable key={i.foodId} accessibilityRole="button" accessibilityHint="Removes the item"
                  onPress={() => setCart((cart) => cart.filter((x) => x !== i))}>
                  <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                    <T>{i.name}{i.qty !== 1 ? ` ×${Math.round(i.qty * 100) / 100}` : ''}</T>
                    <T muted>{fmtKcal(i.kcal * i.qty)} ✕</T>
                  </Row>
                </Pressable>
              ))}
            </Card>
          ) : null}

          {meals.length || singles.length ? (
            <>
              <H>{target === null ? 'Usual at this time' : 'Fits what you have left'}</H>
              <Row style={{ flexWrap: 'wrap' }}>
                {meals.map((m) => (
                  <Chip
                    key={m.foodIds.join()}
                    title={`${m.foodIds.map((id) => byId.get(id)?.name ?? '?').join(' + ')} · ${fmtKcal(m.kcal)}`}
                    onPress={() => m.foodIds.forEach((id) => byId.get(id) && add(byId.get(id)!))}
                  />
                ))}
                {singles.map((f) => <Chip key={f.id} title={`${f.name} · ${fmtKcal(f.kcal_per_serving)}`} onPress={() => add(f)} />)}
              </Row>
            </>
          ) : null}

          {frequent.length ? (
            <>
              <H>Frequent</H>
              <Row style={{ flexWrap: 'wrap' }}>
                {frequent.map((f) => {
                  const inCart = cart.find((i) => i.foodId === f.id);
                  return (
                    <Chip key={f.id} active={!!inCart} onPress={() => add(f)}
                      title={`${f.name} · ${fmtKcal(f.kcal_per_serving)}${inCart ? ` ×${inCart.qty}` : ''}`} />
                  );
                })}
              </Row>
            </>
          ) : null}

          <H>Search</H>
          <Field value={q} onChangeText={(v) => { setQ(v); setRef(null); }} placeholder="Search foods" />
          {ref ? (
            <Card>
              <T bold>{ref[0]}</T>
              <Row>
                <Field style={{ flex: 1 }} numeric value={grams} onChangeText={setGrams} label="Grams" />
                <T style={{ marginTop: 18 }}>{fmtKcal((ref[1] * (num(grams) ?? 0)) / 100)} kcal</T>
              </Row>
              <Btn title="Add to meal" onPress={addRef} />
            </Card>
          ) : (
            <View style={{ gap: 6 }}>
              {own.map((f) => (
                <Pressable key={`f${f.id}`} onPress={() => add(f)} accessibilityRole="button">
                  <Card style={{ paddingVertical: 10 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <T style={{ flex: 1 }}>{f.name}</T>
                      <T muted>{fmtKcal(f.kcal_per_serving)} / {f.serving_label}</T>
                    </Row>
                  </Card>
                </Pressable>
              ))}
              {refs.map((r) => (
                <Pressable key={`r${r[0]}`} onPress={() => setRef(r)} accessibilityRole="button">
                  <Card style={{ paddingVertical: 10, backgroundColor: c.bg, borderWidth: 1, borderColor: c.line }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <T style={{ flex: 1 }}>{r[0]}</T>
                      <T muted>{fmtKcal(r[1])} / 100 g</T>
                    </Row>
                  </Card>
                </Pressable>
              ))}
              {words && !own.length && !refs.length ? <T muted>No matches.</T> : null}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
