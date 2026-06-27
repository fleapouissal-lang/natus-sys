const { Client } = require("ssh2");

const host = process.env.VPS_HOST || "161.97.134.231";
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;

if (!password) {
  console.error("VPS_PASSWORD required");
  process.exit(1);
}

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream
        .on("close", (code) => resolve(code ?? 0))
        .on("data", (d) => process.stdout.write(d))
        .stderr.on("data", (d) => process.stderr.write(d));
    });
  });
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn
      .on("ready", resolve)
      .on("error", reject)
      .connect({ host, username, password, readyTimeout: 30000 });
  });

  console.log(`\n==> Connected to ${host}\n`);
  const code = await exec(
    conn,
    `set -e
cd /var/www/natus
git fetch origin master
git reset --hard origin/master
bash deploy/deploy.sh`
  );
  conn.end();
  process.exit(code);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
