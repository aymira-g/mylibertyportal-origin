/* global process */
import { defineConfig } from "vitest/config";

// The school runs on WITA (UTC+8). Pinning the test process to the same
// timezone keeps results identical on every machine (yours, the other
// agent's, GitHub Actions). Tests that need to prove "works on any device
// timezone" switch process.env.TZ themselves and restore it afterwards.
process.env.TZ = "Asia/Makassar";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
    restoreMocks: true,
    env: {
      VITE_FIREBASE_API_KEY: "AIzaSyCut-lqqGwpwZ9FjaifrBObi8Kr76tawIU",
      VITE_FIREBASE_AUTH_DOMAIN: "mylibertyies-f2f38.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "mylibertyies-f2f38",
      VITE_FIREBASE_STORAGE_BUCKET: "mylibertyies-f2f38.firebasestorage.app",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "1072836543676",
      VITE_FIREBASE_APP_ID: "1:1072836543676:web:713dc5f12930e89ce5fcb9",
    },
  },
});
