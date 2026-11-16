import type { SQLiteDatabase } from 'expo-sqlite';
import { addEntries, saveFood, saveSettings, setWeight, wipe } from './db';
import { addDays, dayKey, parseDay } from './logic';

/** Development only: 60 days of plausible history so Trends and suggestions have something to show. */
export async function seedDemo(db: SQLiteDatabase) {
  let s = 42;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  await wipe(db);
  const food = (name: string, kcal: number) =>
    saveFood(db, { name, kcal_per_serving: kcal, serving_label: '1 serving', kcal_per_100g: null, source: 'user' });
  const [porridge, banana, coffee, wrap, rice, shake, apple] = await Promise.all([
    food('Porridge', 300), food('Banana', 105), food('Coffee with milk', 40), food('Chicken wrap', 520),
    food('Chicken and rice', 650), food('Protein shake', 160), food('Apple', 80),
  ]);
  const today = dayKey(new Date());
  for (let i = 59; i >= 0; i--) {
    const day = addDays(today, -i);
    const at = (h: number) => {
      const d = parseDay(day);
      d.setHours(h, Math.floor(rand() * 40));
      return d.toISOString();
    };
    const item = (foodId: number, kcal: number, label: string) => ({ kcal, label, foodId, qty: 1 });
    await addEntries(db, day, [item(porridge, 300, 'Porridge'), item(banana, 105, 'Banana'), item(coffee, 40, 'Coffee with milk')], at(7));
    await addEntries(db, day, [rand() < 0.5 ? item(wrap, 520, 'Chicken wrap') : item(rice, 650, 'Chicken and rice')], at(12));
    await addEntries(db, day, [item(shake, 160, 'Protein shake'), item(apple, 80, 'Apple')], at(16));
    await addEntries(db, day, [{ kcal: 650 + Math.round(rand() * 400), label: 'Dinner', foodId: null, qty: null }], at(19));
    if (rand() < 0.8) await setWeight(db, day, Math.round((100 - (59 - i) * 0.07 + (rand() - 0.5) * 0.8) * 10) / 10);
  }
  await saveSettings(db, {
    onboarded: true, startKg: 100, goalKg: 85, targetSetKg: 100, targetDefault: 2400,
    targetByWeekday: [2000, 2700, 2700, 2000, 2700, 2700, 2000],
  });
}
