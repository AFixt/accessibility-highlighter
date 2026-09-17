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
    './src/background.js': { statements: 95, branches: 96, functions: 92, lines: 95 },
    './src/contentScript.js': { statements: 46, branches: 38, functions: 50, lines: 46 },
    './src/elementChecks.js': { statements: 71, branches: 71, functions: 84, lines: 71 },
    // A floor must sit under the WORST run, not the best. contentScript.js
    // measures anywhere from 46.92% to 48.89% of statements and 38.3% to
    // 40.29% of branches depending on the order Jest happens to run the
    // suites in, because several of them require it and leave different
    // globals behind. elementChecks.js branches swings across 72 the same way.
    // Both were pinned at a figure inside that band and failed intermittently;
    // they are now at the observed minimum. The non-determinism itself is
    // #142 — a gate that fails at random teaches people to re-run until it
    // passes, which costs more than the two points it was guarding. Raise
    // these back once that is fixed.
    //
    // background.js went 31 -> 95 in #141: the service worker's toggle, its
    // six error branches and its three listeners had no tests, and the
    // listeners are only reachable by capturing what addListener was handed.
    //
    // uiPanels.js jumped again in #139, 16 -> 87, when the panels themselves
    // got tests: the filter, summary and configuration panels and the progress
    // indicator were the largest untested surface left, and they only became
    // testable once the createElement stub was gone.
    //
    // The jump before that is #137: tests/highlighter.test.js stopped
    // asserting against mocks of the extension's own functions and started
    // running the real scan, which reaches a great deal of code nothing had
    // executed before. contentScript.js went 25 -> 46, elementChecks.js
    // 63 -> 71, uiPanels.js 6 -> 16.
    //
    // Both of these carried `functions: 0` when the ratchet was first set —
    // a floor that could never fail, on the two largest coverage gaps in the
    // project (#128). tests/report-generators.test.js took reportGenerators.js
    // from 0% to 65% of functions, and tests/report-escaping.test.js (#131)
    // carried it to 70%, which is what makes a real floor possible here. uiPanels.js came off zero incidentally, because the report
    // generators call its categorizeIssue and analyzeLogs; 1% is a weak floor
    // but it is a floor, and it is honest about the level.
    './src/reportGenerators.js': { statements: 48, branches: 71, functions: 70, lines: 48 },
    './src/uiPanels.js': { statements: 87, branches: 78, functions: 70, lines: 88 }
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
