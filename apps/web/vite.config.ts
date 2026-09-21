import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    host: "0.0.0.0", // home-lab: reachable from LAN/Tailscale, not just loopback
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL ?? "http://localhost:4100",
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
