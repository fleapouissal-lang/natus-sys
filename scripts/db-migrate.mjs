import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { spawnSync } from "child_process";

const root = resolve(process.cwd());
const ifConfigured = process.argv.includes("--if-configured");

function loadEnvLocal() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return {};

  const env = {};
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function printHelp(extra = "") {
  console.error(`
❌ Migrations Supabase — échec${extra ? ` (${extra})` : ""}

1) Token Supabase CLI (pas la service_role JWT) :
   https://supabase.com/dashboard/account/tokens
   → dans .env.local : SUPABASE_ACCESS_TOKEN=sbp_...

2) Mot de passe base de données (Dashboard → Project Settings → Database) :
   → dans .env.local : SUPABASE_DB_PASSWORD=votre_mot_de_passe

3) Projet lié :
   npx supabase link --project-ref agobpjhgkloxgetntcye

4) Relancer :
   npm run db:migrate

Si « Remote migration versions not found in local » (ex. 070) :
   → le fichier 070_remote_sync.sql doit exister localement (déjà ajouté)
   → ou : npx supabase migration repair --status reverted 070

Alternative sans CLI : coller le SQL de supabase/migrations/071_*.sql
   dans Supabase Dashboard → SQL Editor → Run
`);
}

const fileEnv = loadEnvLocal();
const childEnv = {
  ...process.env,
  ...Object.fromEntries(
    ["SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD", "SUPABASE_DB_URL"].filter(
      (key) => fileEnv[key]
    ).map((key) => [key, fileEnv[key]])
  ),
};

const hasToken = Boolean(
  childEnv.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN
);
const hasPassword = Boolean(
  childEnv.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD
);

if (ifConfigured && (!hasToken || !hasPassword)) {
  console.log(
    "⏭  Migrations ignorées (ajoutez SUPABASE_ACCESS_TOKEN et SUPABASE_DB_PASSWORD dans .env.local)\n"
  );
  process.exit(0);
}

console.log("\n▶ Migrations Supabase\n");

if (!hasToken) {
  console.warn(
    "⚠️  SUPABASE_ACCESS_TOKEN absent — lancez « npx supabase login » ou ajoutez le token dans .env.local\n"
  );
}

if (!hasPassword) {
  console.warn(
    "⚠️  SUPABASE_DB_PASSWORD absent — ajoutez le mot de passe DB Supabase dans .env.local\n"
  );
}

const result = spawnSync("npx supabase db push --linked --yes", {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: childEnv,
});

if (result.status !== 0) {
  printHelp();
  process.exit(result.status ?? 1);
}

console.log("\n✅ Migrations appliquées\n");
