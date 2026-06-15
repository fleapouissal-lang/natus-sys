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

run("Migrations Supabase", "supabase db push --linked --yes");
