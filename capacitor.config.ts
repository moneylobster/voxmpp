import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vox.xmpp',
  appName: 'Vox',
  webDir: 'dist',
  server: {
    // Enable mixed content for development (WebSocket connections)
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f0f0f',
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f0f0f',
  },
  ios: {
    backgroundColor: '#0f0f0f',
    contentInset: 'automatic',
  },
};

export default config;
