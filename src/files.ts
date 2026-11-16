import { Directory, File, Paths } from 'expo-file-system';

// Photos live in the app's private document directory; the database stores paths relative to it.

const photoDir = () => {
  const d = new Directory(Paths.document, 'photos');
  if (!d.exists) d.create();
  return d;
};

export function storePhoto(uri: string) {
  const ext = /\.(\w+)$/.exec(uri)?.[1] ?? 'jpg';
  const name = `${Date.now()}.${ext}`;
  new File(uri).copy(new File(photoDir(), name));
  return `photos/${name}`;
}

export const photoUri = (path: string) => new File(Paths.document, path).uri;

export function removePhotoFile(path: string) {
  const f = new File(Paths.document, path);
  if (f.exists) f.delete();
}

export function removeAllPhotoFiles() {
  const d = new Directory(Paths.document, 'photos');
  if (d.exists) d.delete();
}
