/**
 * Jest setup file - runs before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Extend Jest with custom matchers if needed
expect.extend({
  toBeValidToken(received) {
    const pass = typeof received === 'string' && received.length > 20;
    return {
      message: () => `expected ${received} to be a valid JWT token`,
      pass,
    };
  },
});

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
// };
