/** PM2 — Natus production (port 3002, nginx → 127.0.0.1:3002) */
module.exports = {
  apps: [
    {
      name: "natus",
      cwd: `${__dirname}/..`,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3002",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PORT: "3002",
      },
    },
  ],
};
