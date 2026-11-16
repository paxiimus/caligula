# Caligula spec (version 1)

Caligula is an offline, open-source calorie tracker. You tap plus, type a number and see the day's total. Nothing leaves the phone.

## Screens

| Screen | What it does |
| --- | --- |
| Today | Total against the day's target, with "left" or "over" in a neutral colour and a progress bar. **Tap the number** for quick add: a sheet with the keypad up, an optional label and label chips, without leaving the screen. Previous and next day. Tap an entry to edit or delete it, with undo. The plus button opens the full Add screen. A card prompts a target review once weight is down 2 kg or 2% since targets were set. |
| Add | The kcal field is focused with the number pad up. Optional label. A cart of foods. Suggestions that fit the remaining calories. Frequent foods. Search over your foods and the offline reference list; reference foods ask for grams. |
| Foods | Your library, sorted by recent use and filled automatically from logging. A search box covers your foods and the offline food database; tapping a database food adds it to your library. Add, edit, hide, delete. |
| Trends | Leads with the **estimated goal date** (month and year, weeks to go, progress bar). Then 7, 30 or 90 days: calorie bars with the target line, weight dots, 7-day trend, goal line, change and rate. |
| Weight | Log today's weight. Tap history to delete. |
| Photos | Weekly grid with empty slots, camera or library, share or delete. Compare two dates side by side. |
| Settings | Daily target and per-weekday overrides, kg or lb, start and goal weight, rollover hour, export, import, delete all, about. |
| Welcome | First launch: current and goal weight, daily calories, and whether some days need a different amount (pick the days and the amount). All optional. |

## Data

SQLite tables are `entries`, `foods`, `weights`, `photos` and `settings` (see `src/db.ts`).

- Days are local `YYYY-MM-DD` strings. Energy is whole kcal. Weight is stored in kg.
- Usage counts are derived from `entries` and never stored.
- Deleting a food never changes past entries.

## Logic

All in `src/logic.ts`, and all tested.

- **Target:** the weekday override, otherwise the default.
- **Frequent foods:** each use in the last 60 days scores e^(−age/30). The top 12 are shown.
- **Usual meals:** multi-food meals from the last 90 days, logged within 2 hours of now, grouped by their set of foods. Ranked by count, then recency. Only meals within the remaining calories plus 10% are shown, top 3.
- **Trend:** the mean of the last 7 days' weights, once there are at least 3.
- **Rate:** the least-squares slope of the trend over the last 14 days. It needs 14 days of history and 5 points.
- **Projection:** the month the goal is reached. "far" if more than 2 years away, null if moving away from the goal.
- **Target review:** prompt when weight is down by max(2 kg, 2%) from `targetSetKg`. The estimated drop in daily burn is about 22 kcal per kg lost. Saving new targets, or tapping "Keep for now", resets `targetSetKg` to the current trend weight.

## Brand

- **Colours:** purple `#6b1d4a`, gold `#d9b25f`, orchid `#c45a95` (dark-mode accent), parchment `#f6f3ef`, night `#121110`.
- **Type:** Italiana for the wordmark, Gloock for numbers and titles, Instrument Sans for the interface. All are bundled under the OFL.
- **Mark:** a laurel branch that forms a "C". The source is `assets/brand/mark.svg`, and the app icons and store graphics live in `assets/`.

## Privacy

- The Android release has no INTERNET permission, and `allowBackup` is off.
- The only backup is Export, which writes a JSON file to the share sheet.
- Store answers: no data collected.

## Out of scope

Accounts, sync, barcodes, branded products, macros, recipes, Health Connect and HealthKit, widgets, reminders, gamification and AI.
