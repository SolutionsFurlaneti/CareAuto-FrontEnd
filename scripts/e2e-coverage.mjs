import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
mkdirSync('coverage/e2e', { recursive: true });
for (const f of readdirSync('coverage/e2e'))
  if (f.endsWith('.json')) unlinkSync('coverage/e2e/' + f);
const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
  stdio: 'inherit',
  env: { ...process.env, E2E_ISOLATED: 'true', COVERAGE: 'true' },
});
process.exit(result.status ?? 1);
