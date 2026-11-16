import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { FONTS, useColors } from './theme';

type Kids = { children?: ReactNode; style?: StyleProp<ViewStyle> };

export function Screen({ children, style }: Kids) {
  const c = useColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[{ padding: 16, gap: 12, paddingBottom: 48 }, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: Kids) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.card, borderRadius: 14, padding: 14, gap: 6 }, style]}>{children}</View>;
}

export const Row = ({ children, style }: Kids) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>
);

export function T(p: { children?: ReactNode; muted?: boolean; bold?: boolean; size?: number; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return (
    <Text style={[{ color: p.muted ? c.muted : c.text, fontSize: p.size ?? 16, fontFamily: p.bold ? FONTS.bold : FONTS.body }, p.style]}>
      {p.children}
    </Text>
  );
}

/** Big serif numbers and titles. */
export function Big(p: { children?: ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[{ fontFamily: FONTS.display, fontSize: p.size ?? 40, color: p.color ?? c.text }, p.style]}>{p.children}</Text>;
}

export function H({ children }: { children: ReactNode }) {
  return <T bold size={12} muted style={{ textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 8 }}>{children}</T>;
}

export function Btn(p: {
  title: string; onPress: () => void; kind?: 'primary' | 'plain' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const kind = p.kind ?? 'primary';
  const bg = kind === 'primary' ? c.accent : 'transparent';
  const fg = kind === 'primary' ? c.accentText : kind === 'danger' ? c.danger : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={p.onPress}
      disabled={p.disabled}
      style={({ pressed }) => [
        { backgroundColor: bg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, minHeight: 46,
          alignItems: 'center', justifyContent: 'center', opacity: p.disabled ? 0.35 : pressed ? 0.7 : 1 },
        p.style,
      ]}
    >
      <Text style={{ color: fg, fontSize: 16, fontFamily: FONTS.bold }}>{p.title}</Text>
    </Pressable>
  );
}

export function Field(p: {
  label?: string; value: string; onChangeText: (v: string) => void; numeric?: boolean;
  placeholder?: string; autoFocus?: boolean; big?: boolean; style?: StyleProp<ViewStyle>; onSubmitEditing?: () => void;
}) {
  const c = useColors();
  return (
    <View style={[{ gap: 4 }, p.style]}>
      {p.label ? <T muted size={13}>{p.label}</T> : null}
      <TextInput
        accessibilityLabel={p.label ?? p.placeholder}
        value={p.value}
        onChangeText={p.onChangeText}
        keyboardType={p.numeric ? 'decimal-pad' : 'default'}
        returnKeyType="done"
        onSubmitEditing={p.onSubmitEditing}
        placeholder={p.placeholder}
        placeholderTextColor={c.muted}
        autoFocus={p.autoFocus}
        style={{
          backgroundColor: c.card, color: c.text, borderRadius: 12, borderWidth: 1, borderColor: c.line,
          paddingHorizontal: 12, paddingVertical: p.big ? 12 : 10,
          fontSize: p.big ? 36 : 16, fontFamily: p.big ? FONTS.display : FONTS.body,
        }}
      />
    </View>
  );
}

export function Chip(p: { title: string; onPress: () => void; active?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!p.active }}
      onPress={p.onPress}
      style={{
        borderRadius: 999, borderWidth: 1, borderColor: p.active ? c.accent : c.line,
        backgroundColor: p.active ? c.accent : c.card, paddingVertical: 8, paddingHorizontal: 14, minHeight: 38, justifyContent: 'center',
      }}
    >
      <Text style={{ color: p.active ? c.accentText : c.text, fontSize: 14, fontFamily: FONTS.body }}>{p.title}</Text>
    </Pressable>
  );
}

export function Bar({ value, color }: { value: number; color: string }) {
  const c = useColors();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: 'hidden', alignSelf: 'stretch' }}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height: 8, backgroundColor: color }} />
    </View>
  );
}

/** A number from a text field, or null when blank or not a number. */
export const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() && Number.isFinite(n) ? n : null;
};
