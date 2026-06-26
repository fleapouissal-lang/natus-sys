/**
 * Demo complète : reset (sauf products) + users + actualités.
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
run("Utilisateurs (Marrakech & Casa)", "node scripts/seed-users.mjs");
run("Actualités exemple", "node scripts/seed-actualites.mjs");

console.log("\n✅ Demo prête — mot de passe : Natus2026!");
console.log("\nMarrakech — caisse Guéliz : caisse.natus.gueliz@natus.ma");
console.log("Casablanca — caisse Anfa : caisse.natus.casablanca.anfa@natus.ma");
console.log("\nDirection : directeur@natus.ma | Gérants : manager.marrakech@ / manager.casablanca@\n");
