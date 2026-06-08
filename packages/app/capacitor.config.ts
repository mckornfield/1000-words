import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.thousandwords.app",
  appName: "1000 Words",
  // Vite builds to dist/; Capacitor packages that directory into the native shell.
  webDir: "dist",
};

export default config;
