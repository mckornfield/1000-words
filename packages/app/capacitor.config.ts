import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.thousandwords.app",
  appName: "1000 Words",
  // Vite builds to dist/; Capacitor packages that directory into the native shell.
  webDir: "dist",
};

// ios/ and android/ are gitignored and regenerated via `cap add ios`/`cap add android`
// (see package.json scripts). After a fresh `cap add`, re-apply these manual native
// project edits — Capacitor has no generic mechanism to inject them from this config:
//   - ios/App/App/Info.plist: add NSMicrophoneUsageDescription + NSSpeechRecognitionUsageDescription
//     (required by @capacitor-community/speech-recognition for the speaking-practice feature)
//   - android/app/src/main/AndroidManifest.xml: add <uses-permission android:name="android.permission.RECORD_AUDIO" />


export default config;
