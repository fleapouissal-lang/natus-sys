/**
 * Demo complète : reset (sauf products) + users + commandes + actualités.
 *
 * Usage : npm run seed:demo
 */
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

console.log("🚀 Seed demo Natus\n");

run("Migrations", "npm run db:migrate");
run("Reset données (products conservés)", "node scripts/reset-demo-data.mjs");
run("Utilisateurs (3 caissiers + caisse magasin / store)", "node scripts/seed-users.mjs");
run("Commandes Shopify", "node scripts/seed-shopify-orders.mjs");
run("Affectation livreurs", "node scripts/backfill-livreur-orders.mjs");
run("Actualités exemple", "node scripts/seed-actualites.mjs");

console.log("\n✅ Demo prête — mot de passe : Natus2026!");
console.log("\nGuéliz :");
console.log("  Login caisse : caisse.natus.gueliz@natus.ma");
console.log("  Caissiers    : oussal.natus.gueliz@ / hajar.natus.gueliz@ / sara.natus.gueliz@");
console.log("\nDirection : directeur@natus.ma | Gérant : manager.marrakech@natus.ma\n");
