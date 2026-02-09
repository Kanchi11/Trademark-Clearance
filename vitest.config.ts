import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '.next/',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'out'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})