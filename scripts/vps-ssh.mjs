import { Client } from "ssh2";

const host = process.env.NATUS_SSH_HOST;
const password = process.env.NATUS_SSH_PASS;
const command = process.argv.slice(2).join(" ");

if (!host || !password || !command) {
  console.error("Usage: NATUS_SSH_HOST=... NATUS_SSH_PASS=... node scripts/vps-ssh.mjs <command>");
  process.exit(1);
}

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(command, {}, (err, stream) => {
      if (err) {
        console.error(err.message);
        conn.end();
        process.exit(1);
      }
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
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
  .connect({ host, port: 22, username: "root", password });
