import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { dumpAll, insertRow, saveSettings, wipe, type Dump } from './db';
import { dayKey } from './logic';

type Backup = Dump & { app: 'caligula'; version: 1; exportedAt: string };

export async function exportData(db: SQLiteDatabase) {
  const today = dayKey(new Date());
  const data: Backup = { app: 'caligula', version: 1, exportedAt: new Date().toISOString(), ...(await dumpAll(db)) };
  const f = new File(Paths.cache, `caligula-${today}.json`);
  if (f.exists) f.delete();
  f.create();
  f.write(JSON.stringify(data));
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'Export Caligula data' });
  await saveSettings(db, { lastExported: today });
}

/** Lets the user pick an export file. Returns null if they cancel; throws if the file is not a Caligula export. */
export async function pickBackup(): Promise<Backup | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (r.canceled) return null;
  const data = JSON.parse(await new File(r.assets[0].uri).text());
  if (data?.app !== 'caligula' || data.version !== 1) throw new Error('That file is not a Caligula export.');
  return data as Backup;
}

/** Replace wipes everything first. Merge adds entries, foods and photos, and overwrites weights on the same day. */
export async function applyBackup(db: SQLiteDatabase, b: Backup, mode: 'merge' | 'replace') {
  await db.withTransactionAsync(async () => {
    if (mode === 'replace') {
      await wipe(db);
      for (const t of ['foods', 'entries', 'weights', 'photos', 'settings'] as const)
        for (const row of b[t]) await insertRow(db, t, row);
      return;
    }
    const foodIds = new Map<unknown, number>();
    for (const { id, ...f } of b.foods) foodIds.set(id, await insertRow(db, 'foods', f));
    for (const { id: _id, ...e } of b.entries)
      await insertRow(db, 'entries', { ...e, food_id: e.food_id == null ? null : foodIds.get(e.food_id) ?? null });
    for (const { id: _id, ...p } of b.photos) await insertRow(db, 'photos', p);
    for (const w of b.weights)
      await db.runAsync(
        'INSERT INTO weights (day, kg, logged_at) VALUES (?, ?, ?) ON CONFLICT(day) DO UPDATE SET kg = excluded.kg',
        w.day as string, w.kg as number, w.logged_at as string,
      );
  });
}
