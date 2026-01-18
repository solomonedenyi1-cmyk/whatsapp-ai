module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match pattern
  testMatch: ['**/test/**/*.test.js'],

  // Coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
    '!src/**/vendor/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],

  // Timeout settings
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Setup files
  setupFilesAfterEnv: [],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Reset modules between tests
  resetModules: false
};