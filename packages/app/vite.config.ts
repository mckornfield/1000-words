import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Single .env at the repo root, shared with vitest setup + shell tooling.
  envDir: "../..",
  // BASE_URL is set by the GitHub Pages deploy workflow; defaults to '/' for local dev.
  base: process.env.BASE_URL ?? "/",
  server: {
    host: true,
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 8080,
    strictPort: true,
  },
});
