import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['integ/**/*.integ.ts'],
    testTimeout: 30_000,
  },
});
