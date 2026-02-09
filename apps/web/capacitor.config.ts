import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.helloagainlinks.app',
  appName: 'Hello Again Links',
  webDir: 'out',
  server: {
    url: 'https://helloagain-three.vercel.app',
    cleartext: false,
  },
  plugins: {
    CapacitorShareTarget: {
      shareExtensionName: 'ShareExtension',
    },
  },
};

export default config;
