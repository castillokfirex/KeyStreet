import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\\/]three[\\/]/.test(id)) {
            return "vendor-three";
          }
          if (/node_modules[\\/]@react-three[\\/]/.test(id)) {
            return "vendor-r3f";
          }
          if (/node_modules[\\/]@mediapipe[\\/]tasks-vision[\\/]/.test(id)) {
            return "vendor-mediapipe";
          }
          return undefined;
        },
      },
    },
  },
});
