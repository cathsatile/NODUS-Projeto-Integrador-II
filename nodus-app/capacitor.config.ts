import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nodus.app',
  appName: 'NODUS',
  webDir: 'dist/nodus-app/browser',
  android: {
    allowMixedContent: true,
  },
};

export default config;
