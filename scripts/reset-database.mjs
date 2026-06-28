/**
 * Applique les migrations Supabase puis purge les données opérationnelles.
 * Conserve products + utilisateurs. Stock = 100 par magasin/dépôt actif.
 *
 * Usage : node scripts/reset-database.mjs
 */
import { spawnSync } from "node:child_process";
import { loadEnv } from "./lib/env.mjs";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: process.cwd(),
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  loadEnv();

  console.log("🚀 Application des migrations Supabase…\n");
  run("supabase", ["db", "push", "--yes"]);

  console.log("\n🗑️  Purge + stock initial…\n");
  run("node", ["scripts/purge-operational-data.mjs", "--stock=100"]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
