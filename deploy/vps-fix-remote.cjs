const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const host = "161.97.134.231";
const username = "root";
const password = process.env.VPS_PASSWORD;
const localEnvPath = path.join(__dirname, "..", ".env.local");

if (!password) {
  console.error("VPS_PASSWORD required");
  process.exit(1);
}

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      let errOut = "";
      stream
        .on("close", (code) => resolve({ code, out, errOut }))
        .on("data", (d) => {
          out += d.toString();
          process.stdout.write(d);
        })
        .stderr.on("data", (d) => {
          errOut += d.toString();
          process.stderr.write(d);
        });
    });
  });
}

function buildEnvForVps() {
  const raw = fs.readFileSync(localEnvPath, "utf8");
  const seen = new Set();
  const lines = [];
  for (const line of raw.split("\n")) {
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) {
      lines.push(line);
      continue;
    }
    const m = line.match(/^([^=]+)=(.*)$/);
    if (!m) {
      lines.push(line);
      continue;
    }
    const key = m[1].trim();
    if (seen.has(key)) continue;
    seen.add(key);
    if (key === "NEXT_PUBLIC_APP_URL") {
      lines.push("NEXT_PUBLIC_APP_URL=http://161.97.134.231:3002");
    } else if (key === "CRON_SECRET" && m[2].trim() === "...") {
      lines.push(`CRON_SECRET=${Date.now()}${Math.random().toString(36).slice(2)}`);
    } else {
      lines.push(line);
    }
  }
  if (!seen.has("NEXT_PUBLIC_APP_URL")) {
    lines.push("NEXT_PUBLIC_APP_URL=http://161.97.134.231:3002");
  }
  return lines.join("\n").replace(/\n$/, "") + "\n";
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn
      .on("ready", resolve)
      .on("error", reject)
      .connect({ host, username, password, readyTimeout: 20000 });
  });

  console.log("\n==> Connected\n");

  const envB64 = Buffer.from(buildEnvForVps(), "utf8").toString("base64");

  const fixScript = `set -e
APP=/var/www/natus
mkdir -p "$APP"
echo '${envB64}' | base64 -d > "$APP/.env.local"
chmod 600 "$APP/.env.local"

if [ -f "$APP/deploy/nginx/os.natusmarrakech.com.bootstrap.conf" ]; then
  cp "$APP/deploy/nginx/os.natusmarrakech.com.bootstrap.conf" /etc/nginx/sites-available/os.natusmarrakech.com
  ln -sf /etc/nginx/sites-available/os.natusmarrakech.com /etc/nginx/sites-enabled/os.natusmarrakech.com
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl reload nginx

cd "$APP"
if pm2 describe natus >/dev/null 2>&1; then
  pm2 restart natus --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save

ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw allow 3002/tcp >/dev/null 2>&1 || true

echo ""
echo "=== STATUS ==="
pm2 status
echo ""
grep -E "^(NEXT_PUBLIC_APP_URL|NEXT_PUBLIC_SUPABASE_URL)=" "$APP/.env.local"
echo ""
curl -s -o /dev/null -w "pm2_port3002:%{http_code}\\n" http://127.0.0.1:3002
curl -s -o /dev/null -w "nginx_port80:%{http_code}\\n" -H "Host: os.natusmarrakech.com" http://127.0.0.1/
echo ""
dig +short os.natusmarrakech.com || true
`;

  console.log("==> Fixing env, nginx, pm2...\n");
  const result = await exec(conn, fixScript);
  conn.end();
  process.exit(result.code ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
