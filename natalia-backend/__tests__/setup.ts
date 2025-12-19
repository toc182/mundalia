/**
 * Jest setup file - runs before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Extend Jest matchers interface
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidToken(): R;
    }
  }
}

// Extend Jest with custom matchers
expect.extend({
  toBeValidToken(received: unknown) {
    const pass = typeof received === 'string' && received.length > 20;
    return {
      message: () => `expected ${received} to be a valid JWT token`,
      pass,
    };
  },
});

// Global test timeout
jest.setTimeout(10000);

export {};
