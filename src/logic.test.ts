import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, currentWeight, dayKey, daysBetween, defaultSettings, frequentFoods, progress, projection, targetReview,
  rate, searchRef, suggestMeals, targetFor, toDisplay, fromDisplay, trend, weekStart, type Weight,
} from './logic';

test('searchRef matches every word and ranks prefix matches first', () => {
  const list: [string, number][] = [['Oats, porridge, made with milk', 116], ['Porridge, made with water', 46], ['Rice, white', 130]];
  assert.deepEqual(searchRef(list, 'porridge').map((f) => f[0]), ['Porridge, made with water', 'Oats, porridge, made with milk']);
  assert.deepEqual(searchRef(list, 'porridge milk').map((f) => f[0]), ['Oats, porridge, made with milk']);
  assert.deepEqual(searchRef(list, '  '), []);
});

test('dayKey honours the rollover hour', () => {
  const lateNight = new Date(2026, 10, 17, 2, 30);
  assert.equal(dayKey(lateNight), '2026-11-17');
  assert.equal(dayKey(lateNight, 4), '2026-11-16');
});

test('day arithmetic', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2); // across the UK clock change
  assert.equal(weekStart('2026-11-22'), '2026-11-16'); // Sunday -> Monday
});

test('targetFor prefers the weekday override', () => {
  const s = { ...defaultSettings, targetDefault: 2000, targetByWeekday: [null, 2700, null, null, null, null, null] };
  assert.equal(targetFor('2026-11-16', s), 2700); // Monday
  assert.equal(targetFor('2026-11-17', s), 2000);
});

test('frequentFoods ranks recent use above old use', () => {
  const uses = [
    { foodId: 1, day: '2026-09-20' }, { foodId: 1, day: '2026-09-21' }, { foodId: 1, day: '2026-09-22' },
    { foodId: 2, day: '2026-11-15' }, { foodId: 2, day: '2026-11-16' },
    { foodId: 3, day: '2025-01-01' },
  ];
  assert.deepEqual(frequentFoods(uses, '2026-11-16'), [2, 1]);
});

test('suggestMeals counts usual meals near this time that fit', () => {
  const meal = (day: string, minute: number, ids: number[], kcal = 200) => ({
    mealId: day + minute, day, minute, items: ids.map((foodId) => ({ foodId, kcal })),
  });
  const meals = [
    meal('2026-11-10', 480, [1, 2]), meal('2026-11-11', 490, [2, 1]), meal('2026-11-12', 470, [1, 2]),
    meal('2026-11-12', 485, [3, 4], 500), // 1000 kcal: too big
    meal('2026-11-13', 1140, [5, 6]), // dinner: wrong time
    meal('2026-11-14', 480, [7]), // single item: not a meal
  ];
  const s = suggestMeals(meals, '2026-11-16', 500, 600);
  assert.deepEqual(s, [{ foodIds: [1, 2], kcal: 400, count: 3 }]);
});

const series = (start: string, days: number, from: number, perDay: number): Weight[] =>
  Array.from({ length: days }, (_, i) => ({ day: addDays(start, i), kg: from + perDay * i }));

test('trend needs three weights in the window', () => {
  const t = trend(series('2026-11-01', 4, 100, -0.1));
  assert.equal(t[1].kg, null);
  assert.ok(Math.abs((t[2].kg ?? 0) - 99.9) < 1e-9);
});

test('rate and projection on a steady loss', () => {
  const w = series('2026-10-27', 21, 100, -0.1); // 0.7 kg a week
  const today = '2026-11-16';
  const r = rate(w, today);
  assert.ok(r !== null && Math.abs(r + 0.7) < 1e-9);
  assert.deepEqual(projection(98, 91, r, today), { day: addDays(today, 70) });
  assert.equal(projection(98, 99, r, today), null); // moving away from a gain goal
  assert.equal(projection(98, 20, r, today), 'far');
  assert.equal(rate(w.slice(-10), today), null); // under 14 days of data
});

test('currentWeight prefers the trend, then the latest raw weight', () => {
  assert.equal(currentWeight([]), null);
  assert.equal(currentWeight([{ day: '2026-11-02', kg: 99 }, { day: '2026-11-01', kg: 100 }]), 99);
  assert.ok(Math.abs((currentWeight(series('2026-11-01', 5, 100, -0.3)) ?? 0) - 99.4) < 1e-9); // mean of the 5
});

test('targetReview fires after 2 kg or 2% of loss', () => {
  assert.equal(targetReview(null, 95), null);
  assert.equal(targetReview(100, 98.5), null);
  assert.equal(targetReview(80, 78.4), null); // 1.6 kg is under the 2 kg floor
  assert.deepEqual(targetReview(100, 97.5), { lostKg: 2.5, kcal: 60 });
  assert.equal(targetReview(150, 147.5), null); // 2% of 150 kg is 3 kg
  assert.equal(targetReview(100, 102), null); // gains never prompt
});

test('progress and units', () => {
  assert.equal(progress(100, 95, 85), 1 / 3);
  assert.equal(progress(100, 101, 85), 0);
  assert.equal(toDisplay(100, 'lb'), 220.5);
  assert.ok(Math.abs(fromDisplay(220.462, 'lb') - 100) < 1e-9);
});
