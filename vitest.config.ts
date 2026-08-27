import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'packages/shared/src/**/*.test.ts',
      'apps/api/src/**/*.test.ts',
      'apps/web/__tests__/**/*.test.ts',
    ],
  },
});
