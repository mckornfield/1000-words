import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Single .env at the repo root, shared with vitest setup + shell tooling.
  envDir: "../..",
  server: {
    port: 5173,
  },
});
