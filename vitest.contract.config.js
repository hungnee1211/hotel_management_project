import { defineConfig } from 'vitest/config';
// Runs the REAL frontend API layer against a REAL running backend (see tests/contract).
export default defineConfig({ test: { environment: 'node', include: ['tests/contract/**/*.test.js'], testTimeout: 30000, hookTimeout: 60000, fileParallelism: false } });
