import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { migrate } from '../src/db';
import { FONT_FILES, FONTS, useColors } from '../src/theme';

SplashScreen.preventAutoHideAsync();

export default function Root() {
  const c = useColors();
  const [loaded] = useFonts(FONT_FILES);
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;

  return (
    <SQLiteProvider databaseName="caligula.db" onInit={migrate}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.accent,
          headerTitleStyle: { fontFamily: FONTS.display, color: c.text, fontSize: 22 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add" options={{ presentation: 'modal', title: 'Add' }} />
        <Stack.Screen name="food" options={{ presentation: 'modal', title: 'Food' }} />
        <Stack.Screen name="weight" options={{ presentation: 'modal', title: 'Weight' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="compare" options={{ title: 'Compare' }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </SQLiteProvider>
  );
}
