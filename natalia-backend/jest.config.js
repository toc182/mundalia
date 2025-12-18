module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Coverage thresholds - fail if below these
  // Note: Start low and increase as more tests are added
  coverageThreshold: {
    global: {
      statements: 30,
      branches: 20,
      functions: 20,  // Start at 20%, increase to 30%+ over time
      lines: 30,
    },
  },
  verbose: true,
  testTimeout: 10000,
  // Setup file to run before tests
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
};
