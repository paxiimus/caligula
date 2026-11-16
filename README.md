# Caligula

An offline calorie counter for Android and iOS. Tap plus, type a number, see the day's total. No accounts, no ads, no analytics, no AI, and no network requests: the Android release ships without the internet permission.

Privacy policy and terms: https://caligula.paxiimus.com

## Features

- **Today:** tap the daily number to add calories and a label from a quick sheet, without leaving the screen. It also nudges you to lower your targets once you've lost weight.
- **Add:** number pad first. Frequent foods fill in from what you log, and usual meals that fit your remaining calories are suggested. Search covers your own foods plus an offline UK food list.
- **Trends:** your estimated goal date up front, then daily calorie bars and weight with a 7-day trend line.
- **Foods:** your library, plus search over the food database.
- **Photos:** a weekly progress photo journal with side-by-side compare. Photos stay in the app's private storage.
- **Settings:** a daily target or one per weekday, kg or lb, a day rollover hour, and JSON export and import.

## Run it

```sh
npm install
npx expo install --fix   # align native module versions with the installed Expo SDK
npx expo start           # scan the QR code with Expo Go on Android
```

In development, Settings has a **Load demo data** button that fills 60 days of history.

## Checks

```sh
npm run typecheck
npm run lint
npm test               # logic tests (node:test via tsx)
npm run check:network  # fails if fetch, XMLHttpRequest or WebSocket appear in app code
```

## Release

See [RELEASE.md](RELEASE.md) for the full build-and-submit checklist, and [store/play-listing.md](store/play-listing.md) for the Play listing text and form answers.

## Build for Android

```sh
npx eas-cli build -p android --profile preview      # installable APK
npx eas-cli build -p android --profile production   # AAB for Google Play
```

`preview` and `production` builds block `android.permission.INTERNET` (see `app.config.ts`). After a build, confirm that the manifest has no INTERNET permission:

```sh
aapt dump permissions caligula.apk
```

## Offline food list

`src/data/foods.json` ships empty. To fill it, download the CoFID spreadsheet from [GOV.UK](https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid) and run:

```sh
npm run build:food-db -- path/to/CoFID.xlsx
```

Contains public sector information licensed under the Open Government Licence v3.0.

## Brand assets

| File | Use |
| --- | --- |
| `assets/icon.png` | App icon (1024, iOS and fallback) |
| `assets/adaptive-icon.png` | Android adaptive icon foreground, on purple `#6b1d4a` |
| `assets/splash-icon.png` | Splash screen mark |
| `assets/store/play-icon-512.png` | Google Play listing icon |
| `assets/store/feature-graphic-1024x500.png` | Google Play feature graphic |
| `assets/brand/mark.svg` | Vector mark |
| `assets/fonts/` | Italiana, Gloock and Instrument Sans with their OFL licences |

## Privacy site

`docs/` holds the privacy and terms page. To serve it at caligula.paxiimus.com, go to GitHub, Settings, Pages, and choose **Deploy from a branch** with `main` and `/docs`. Then add a DNS record: `CNAME caligula → paxiimus.github.io`.

## Licence

MIT. See [LICENSE](LICENSE).
