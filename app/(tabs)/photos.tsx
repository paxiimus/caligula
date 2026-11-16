import * as ImagePicker from 'expo-image-picker';
import { Tabs, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { addPhoto, allPhotos, deletePhotoRow, type Photo } from '../../src/db';
import { photoUri, removePhotoFile, storePhoto } from '../../src/files';
import { addDays, dayKey, daysBetween, fmtDay, weekStart } from '../../src/logic';
import { useBump, useLive } from '../../src/state';
import { FONTS, useColors } from '../../src/theme';
import { Btn, Card, Row, Screen, T } from '../../src/ui';

export default function Photos() {
  const c = useColors();
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBump();
  const photos = useLive(allPhotos);
  const today = dayKey(new Date());

  const pick = async (camera: boolean) => {
    if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return;
    const r = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled) return;
    await addPhoto(db, today, storePhoto(r.assets[0].uri));
    bump();
  };
  const add = () =>
    Alert.alert('Add progress photo', 'Photos stay on this phone.', [
      { text: 'Camera', onPress: () => pick(true) },
      { text: 'Library', onPress: () => pick(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const options = (p: Photo) =>
    Alert.alert(fmtDay(p.day), undefined, [
      { text: 'Share', onPress: () => Sharing.shareAsync(photoUri(p.path)) },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { removePhotoFile(p.path); await deletePhotoRow(db, p.id); bump(); },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  if (!photos) return null;
  const first = photos[0] ? weekStart(photos[0].day) : weekStart(today);
  const weeks = Math.min(104, Math.floor(daysBetween(first, weekStart(today)) / 7) + 1);

  return (
    <Screen>
      <Tabs.Screen
        options={{
          headerRight: () =>
            photos.length > 1 ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/compare')} style={{ padding: 12 }}>
                <Text style={{ color: c.accent, fontSize: 16, fontFamily: FONTS.bold }}>Compare</Text>
              </Pressable>
            ) : null,
        }}
      />
      <Btn title="Add this week's photo" onPress={add} />
      {Array.from({ length: weeks }, (_, i) => {
        const wk = addDays(weekStart(today), -7 * i);
        const these = photos.filter((p) => weekStart(p.day) === wk);
        return (
          <Card key={wk}>
            <T muted size={13}>Week of {fmtDay(wk)}</T>
            <Row style={{ flexWrap: 'wrap' }}>
              {these.map((p) => (
                <Pressable key={p.id} accessibilityRole="imagebutton" accessibilityLabel={`Photo from ${fmtDay(p.day)}`} onPress={() => options(p)}>
                  <Image source={{ uri: photoUri(p.path) }} style={{ width: 96, height: 128, borderRadius: 8 }} />
                </Pressable>
              ))}
              {these.length ? null : (
                <View style={{ width: 96, height: 128, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                  <T muted size={12}>No photo</T>
                </View>
              )}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
