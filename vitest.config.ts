import { defineConfig, type UserConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react() as unknown as NonNullable<UserConfig['plugins']>[number]],
  test: {
    environment: 'jsdom',
    setupFiles: ['test/unit/setup.ts'],
    include: ['test/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.stories.tsx', 'src/vite-env.d.ts'],
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: 'coverage/unit',
    },
  },
});
