// apps/backend/scripts/run-prisma.js
/* eslint-disable */
const { spawnSync } = require('child_process');
const config = require('config');

const dbUrl = config.get('database.url');
if (!dbUrl) {
  console.error('[run-prisma] Missing database.url in config for this NODE_ENV');
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: dbUrl };

// Just call `npx` and let the shell resolve .cmd on Windows
const args = ['prisma', ...process.argv.slice(2)];
const res = spawnSync('npx', args, {
  stdio: 'inherit',
  env,
  shell: true,          // <-- important
});

process.exit(res.status ?? 0);
