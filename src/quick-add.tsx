import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { addEntries } from './db';
import { useBump } from './state';
import { useColors } from './theme';
import { Btn, Chip, Field, num, Row } from './ui';

const LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Drink'];

/** Bottom sheet over Today: type a number, optionally a label, done. No screen change. */
export function QuickAdd({ visible, day, onClose }: { visible: boolean; day: string; onClose: () => void }) {
  const c = useColors();
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBump();
  const [kcal, setKcal] = useState('');
  const [label, setLabel] = useState('');
  const n = num(kcal);

  const close = () => {
    setKcal('');
    setLabel('');
    onClose();
  };
  const add = async () => {
    if (!n || n <= 0) return;
    await addEntries(db, day, [{ kcal: n, label: label.trim() || null, foodId: null, qty: null }]);
    bump();
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}
      >
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close quick add" />
        <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 24, gap: 10 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.line }} />
          <Field big autoFocus numeric value={kcal} onChangeText={setKcal} placeholder="kcal" onSubmitEditing={add} />
          <Field value={label} onChangeText={setLabel} placeholder="Label (optional)" onSubmitEditing={add} />
          <Row style={{ flexWrap: 'wrap' }}>
            {LABELS.map((l) => <Chip key={l} title={l} active={label === l} onPress={() => setLabel(label === l ? '' : l)} />)}
          </Row>
          <Row>
            <Btn kind="plain" title="Foods & search" style={{ flex: 1 }} onPress={() => { close(); router.push('/add'); }} />
            <Btn title={n ? `Add ${Math.round(n)}` : 'Add'} style={{ flex: 1 }} onPress={add} disabled={!n || n <= 0} />
          </Row>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
