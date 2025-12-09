// Jest configuration for the Accessibility Highlighter tests
module.exports = {
  verbose: true,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./tests/setup-jest.js'],
  testMatch: ['**/tests/**/*.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/contentScript-original.js',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  moduleFileExtensions: ['js', 'json', 'html'],
  transform: {
    '\\.html$': 'jest-html-loader'
  },
  testPathIgnorePatterns: ['/node_modules/', '/tests/fixtures/', '/tests/e2e/'],
  moduleDirectories: ['node_modules', 'tests'],
  setupFiles: ['<rootDir>/tests/setup-env.js']
};