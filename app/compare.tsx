import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { allPhotos, allWeights, getSettings, type Photo } from '../src/db';
import { photoUri } from '../src/files';
import { daysBetween, fmtDay, toDisplay } from '../src/logic';
import { useLive } from '../src/state';
import { useColors } from '../src/theme';
import { Btn, H, Row, Screen, T } from '../src/ui';

export default function Compare() {
  const c = useColors();
  const photos = useLive(allPhotos);
  const weights = useLive(allWeights);
  const settings = useLive(getSettings);
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  if (!photos || !weights || !settings || photos.length < 2) return null;

  const a = photos.find((p) => p.id === left) ?? photos[0];
  const b = photos.find((p) => p.id === right) ?? photos[photos.length - 1];
  const nearest = (p: Photo) => {
    const w = weights
      .map((w) => ({ w, gap: Math.abs(daysBetween(w.day, p.day)) }))
      .filter((x) => x.gap <= 7)
      .sort((x, y) => x.gap - y.gap)[0]?.w;
    return w ? ` · ${toDisplay(w.kg, settings.units)} ${settings.units}` : '';
  };
  const side = (p: Photo) => (
    <View style={{ flex: 1, gap: 4 }}>
      <Image source={{ uri: photoUri(p.path) }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 10 }} />
      <T size={13} style={{ textAlign: 'center' }}>{fmtDay(p.day)}{nearest(p)}</T>
    </View>
  );
  const strip = (selected: Photo, set: (id: number) => void) => (
    <ScrollView horizontal contentContainerStyle={{ gap: 6 }}>
      {photos.map((p) => (
        <Pressable key={p.id} accessibilityRole="imagebutton" accessibilityLabel={fmtDay(p.day)} onPress={() => set(p.id)}>
          <Image source={{ uri: photoUri(p.path) }}
            style={{ width: 54, height: 72, borderRadius: 6, borderWidth: 2, borderColor: p.id === selected.id ? c.accent : 'transparent' }} />
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <Screen>
      <Row style={{ alignItems: 'flex-start' }}>{side(a)}{side(b)}</Row>
      <Btn kind="plain" title="Swap sides" onPress={() => { setLeft(b.id); setRight(a.id); }} />
      <H>Left</H>
      {strip(a, setLeft)}
      <H>Right</H>
      {strip(b, setRight)}
    </Screen>
  );
}
