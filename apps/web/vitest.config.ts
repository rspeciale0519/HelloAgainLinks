import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      MOBILE_AUTH_HANDOFF_SECRET: 'test-handoff-secret-for-unit-tests',
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
