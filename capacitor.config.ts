import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.company.absensi',
  appName: 'Absensi Digital',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: '#667eea',
      androidScaleType: 'CENTER_CROP'
    },
    Camera: {
      saveToGallery: false
    }
  }
};

export default config;
