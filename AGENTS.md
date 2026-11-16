# Rules for agents working on Caligula

Read `SPEC.md` before changing anything.

## Hard constraints (a change that breaks one is rejected)

1. No `fetch`, `XMLHttpRequest`, `WebSocket` or remote URL in app code. `npm run lint` and `npm run check:network` enforce this.
2. No SDK that phones home: analytics, ads, crash reporting, attribution, push messaging.
3. No AI features, models or prompts inside the app.
4. No accounts, login or server.
5. Photos stay in the app's private storage.

## Stack

Expo, Expo Router, TypeScript strict, `expo-sqlite`, Jotai for UI state, `react-native-svg` for charts.

Do not add Zustand, Redux, an ORM, a chart library or a UI kit.

## Allowed dependencies

expo, expo-constants, expo-document-picker, expo-file-system, expo-font, expo-image-picker, expo-linking, expo-router, expo-sharing, expo-splash-screen, expo-sqlite, expo-status-bar, jotai, react, react-native, react-native-safe-area-context, react-native-screens, react-native-svg.

Ask before adding anything else.

## Code

- Keep code concise and minimal. Add no abstraction until something is used twice.
- Put pure logic in `src/logic.ts` with tests in `src/logic.test.ts`. Write the tests before any UI uses the logic.
- Put SQL in `src/db.ts`. Change the schema only by appending a migration.
- After every change, run typecheck, lint, tests and the network check.

## Brand

- Colours live in `src/theme.ts`. Brand purple is `#6b1d4a` and gold is `#d9b25f`.
- Fonts are bundled in `assets/fonts` (all OFL): Italiana for the wordmark only, Gloock for numbers and titles, Instrument Sans for everything else. Use `FONTS` from `src/theme.ts`; never use `fontWeight` with them.
- The laurel "C" mark is `src/brand-mark.ts`, `assets/brand/mark.svg` and the `Mark` component. Do not redraw it.
