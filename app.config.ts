import type { ExpoConfig } from 'expo/config';

// Store builds ship with no INTERNET permission. Expo Go and dev builds keep it so Metro can connect.
const release = ['preview', 'production'].includes(process.env.EAS_BUILD_PROFILE ?? '');
const PURPLE = '#6b1d4a';
// Paste the project ID that `eas init` prints. Dynamic configs can't be written to automatically.
const EAS_PROJECT_ID = 'ecdd0ba4-8335-4732-8361-6465e199a497';

const config: ExpoConfig = {
  name: 'Caligula',
  slug: 'caligula',
  scheme: 'caligula',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'com.paxiimus.caligula',
    supportsTablet: false,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: 'com.paxiimus.caligula',
    allowBackup: false,
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: PURPLE },
    // The image library uses the system photo picker, so no storage or media permissions are needed.
    // Leaving them out also avoids Play's photo and video permissions declaration.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      ...(release ? ['android.permission.INTERNET'] : []),
    ],
  },
  ...(EAS_PROJECT_ID ? { extra: { eas: { projectId: EAS_PROJECT_ID } } } : {}),
  plugins: [
    'expo-router',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 180, backgroundColor: PURPLE }],
    [
      'expo-image-picker',
      {
        cameraPermission: 'Caligula uses the camera for your weekly progress photo. Photos stay on this phone.',
        photosPermission: 'Caligula lets you pick a progress photo from your library. Photos stay on this phone.',
        microphonePermission: false,
      },
    ],
  ],
};

export default config;
