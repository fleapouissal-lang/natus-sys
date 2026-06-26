/**
 * Applique un fichier SQL sur Supabase (connexion Postgres directe).
 *
 * Usage :
 *   node scripts/apply-sql-file.mjs supabase/migrations/076_profile_access_preset.sql
 *
 * Requis dans .env.local :
 *   SUPABASE_DB_PASSWORD=...
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *
 * Optionnel : SUPABASE_DB_URL=postgresql://postgres:...@db.xxx.supabase.co:5432/postgres
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { spawnSync } from "child_process";
import pg from "pg";
import { loadEnv } from "./lib/env.mjs";

function projectRefFromUrl(url) {
  return new URL(url).hostname.split(".")[0];
}

function buildConnectionString(env) {
  if (env.SUPABASE_DB_URL) return env.SUPABASE_DB_URL;

  const password = env.SUPABASE_DB_PASSWORD;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!password || !url) return null;

  const ref = projectRefFromUrl(url);
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("❌ Usage: node scripts/apply-sql-file.mjs <fichier.sql>");
    process.exit(1);
  }

  const env = loadEnv();
  const connectionString = buildConnectionString(env);
  if (!connectionString) {
    console.error(
      "❌ Ajoutez SUPABASE_DB_PASSWORD (ou SUPABASE_DB_URL) dans .env.local\n" +
        "   Dashboard → Project Settings → Database → Database password"
    );
    process.exit(1);
  }

  const sqlPath = resolve(process.cwd(), fileArg);
  const sql = readFileSync(sqlPath, "utf-8");
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`▶ Application SQL : ${fileArg}\n`);

  try {
    await client.connect();
    await client.query(sql);
    console.log("✅ Migration appliquée\n");
  } catch (err) {
    const message = err?.message || String(err);
    const networkError =
      /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET/i.test(message);

    if (networkError) {
      console.warn(`⚠️  Connexion Postgres directe impossible (${message})`);
      console.warn("   → repli sur supabase db push…\n");
      const push = spawnSync("npx supabase db push --linked --yes", {
        shell: true,
        stdio: "inherit",
        cwd: process.cwd(),
        env: process.env,
      });
      if (push.status === 0) {
        console.log("\n✅ Migrations appliquées via Supabase CLI\n");
        return;
      }
    }

    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
