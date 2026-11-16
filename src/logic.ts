// Pure, deterministic logic. No React, no database: everything here is unit-tested.

export type Units = 'kg' | 'lb';

export type Settings = {
  units: Units;
  goalKg: number | null;
  startKg: number | null;
  targetDefault: number | null;
  targetByWeekday: (number | null)[]; // index 0 = Sunday
  rolloverHour: number;
  onboarded: boolean;
  lastExported: string | null;
  /** Trend weight when the calorie targets were last set or confirmed. */
  targetSetKg: number | null;
};

export const defaultSettings: Settings = {
  units: 'kg',
  goalKg: null,
  startKg: null,
  targetDefault: null,
  targetByWeekday: [null, null, null, null, null, null, null],
  rolloverHour: 0,
  onboarded: false,
  lastExported: null,
  targetSetKg: null,
};

// ---- days ----

const pad = (n: number) => String(n).padStart(2, '0');

export const dayKey = (d: Date, rolloverHour = 0) => {
  const t = new Date(d.getTime() - rolloverHour * 3600e3);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
};

export const parseDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (day: string, n: number) => {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

export const daysBetween = (from: string, to: string) =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 864e5);

export const weekStart = (day: string) => addDays(day, -((parseDay(day).getDay() + 6) % 7)); // Monday

export const minuteOfDay = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

// ---- targets ----

export const targetFor = (day: string, s: Settings) =>
  s.targetByWeekday[parseDay(day).getDay()] ?? s.targetDefault;

// ---- frequent foods ----

export type FoodUse = { foodId: number; day: string };

export function frequentFoods(uses: FoodUse[], today: string, limit = 12): number[] {
  const score = new Map<number, number>();
  for (const u of uses) {
    const age = daysBetween(u.day, today);
    if (age < 0 || age > 60) continue;
    score.set(u.foodId, (score.get(u.foodId) ?? 0) + Math.exp(-age / 30));
  }
  return [...score].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
}

// ---- usual meals ----

export type MealItem = { foodId: number; kcal: number };
export type MealUse = { mealId: string; day: string; minute: number; items: MealItem[] };
export type Suggestion = { foodIds: number[]; kcal: number; count: number };

const circularGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
};

export function suggestMeals(
  meals: MealUse[],
  today: string,
  nowMinute: number,
  remaining: number,
  limit = 3,
): Suggestion[] {
  const groups = new Map<string, { foodIds: number[]; kcal: number; count: number; last: string }>();
  for (const m of meals) {
    const age = daysBetween(m.day, today);
    if (m.items.length < 2 || age < 0 || age > 90 || circularGap(m.minute, nowMinute) > 120) continue;
    const foodIds = m.items.map((i) => i.foodId).sort((a, b) => a - b);
    const key = foodIds.join(',');
    const kcal = m.items.reduce((t, i) => t + i.kcal, 0);
    const g = groups.get(key);
    if (!g) groups.set(key, { foodIds, kcal, count: 1, last: m.day });
    else {
      g.count++;
      if (m.day >= g.last) Object.assign(g, { last: m.day, kcal });
    }
  }
  return [...groups.values()]
    .filter((g) => g.kcal <= remaining * 1.1)
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, limit)
    .map(({ foodIds, kcal, count }) => ({ foodIds, kcal, count }));
}

// ---- reference food search ----

export type RefFood = [name: string, kcalPer100g: number];

/** Every search word must appear in the name; names starting with the first word rank first, then shorter names. */
export function searchRef(list: RefFood[], q: string, limit = 20): RefFood[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const starts = (n: string) => (n.toLowerCase().startsWith(words[0]) ? 0 : 1);
  return list
    .filter(([n]) => words.every((w) => n.toLowerCase().includes(w)))
    .sort((a, b) => starts(a[0]) - starts(b[0]) || a[0].length - b[0].length)
    .slice(0, limit);
}

// ---- weight ----

export type Weight = { day: string; kg: number };
export type TrendPoint = { day: string; kg: number | null };

export function trend(weights: Weight[]): TrendPoint[] {
  const sorted = [...weights].sort((a, b) => a.day.localeCompare(b.day));
  return sorted.map((w) => {
    const window = sorted.filter((x) => {
      const age = daysBetween(x.day, w.day);
      return age >= 0 && age < 7;
    });
    return { day: w.day, kg: window.length >= 3 ? window.reduce((t, x) => t + x.kg, 0) / window.length : null };
  });
}

/** kg per week, least squares over the last 14 days of trend. Null until there is enough data. */
export function rate(weights: Weight[], today: string): number | null {
  if (!weights.length) return null;
  const first = weights.reduce((a, b) => (a.day < b.day ? a : b)).day;
  if (daysBetween(first, today) < 14) return null;
  const pts = trend(weights).filter((p) => p.kg !== null && daysBetween(p.day, today) < 14);
  if (pts.length < 5) return null;
  const xs = pts.map((p) => -daysBetween(p.day, today));
  const ys = pts.map((p) => p.kg as number);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const den = xs.reduce((t, x) => t + (x - mx) ** 2, 0);
  if (!den) return null;
  const slope = xs.reduce((t, x, i) => t + (x - mx) * (ys[i] - my), 0) / den;
  return slope * 7;
}

export type Projection = { day: string } | 'reached' | 'far' | null;

export function projection(currentKg: number, goalKg: number, kgPerWeek: number | null, today: string): Projection {
  if (Math.abs(currentKg - goalKg) < 0.05) return 'reached';
  if (!kgPerWeek) return null;
  const weeks = (goalKg - currentKg) / kgPerWeek;
  if (!(weeks > 0)) return null; // moving away from the goal
  if (weeks > 104) return 'far';
  return { day: addDays(today, Math.round(weeks * 7)) };
}

/** Latest 7-day trend weight, or the latest raw weight before there is a trend. */
export function currentWeight(weights: Weight[]): number | null {
  const t = trend(weights).reverse().find((p) => p.kg !== null);
  return t?.kg ?? [...weights].sort((a, b) => a.day.localeCompare(b.day)).at(-1)?.kg ?? null;
}

/**
 * Prompt a target review once weight is down 2 kg or 2% (whichever is more) since targets were set.
 * Daily burn falls by roughly 22 kcal per kg lost, so the estimate is rounded to the nearest 10.
 */
export function targetReview(targetSetKg: number | null, currentKg: number | null) {
  if (targetSetKg === null || currentKg === null) return null;
  const lostKg = targetSetKg - currentKg;
  if (lostKg < Math.max(2, targetSetKg * 0.02)) return null;
  return { lostKg, kcal: Math.round((lostKg * 22) / 10) * 10 };
}

export function progress(startKg: number, currentKg: number, goalKg: number) {
  if (startKg === goalKg) return 1;
  return Math.min(1, Math.max(0, (startKg - currentKg) / (startKg - goalKg)));
}

// ---- units ----

const LB = 2.20462;
export const toDisplay = (kg: number, u: Units) => Math.round((u === 'lb' ? kg * LB : kg) * 10) / 10;
export const fromDisplay = (v: number, u: Units) => (u === 'lb' ? v / LB : v);

// ---- formatting ----

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const fmtDay = (day: string) => {
  const d = parseDay(day);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const fmtMonth = (day: string) => {
  const d = parseDay(day);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtKcal = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
