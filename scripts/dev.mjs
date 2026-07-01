import { existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import { execSync, spawnSync } from "child_process";

const root = process.cwd();
const lockPath = resolve(root, ".next/dev/lock");
const port = process.env.PORT || "3000";

function getListeningPids(targetPort) {
  if (process.platform === "win32") {
    try {
      const out = execSync(`netstat -ano | findstr ":${targetPort} "`, {
        encoding: "utf8",
      });
      const pids = new Set();
      for (const line of out.split("\n")) {
        if (!line.includes("LISTENING")) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) pids.add(pid);
      }
      return [...pids];
    } catch {
      return [];
    }
  }

  try {
    const out = execSync(`lsof -ti :${targetPort} -sTCP:LISTEN`, {
      encoding: "utf8",
    });
    return out
      .trim()
      .split("\n")
      .filter((pid) => /^\d+$/.test(pid));
  } catch {
    return [];
  }
}

function isNodeProcess(pid) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
        encoding: "utf8",
      });
      return out.toLowerCase().includes("node.exe");
    }
    const out = execSync(`ps -p ${pid} -o comm=`, { encoding: "utf8" });
    return out.toLowerCase().includes("node");
  } catch {
    return false;
  }
}

function killPid(pid) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

for (const pid of getListeningPids(port)) {
  if (!isNodeProcess(pid)) continue;
  console.log(`→ Arrêt du serveur Node sur le port ${port} (PID ${pid})`);
  killPid(pid);
}

if (existsSync(lockPath)) {
  unlinkSync(lockPath);
}

const migrate = spawnSync("node", ["scripts/db-migrate.mjs", "--if-configured"], {
  cwd: root,
  stdio: "inherit",
});

if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

const nextBin =
  process.platform === "win32"
    ? resolve(root, "node_modules/next/dist/bin/next")
    : resolve(root, "node_modules/.bin/next");

const dev = spawnSync(process.execPath, [nextBin, "dev", "-p", port], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: port },
});

process.exit(dev.status ?? 1);
