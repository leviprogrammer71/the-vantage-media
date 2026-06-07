import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Slightly higher warning ceiling so the intentional vendor splits
    // below don't spam the build log.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks so the browser can
          // cache them independently and download them in parallel.
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-accordion', '@radix-ui/react-select', '@radix-ui/react-popover', '@radix-ui/react-tooltip'],
          'supabase': ['@supabase/supabase-js'],
          'motion': ['motion'],
          // May 25, 2026 — additional splits: these are large and only used
          // on a handful of routes, so isolating them keeps the homepage
          // critical path lean.
          'charts': ['recharts'],
          'icons': ['lucide-react'],
          'query': ['@tanstack/react-query'],
        },
      },
    },
  },
}));
