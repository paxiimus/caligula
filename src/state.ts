import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/** Bumped after every write so every live query re-runs. */
export const refreshAtom = atom(0);
/** The day shown on Today and logged to by Add. null means today. */
export const dayAtom = atom<string | null>(null);

export function useBump() {
  const set = useSetAtom(refreshAtom);
  return () => set((n) => n + 1);
}

export function useLive<T>(load: (db: SQLiteDatabase) => Promise<T>, deps: unknown[] = []) {
  const db = useSQLiteContext();
  const n = useAtomValue(refreshAtom);
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let live = true;
    load(db).then((v) => {
      if (live) setValue(v);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, n, ...deps]);
  return value;
}
