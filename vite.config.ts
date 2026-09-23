import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  base: "/OCNET/",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          forms: ["react-hook-form", "zod", "@hookform/resolvers"],
          motion: ["motion"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
});
