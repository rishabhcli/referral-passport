import { execFileSync } from "node:child_process";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "demo@consultpassport.dev";
const DEMO_PASSWORD = "demo-passport-2025";
const projectRoot = process.cwd();

function runSupabase(args, { inherit = false } = {}) {
  return execFileSync("supabase", args, {
    cwd: projectRoot,
    encoding: inherit ? undefined : "utf8",
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  });
}

function parseEnvOutput(output) {
  const unquote = (value) => {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }

    return value;
  };

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((acc, line) => {
      const index = line.indexOf("=");
      if (index === -1) {
        return acc;
      }

      const key = line.slice(0, index);
      const value = unquote(line.slice(index + 1));
      acc[key] = value;
      return acc;
    }, {});
}

function readLocalSupabaseEnv() {
  const raw = runSupabase(["status", "-o", "env"]);
  const env = parseEnvOutput(raw);

  for (const key of ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY"]) {
    if (!env[key]) {
      throw new Error(`Missing ${key} in 'supabase status -o env' output.`);
    }
  }

  return env;
}

export function ensureLocalSupabaseRunning() {
  try {
    return readLocalSupabaseEnv();
  } catch {
    runSupabase(["start", "--ignore-health-check"], { inherit: true });
    return readLocalSupabaseEnv();
  }
}

export async function ensureDemoUser(env) {
  const adminClient = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (error) {
    throw error;
  }

  const existingUser = data.users.find((user) => user.email === DEMO_EMAIL);

  if (existingUser) {
    const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata ?? {}),
        full_name: "Demo Coordinator",
        role: "demo",
      },
    });

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: createError } = await adminClient.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: "Demo Coordinator",
      role: "demo",
    },
  });

  if (createError) {
    throw createError;
  }
}

export async function resetLocalSupabase() {
  ensureLocalSupabaseRunning();
  runSupabase(["db", "reset", "--local", "--yes"], { inherit: true });
  const env = ensureLocalSupabaseRunning();
  await ensureDemoUser(env);
  return env;
}

async function main() {
  const command = process.argv[2] ?? "env";

  if (command === "reset") {
    await resetLocalSupabase();
    console.log("Local Supabase test database is ready.");
    return;
  }

  if (command === "env") {
    console.log(JSON.stringify(ensureLocalSupabaseRunning(), null, 2));
    return;
  }

  throw new Error(`Unsupported command: ${command}`);
}

const isDirectInvocation = import.meta.url === new URL(process.argv[1], "file:").href;

if (isDirectInvocation) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
