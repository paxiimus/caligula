// Builds src/data/foods.json ([name, kcal per 100 g][]) from the CoFID spreadsheet.
// Download CoFID from https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid
// Usage: npm run build:food-db -- path/to/CoFID.xlsx
import ExcelJS from 'exceljs';
import { writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run build:food-db -- <CoFID .xlsx>');
  process.exit(1);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const text = (v) =>
  v && typeof v === 'object' ? (v.richText?.map((t) => t.text).join('') ?? v.result ?? v.text ?? '') : (v ?? '');

const foods = new Map();
for (const ws of wb.worksheets) {
  let nameCol, kcalCol, headerRow;
  ws.eachRow((row, r) => {
    if (headerRow) return;
    let n, k;
    row.eachCell((cell, c) => {
      const t = String(text(cell.value)).toLowerCase();
      if (t.includes('food name')) n = c;
      if (t.includes('kcal') && !k) k = c;
    });
    if (n && k) [nameCol, kcalCol, headerRow] = [n, k, r];
  });
  if (!headerRow) continue;
  ws.eachRow((row, r) => {
    if (r <= headerRow) return;
    const name = String(text(row.getCell(nameCol).value)).trim();
    const kcal = Number(text(row.getCell(kcalCol).value));
    if (name && Number.isFinite(kcal) && kcal >= 0 && !foods.has(name)) foods.set(name, Math.round(kcal));
  });
  console.log(`${ws.name}: header row ${headerRow}, name column ${nameCol}, kcal column ${kcalCol}`);
}

const out = [...foods].sort((a, b) => a[0].localeCompare(b[0]));
writeFileSync(new URL('../src/data/foods.json', import.meta.url), JSON.stringify(out));
console.log(`Wrote ${out.length} foods to src/data/foods.json`);
