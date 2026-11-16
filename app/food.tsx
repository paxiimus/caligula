import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { deleteFood, getFood, hideFood, saveFood, type Food } from '../src/db';
import { useBump } from '../src/state';
import { Btn, Field, num, Screen } from '../src/ui';

export default function FoodScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBump();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [food, setFood] = useState<Food | null>(null);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [serving, setServing] = useState('1 serving');

  useEffect(() => {
    if (id)
      getFood(db, Number(id)).then((f) => {
        if (!f) return;
        setFood(f);
        setName(f.name);
        setKcal(String(f.kcal_per_serving));
        setServing(f.serving_label);
      });
  }, [db, id]);

  const done = () => {
    bump();
    router.back();
  };
  const save = async () => {
    await saveFood(db, {
      id: food?.id, name: name.trim(), kcal_per_serving: num(kcal) ?? 0, serving_label: serving.trim() || '1 serving',
      kcal_per_100g: food?.kcal_per_100g ?? null, source: food?.source ?? 'user',
    });
    done();
  };

  return (
    <Screen>
      <Field label="Name" value={name} onChangeText={setName} autoFocus={!id} />
      <Field label="kcal per serving" numeric value={kcal} onChangeText={setKcal} />
      <Field label="Serving" value={serving} onChangeText={setServing} placeholder="1 slice, 100 g, 1 bowl" />
      <Btn title="Save" onPress={save} disabled={!name.trim() || !num(kcal)} />
      {food ? (
        <>
          <Btn kind="plain" title="Hide from lists" onPress={async () => { await hideFood(db, food.id); done(); }} />
          <Btn
            kind="danger"
            title="Delete"
            onPress={() =>
              Alert.alert('Delete this food?', 'Past entries keep their calories.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => { await deleteFood(db, food.id); done(); } },
              ])
            }
          />
        </>
      ) : null}
    </Screen>
  );
}
