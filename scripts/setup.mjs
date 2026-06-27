import { spawnSync } from "child_process";
import { resolve } from "path";

const root = resolve(process.cwd());

function run(label, command) {
  console.log(`\n▶ ${label}\n`);
  const result = spawnSync(command, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`\n❌ Échec : ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("🚀 Setup Natus — migrations + seed\n");

run("Migrations Supabase", "npm run db:migrate");
run("Reset commandes", "node scripts/reset-orders.mjs");
run("Seed utilisateurs", "node scripts/seed-users.mjs");
run("Seed commandes Shopify", "node scripts/seed-shopify-orders.mjs");
run("Affectation livreurs", "node scripts/backfill-livreur-orders.mjs");

console.log("\n✅ Setup terminé\n");
