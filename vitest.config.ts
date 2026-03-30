import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/components/NavLink.tsx",
        "src/components/ui/**",
        "src/data/**",
        "src/hooks/use-mobile.tsx",
        "src/hooks/use-toast.ts",
        "src/integrations/supabase/client.ts",
        "src/integrations/supabase/types.ts",
        "src/lib/supabase.ts",
        "src/main.tsx",
        "src/pages/Index.tsx",
        "src/test/**",
        "src/vite-env.d.ts",
      ],
      reportOnFailure: true,
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
        "src/services/**": {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 85,
        },
        "src/features/auth/**": {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 85,
        },
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
