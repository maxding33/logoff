import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'one.logoff.one',
  appName: 'LOGOFF',
  webDir: 'public',
  server: {
    url: 'https://project-pjd7w.vercel.app',
    cleartext: false,
  },
};

export default config;
