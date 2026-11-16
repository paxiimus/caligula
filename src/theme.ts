import { useColorScheme } from 'react-native';

const light = {
  bg: '#f6f3ef', card: '#ffffff', text: '#1c1a17', muted: '#716b63', line: '#e3ded6',
  accent: '#6b1d4a', accentText: '#ffffff', gold: '#a07b2c', danger: '#a12a2a',
};
const dark: typeof light = {
  bg: '#121110', card: '#1d1b19', text: '#f2eee8', muted: '#9d968c', line: '#2f2c28',
  accent: '#c45a95', accentText: '#ffffff', gold: '#d9b25f', danger: '#e06a6a',
};

export type Colors = typeof light;
export const useColors = () => (useColorScheme() === 'dark' ? dark : light);

/** Brand constants used outside React (app icon, splash). */
export const BRAND = { purple: '#6b1d4a', gold: '#d9b25f' };

/** Italiana for the wordmark, Gloock for numbers and titles, Instrument Sans for everything else. */
export const FONTS = { brand: 'Italiana', display: 'Gloock', body: 'InstrumentSans', bold: 'InstrumentSans-Bold' };

export const FONT_FILES = {
  Italiana: require('../assets/fonts/Italiana-Regular.ttf'),
  Gloock: require('../assets/fonts/Gloock-Regular.ttf'),
  InstrumentSans: require('../assets/fonts/InstrumentSans-Regular.ttf'),
  'InstrumentSans-Bold': require('../assets/fonts/InstrumentSans-Bold.ttf'),
};
