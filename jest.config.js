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
  moduleFileExtensions: ['js', 'json'],
  // No transforms: the sources are plain CommonJS and run as-is under Node.
  // This must stay an explicit empty object rather than being omitted —
  // omitting `transform` restores Jest's default babel-jest mapping for .js,
  // which is not what this suite has ever run with.
  transform: {},
  testPathIgnorePatterns: ['/node_modules/', '/tests/fixtures/', '/tests/e2e/'],
  moduleDirectories: ['node_modules', 'tests'],
  setupFiles: ['<rootDir>/tests/setup-env.js']
};
