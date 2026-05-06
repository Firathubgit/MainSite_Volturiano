import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/server/**/*.test.{js,ts}'],
    exclude: ['node_modules', 'dist', 'server/node_modules'],
    testTimeout: 15000,
    hookTimeout: 15000,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: process.env.CI ? { junit: 'test-results/vitest-junit.xml' } : undefined,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'test-results/coverage'
    }
  }
});
