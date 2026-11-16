import type { SQLiteDatabase } from 'expo-sqlite';
import REF_JSON from './data/foods.json';
import { saveFood } from './db';
import type { RefFood } from './logic';

/** Offline reference foods: [name, kcal per 100 g]. Built by scripts/build-food-db.mjs. */
export const REF = REF_JSON as unknown as RefFood[];

/** Copies a reference food into the user's library with a 100 g serving. */
export const saveRefFood = (db: SQLiteDatabase, [name, kcal]: RefFood) =>
  saveFood(db, { name, kcal_per_serving: kcal, serving_label: '100 g', kcal_per_100g: kcal, source: 'ref' });
