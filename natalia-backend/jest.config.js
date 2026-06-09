module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'routes/**/*.ts',
    'middleware/**/*.ts',
    'utils/**/*.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 30,
      branches: 20,
      functions: 20,
      lines: 30,
    },
  },
  verbose: true,
  // Tests share a single database and some suites toggle global settings
  // (e.g. the predictions deadline), so run serially to avoid cross-file races.
  maxWorkers: 1,
  testTimeout: 10000,
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
};
