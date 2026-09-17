// Jest configuration for the Accessibility Highlighter tests
module.exports = {
  verbose: true,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./tests/setup-jest.js'],
  // Only *.test.js are suites. Matching every .js under tests/ also collected
  // the setup helpers, which contain no tests — Jest errors on those, and the
  // workaround was a dummy `expect(true).toBe(true)` registered into every
  // suite from setup-jest.js.
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  // A ratchet, not a target. Each number sits just under what that file
  // actually covers today, so coverage cannot silently fall; raising them is
  // how an improvement gets locked in. Coverage was collected and reported
  // here for a long time without ever being enforced (#122), which made it
  // the one quality signal in this repository that could rot unnoticed while
  // lint, duplication, licences and action pins were all gated.
  //
  // Every source file is listed individually, and that is load-bearing rather
  // than verbose. Jest removes a path with its own threshold from the pool
  // that `global` is measured over, so naming only the well-covered files
  // would leave `global` measuring the poorly-covered remainder — with just
  // elementChecks.js broken out, global fell from 20.22% to 12.9% and the run
  // failed. Measured, not assumed. With every file named, `global` applies to
  // whatever is added next, which is the floor a new file has to clear.
  //
  // The spread is the reason a single global number would not do: 63% for
  // elementChecks.js against 3% for uiPanels.js. One average lets the good
  // file fall a long way before anything notices.
  coverageThreshold: {
    // The floor for any source file added from here on.
    global: { statements: 20, branches: 27, functions: 15, lines: 20 },
    './src/background.js': { statements: 31, branches: 22, functions: 7, lines: 31 },
    './src/contentScript.js': { statements: 23, branches: 14, functions: 25, lines: 23 },
    './src/elementChecks.js': { statements: 63, branches: 68, functions: 73, lines: 63 },
    // Both of these carried `functions: 0` when the ratchet was first set —
    // a floor that could never fail, on the two largest coverage gaps in the
    // project (#128). tests/report-generators.test.js took reportGenerators.js
    // from 0% to 65% of functions, and tests/report-escaping.test.js (#131)
    // carried it to 70%, which is what makes a real floor possible here. uiPanels.js came off zero incidentally, because the report
    // generators call its categorizeIssue and analyzeLogs; 1% is a weak floor
    // but it is a floor, and it is honest about the level.
    './src/reportGenerators.js': { statements: 47, branches: 66, functions: 70, lines: 47 },
    './src/uiPanels.js': { statements: 6, branches: 32, functions: 1, lines: 6 }
  },
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
