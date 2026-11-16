import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { allWeights, deleteWeight, getSettings, setWeight } from '../src/db';
import { dayKey, fmtDay, fromDisplay, toDisplay } from '../src/logic';
import { useBump, useLive } from '../src/state';
import { Btn, Card, Field, H, num, Row, Screen, T } from '../src/ui';

export default function WeightScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBump();
  const settings = useLive(getSettings);
  const weights = useLive(allWeights);
  const [value, setValue] = useState('');
  if (!settings || !weights) return null;
  const u = settings.units;
  const today = dayKey(new Date(), settings.rolloverHour);

  const save = async () => {
    await setWeight(db, today, fromDisplay(num(value)!, u));
    bump();
    router.back();
  };

  return (
    <Screen>
      <Field big autoFocus numeric value={value} onChangeText={setValue} placeholder={`Today's weight (${u})`} />
      <Btn title="Save" onPress={save} disabled={!num(value)} />
      {weights.length ? <H>History</H> : null}
      {[...weights].reverse().slice(0, 30).map((w) => (
        <Pressable
          key={w.day}
          accessibilityRole="button"
          onPress={() =>
            Alert.alert(`Delete ${fmtDay(w.day)}?`, undefined, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: async () => { await deleteWeight(db, w.day); bump(); } },
            ])
          }
        >
          <Card style={{ paddingVertical: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T>{fmtDay(w.day)}</T>
              <T bold>{toDisplay(w.kg, u)} {u}</T>
            </Row>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
