import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "games.babyress.checklove",
  appName: "LoveCheck",
  webDir: "apps/web/dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https"
  }
};

export default config;
