import { Client } from "ssh2";

const host = process.env.NATUS_SSH_HOST;
const username = process.env.NATUS_SSH_USER || "root";
const password = process.env.NATUS_SSH_PASS;
const appDir = process.env.NATUS_APP_DIR || "/var/www/natus";

if (!host || !password) {
  console.error("NATUS_SSH_HOST et NATUS_SSH_PASS sont requis.");
  process.exit(1);
}

const command = `
set -e
for dir in '${appDir}' /root/natus-sys /var/www/natus; do
  if [ -d "$dir/.git" ] || [ -f "$dir/package.json" ]; then
    cd "$dir"
    break
  fi
done
echo "==> Deploy dans $(pwd)"
if [ -d .git ]; then
  git fetch origin master
  git reset --hard origin/master
else
  echo "Erreur: dépôt introuvable"
  exit 1
fi
bash deploy/deploy.sh
`;

const conn = new Client();

conn
  .on("ready", () => {
    conn.exec(command, { pty: false }, (err, stream) => {
      if (err) {
        console.error(err.message);
        conn.end();
        process.exit(1);
      }

      stream.on("data", (data) => process.stdout.write(data));
      stream.stderr.on("data", (data) => process.stderr.write(data));
      stream.on("close", (code) => {
        conn.end();
        process.exit(code ?? 0);
      });
    });
  })
  .on("error", (err) => {
    console.error(err.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password });
