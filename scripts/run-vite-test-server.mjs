import { spawn } from "node:child_process";
import process from "node:process";
import { ensureLocalSupabaseRunning } from "./local-supabase.mjs";

const localEnv = ensureLocalSupabaseRunning();

const child = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--port", "8080"],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_SUPABASE_PROJECT_ID: "local-test",
      VITE_SUPABASE_PUBLISHABLE_KEY: localEnv.ANON_KEY,
      VITE_SUPABASE_URL: localEnv.API_URL,
    },
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
