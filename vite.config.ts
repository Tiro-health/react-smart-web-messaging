import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        ehr: "./src/ehr/index.tsx",
        "smart-app": "./src/smart-app/index.tsx",
      },
    },
  },
});
