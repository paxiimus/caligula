import type { SQLiteDatabase } from 'expo-sqlite';
import { defaultSettings, minuteOfDay, type FoodUse, type MealUse, type Settings, type Weight } from './logic';

const MIGRATIONS = [
  `CREATE TABLE entries (
     id INTEGER PRIMARY KEY, day TEXT NOT NULL, logged_at TEXT NOT NULL, kcal INTEGER NOT NULL,
     label TEXT, food_id INTEGER, qty REAL, meal_id TEXT);
   CREATE INDEX entries_day ON entries(day);
   CREATE INDEX entries_food ON entries(food_id);
   CREATE TABLE foods (
     id INTEGER PRIMARY KEY, name TEXT NOT NULL, kcal_per_serving INTEGER NOT NULL,
     serving_label TEXT NOT NULL DEFAULT '1 serving', kcal_per_100g REAL,
     source TEXT NOT NULL DEFAULT 'user', hidden INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE weights (id INTEGER PRIMARY KEY, day TEXT NOT NULL UNIQUE, kg REAL NOT NULL, logged_at TEXT NOT NULL);
   CREATE TABLE photos (id INTEGER PRIMARY KEY, day TEXT NOT NULL, taken_at TEXT NOT NULL, path TEXT NOT NULL, note TEXT);
   CREATE INDEX photos_taken ON photos(taken_at);
   CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
];

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL');
  const v = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  for (let i = v; i < MIGRATIONS.length; i++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[i]);
      await db.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
}

export type Entry = {
  id: number; day: string; logged_at: string; kcal: number;
  label: string | null; food_id: number | null; qty: number | null; meal_id: string | null;
};
export type Food = {
  id: number; name: string; kcal_per_serving: number; serving_label: string;
  kcal_per_100g: number | null; source: 'user' | 'ref'; hidden: number;
};
export type Photo = { id: number; day: string; taken_at: string; path: string; note: string | null };
type WeightRow = Weight & { id: number; logged_at: string };

// ---- settings ----

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const s: Record<string, unknown> = { ...defaultSettings };
  for (const r of await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings'))
    if (r.key in s) s[r.key] = JSON.parse(r.value);
  return s as Settings;
}

export async function saveSettings(db: SQLiteDatabase, patch: Partial<Settings>) {
  for (const [k, v] of Object.entries(patch))
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      k, JSON.stringify(v ?? null),
    );
}

// ---- entries ----

export const entriesForDay = (db: SQLiteDatabase, day: string) =>
  db.getAllAsync<Entry>('SELECT * FROM entries WHERE day = ? ORDER BY logged_at, id', day);

export const getEntry = (db: SQLiteDatabase, id: number) =>
  db.getFirstAsync<Entry>('SELECT * FROM entries WHERE id = ?', id);

export type NewItem = { kcal: number; label: string | null; foodId: number | null; qty: number | null };

export async function addEntries(db: SQLiteDatabase, day: string, items: NewItem[], at = new Date().toISOString()) {
  const meal = items.filter((i) => i.foodId).length > 1 ? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : null;
  for (const i of items)
    await db.runAsync(
      'INSERT INTO entries (day, logged_at, kcal, label, food_id, qty, meal_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      day, at, Math.round(i.kcal), i.label, i.foodId, i.qty, i.foodId ? meal : null,
    );
}

export const updateEntry = (db: SQLiteDatabase, id: number, kcal: number, label: string | null) =>
  db.runAsync('UPDATE entries SET kcal = ?, label = ? WHERE id = ?', Math.round(kcal), label, id);

export const deleteEntry = (db: SQLiteDatabase, id: number) => db.runAsync('DELETE FROM entries WHERE id = ?', id);

export const restoreEntry = (db: SQLiteDatabase, e: Entry) => insertRow(db, 'entries', e);

export const dayTotals = (db: SQLiteDatabase, from: string, to: string) =>
  db.getAllAsync<{ day: string; kcal: number }>(
    'SELECT day, SUM(kcal) AS kcal FROM entries WHERE day BETWEEN ? AND ? GROUP BY day', from, to,
  );

export const foodUses = (db: SQLiteDatabase, since: string) =>
  db.getAllAsync<FoodUse>('SELECT food_id AS foodId, day FROM entries WHERE food_id IS NOT NULL AND day >= ?', since);

export async function mealUses(db: SQLiteDatabase, since: string): Promise<MealUse[]> {
  const rows = await db.getAllAsync<Entry>(
    'SELECT * FROM entries WHERE meal_id IS NOT NULL AND food_id IS NOT NULL AND day >= ? ORDER BY meal_id', since,
  );
  const meals = new Map<string, MealUse>();
  for (const r of rows) {
    const m: MealUse = meals.get(r.meal_id!) ?? { mealId: r.meal_id!, day: r.day, minute: minuteOfDay(r.logged_at), items: [] };
    m.items.push({ foodId: r.food_id!, kcal: r.kcal });
    meals.set(r.meal_id!, m);
  }
  return [...meals.values()];
}

// ---- foods ----

export const allFoods = (db: SQLiteDatabase) =>
  db.getAllAsync<Food>('SELECT * FROM foods WHERE hidden = 0 ORDER BY name');

export const foodsByRecentUse = (db: SQLiteDatabase) =>
  db.getAllAsync<Food & { uses: number; last: string | null }>(
    `SELECT f.*, COUNT(e.id) AS uses, MAX(e.day) AS last FROM foods f
     LEFT JOIN entries e ON e.food_id = f.id WHERE f.hidden = 0
     GROUP BY f.id ORDER BY last IS NULL, last DESC, f.name`,
  );

export const getFood = (db: SQLiteDatabase, id: number) => db.getFirstAsync<Food>('SELECT * FROM foods WHERE id = ?', id);

export async function saveFood(db: SQLiteDatabase, f: Omit<Food, 'id' | 'hidden'> & { id?: number }) {
  if (f.id) {
    await db.runAsync(
      'UPDATE foods SET name = ?, kcal_per_serving = ?, serving_label = ? WHERE id = ?',
      f.name, Math.round(f.kcal_per_serving), f.serving_label, f.id,
    );
    return f.id;
  }
  const r = await db.runAsync(
    'INSERT INTO foods (name, kcal_per_serving, serving_label, kcal_per_100g, source) VALUES (?, ?, ?, ?, ?)',
    f.name, Math.round(f.kcal_per_serving), f.serving_label, f.kcal_per_100g, f.source,
  );
  return r.lastInsertRowId;
}

export const hideFood = (db: SQLiteDatabase, id: number) => db.runAsync('UPDATE foods SET hidden = 1 WHERE id = ?', id);

export async function deleteFood(db: SQLiteDatabase, id: number) {
  // Past entries keep their kcal and label; they just lose the link.
  await db.runAsync('UPDATE entries SET food_id = NULL WHERE food_id = ?', id);
  await db.runAsync('DELETE FROM foods WHERE id = ?', id);
}

// ---- weights ----

export const allWeights = (db: SQLiteDatabase) =>
  db.getAllAsync<WeightRow>('SELECT * FROM weights ORDER BY day');

export const setWeight = (db: SQLiteDatabase, day: string, kg: number) =>
  db.runAsync(
    'INSERT INTO weights (day, kg, logged_at) VALUES (?, ?, ?) ON CONFLICT(day) DO UPDATE SET kg = excluded.kg, logged_at = excluded.logged_at',
    day, kg, new Date().toISOString(),
  );

export const deleteWeight = (db: SQLiteDatabase, day: string) => db.runAsync('DELETE FROM weights WHERE day = ?', day);

// ---- photos ----

export const allPhotos = (db: SQLiteDatabase) => db.getAllAsync<Photo>('SELECT * FROM photos ORDER BY taken_at');

export const addPhoto = (db: SQLiteDatabase, day: string, path: string) =>
  db.runAsync('INSERT INTO photos (day, taken_at, path) VALUES (?, ?, ?)', day, new Date().toISOString(), path);

export const deletePhotoRow = (db: SQLiteDatabase, id: number) => db.runAsync('DELETE FROM photos WHERE id = ?', id);

// ---- whole database ----

const TABLES = ['entries', 'foods', 'weights', 'photos', 'settings'] as const;
export type Dump = Record<(typeof TABLES)[number], Record<string, unknown>[]>;

export async function dumpAll(db: SQLiteDatabase): Promise<Dump> {
  const out = {} as Dump;
  for (const t of TABLES) out[t] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${t}`);
  return out;
}

export async function wipe(db: SQLiteDatabase) {
  await db.execAsync(TABLES.map((t) => `DELETE FROM ${t};`).join('\n'));
}

export async function insertRow(db: SQLiteDatabase, table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  const r = await db.runAsync(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    cols.map((c) => row[c] as string | number | null),
  );
  return r.lastInsertRowId;
}
