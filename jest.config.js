// Jest configuration for the Accessibility Highlighter tests
module.exports = {
  verbose: true,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./tests/setup-jest.js'],
  testMatch: ['**/tests/**/*.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  moduleFileExtensions: ['js', 'json', 'html'],
  transform: {
    '\\.html$': 'jest-html-loader',
  },
  testPathIgnorePatterns: ['/node_modules/', '/tests/fixtures/', '/tests/e2e/'],
  moduleDirectories: ['node_modules', 'tests'],
};