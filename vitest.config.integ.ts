import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['integ/**/*.test.ts'],
    testTimeout: 20_000,
  },
});
