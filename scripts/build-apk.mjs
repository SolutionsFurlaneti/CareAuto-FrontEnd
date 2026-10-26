import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const release = process.argv.includes('--release');
const windows = process.platform === 'win32';
const result = spawnSync(
  windows ? 'cmd.exe' : 'bash',
  windows
    ? ['/d', '/c', 'gradlew.bat', release ? 'assembleRelease' : 'assembleDebug']
    : ['./gradlew', release ? 'assembleRelease' : 'assembleDebug'],
  {
    cwd: fileURLToPath(new URL('../android', import.meta.url)),
    stdio: 'inherit',
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
