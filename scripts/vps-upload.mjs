import { Client } from "ssh2";

const host = process.env.NATUS_SSH_HOST;
const username = process.env.NATUS_SSH_USER || "root";
const password = process.env.NATUS_SSH_PASS;
const localPath = process.argv[2];
const remotePath = process.argv[3];

if (!host || !password || !localPath || !remotePath) {
  console.error(
    "Usage: NATUS_SSH_HOST=... NATUS_SSH_PASS=... node scripts/vps-upload.mjs <local> <remote>"
  );
  process.exit(1);
}

const conn = new Client();

conn
  .on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) {
        console.error(err.message);
        conn.end();
        process.exit(1);
      }

      sftp.fastPut(localPath, remotePath, (putErr) => {
        conn.end();
        if (putErr) {
          console.error(putErr.message);
          process.exit(1);
        }
        console.log(`Uploaded ${localPath} -> ${remotePath}`);
      });
    });
  })
  .on("error", (err) => {
    console.error(err.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username, password });
