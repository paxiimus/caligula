import { Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Icon, Mark, Wordmark } from '../../src/brand';
import { Row } from '../../src/ui';
import { FONTS, useColors } from '../../src/theme';

export default function TabsLayout() {
  const c = useColors();
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerTitleStyle: { fontFamily: FONTS.display, fontSize: 22 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: { fontFamily: FONTS.bold, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }: { color: string }) => <Icon name="today" color={color} />,
          headerTitle: () => (
            <Row style={{ gap: 6 }}>
              <Mark size={26} color={c.gold} />
              <Wordmark size={20} color={c.accent} />
            </Row>
          ),
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={{ padding: 12 }}>
              <Icon name="settings" color={c.accent} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="trends" options={{ title: 'Trends', tabBarIcon: ({ color }: { color: string }) => <Icon name="trends" color={color} /> }} />
      <Tabs.Screen name="photos" options={{ title: 'Photos', tabBarIcon: ({ color }: { color: string }) => <Icon name="photos" color={color} /> }} />
      <Tabs.Screen name="foods" options={{ title: 'Foods', tabBarIcon: ({ color }: { color: string }) => <Icon name="foods" color={color} /> }} />
    </Tabs>
  );
}
