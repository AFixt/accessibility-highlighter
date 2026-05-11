const js = require('@eslint/js');
const globals = require('globals');

// Some ESLint plugins ship as ESM-default; unwrap so CJS `require` works.
const interop = mod => mod?.default ?? mod;

const sonarjs = interop(require('eslint-plugin-sonarjs'));
const security = interop(require('eslint-plugin-security'));
const unicorn = interop(require('eslint-plugin-unicorn'));
const promise = interop(require('eslint-plugin-promise'));
const n = interop(require('eslint-plugin-n'));
const importX = interop(require('eslint-plugin-import-x'));
const noSecrets = interop(require('eslint-plugin-no-secrets'));
const jsdoc = interop(require('eslint-plugin-jsdoc'));
const prettier = require('eslint-config-prettier');

const projectIgnores = {
  ignores: [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'reports/**',
    'scratchpads/**',
    '**/*.bak',
    '**/*.bak2',
    'tests/fixtures/**',
    'tests/manual-test-runner.html'
  ]
};

const sharedBrowserGlobals = {
  ...globals.browser,
  ...globals.webextensions,
  chrome: 'readonly'
};

const projectRules = {
  'no-console': 'off',
  'no-debugger': 'error',
  'no-alert': 'warn',
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrors: 'none'
    }
  ],
  // ESLint 10 flags `_var = x` as useless; conflicts with the project's
  // underscore-prefix-for-intentionally-unused convention.
  'no-useless-assignment': 'off',
  // New rule expects `throw new X(...err.message, { cause: err })`; tracked
  // as follow-up.
  'preserve-caught-error': 'off',
  eqeqeq: ['error', 'always'],
  curly: ['error', 'all'],
  'dot-notation': 'error',
  camelcase: [
    'error',
    {
      properties: 'always',
      ignoreDestructuring: false,
      allow: [
        'A11Y_CONFIG',
        'INCREMENTAL_CONFIG',
        'data_a11ymessage',
        'aria_label',
        'aria_labelledby',
        'aria_describedby',
        // Firefox WebExtensions manifest keys (scripts/build.js)
        'browser_specific_settings',
        'strict_min_version'
      ]
    }
  ],
  'no-var': 'error',
  'prefer-const': 'error',
  'prefer-arrow-callback': 'error',
  'no-unused-expressions': 'error',
  'no-unreachable': 'error',
  'valid-typeof': 'error',
  'no-constant-condition': 'error',
  'no-cond-assign': ['error', 'except-parens'],
  'no-case-declarations': 'error',
  'no-restricted-globals': [
    'error',
    { name: 'event', message: 'Use local parameter instead of global event' }
  ],

  // Size and complexity gates. Thresholds are set so the current codebase
  // passes after the Phase 2b contentScript.js split; tighten further as
  // individual functions are refactored.
  'max-lines': ['error', { max: 1500, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
  complexity: ['error', { max: 40 }],
  'max-depth': ['error', 6],
  'max-nested-callbacks': ['error', 5],
  'max-params': ['error', 5]
};

// Plugin-recommended rules, scoped to severities that won't blow up the existing
// codebase. Stricter tightening is tracked as follow-up work.
const pluginRules = {
  // sonarjs — code smells, dead code, redundancy
  'sonarjs/no-identical-functions': 'error',
  'sonarjs/no-collapsible-if': 'error',
  'sonarjs/no-redundant-boolean': 'error',
  'sonarjs/no-redundant-jump': 'error',
  'sonarjs/no-unused-collection': 'error',
  'sonarjs/no-useless-catch': 'error',
  'sonarjs/prefer-immediate-return': 'error',
  'sonarjs/prefer-single-boolean-return': 'error',

  // security — common Node/browser pitfalls
  'security/detect-eval-with-expression': 'error',
  'security/detect-non-literal-regexp': 'error',
  'security/detect-unsafe-regex': 'error',
  'security/detect-buffer-noassert': 'error',
  'security/detect-child-process': 'error',
  'security/detect-pseudoRandomBytes': 'error',
  'security/detect-no-csrf-before-method-override': 'error',

  // unicorn — modern JS patterns (filename-case off; project uses camelCase)
  'unicorn/prevent-abbreviations': 'off',
  'unicorn/no-null': 'off',
  'unicorn/filename-case': 'off',
  'unicorn/no-array-for-each': 'off',
  'unicorn/prefer-top-level-await': 'off',
  'unicorn/prefer-module': 'off',
  'unicorn/explicit-length-check': 'error',
  'unicorn/no-array-reduce': 'off',

  // promise — async correctness
  'promise/no-return-wrap': 'error',
  'promise/param-names': 'error',
  'promise/catch-or-return': 'error',
  // The legacy chrome.* callback API style in background.js nests promises
  // under outer .then chains; refactoring to async/await is tracked
  // separately. See background.js lines 131, 166, 170.
  'promise/no-nesting': 'off',

  // n — Node-specific rules (light touch; most of this project is browser)
  'n/no-deprecated-api': 'error',
  'n/no-process-exit': 'error',

  // import-x — import hygiene
  'import-x/no-self-import': 'error',
  'import-x/no-useless-path-segments': 'error',
  'import-x/no-duplicates': 'error',

  // no-secrets — catches pasted API keys
  'no-secrets/no-secrets': [
    'error',
    { tolerance: 5, ignoreContent: ['https?://', 'data:image/', '^expect\\('] }
  ],

  // jsdoc — keep documentation accurate where it exists; do not force it on
  // every export yet (project has many undocumented internals).
  'jsdoc/check-tag-names': ['error', { definedTags: ['fileoverview'] }],
  'jsdoc/check-param-names': 'error',
  'jsdoc/check-types': 'error',
  'jsdoc/no-undefined-types': 'off',
  'jsdoc/require-jsdoc': 'off'
};

module.exports = [
  projectIgnores,
  js.configs.recommended,

  {
    plugins: {
      sonarjs,
      security,
      unicorn,
      promise,
      n,
      'import-x': importX,
      'no-secrets': noSecrets,
      jsdoc
    },
    rules: { ...projectRules, ...pluginRules }
  },

  // Browser/extension scripts (background.js, contentScript.js, etc.)
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: sharedBrowserGlobals
    }
  },

  // src/config.js uses ES module syntax (import/export).
  {
    files: ['src/config.js'],
    languageOptions: {
      sourceType: 'module'
    }
  },

  // Tests run under Jest with jsdom
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...sharedBrowserGlobals, ...globals.jest, ...globals.node }
    },
    rules: {
      'no-unused-expressions': 'off',
      'sonarjs/no-identical-functions': 'off',
      'security/detect-non-literal-regexp': 'off',
      // Test assertions use simple anchored patterns like /^\d+(\.\d+)?(px|em)$/
      // which the heuristic flags but are non-backtracking.
      'security/detect-unsafe-regex': 'off',
      'jsdoc/check-tag-names': 'off',
      // Jest `describe(...)` callbacks legitimately wrap entire test files;
      // size and nesting gates do not apply to test scaffolding.
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      complexity: 'off'
    }
  },

  // E2E test files have extension internals injected into the page context
  {
    files: ['tests/e2e/**/*.js'],
    languageOptions: {
      globals: {
        runAccessibilityChecks: 'readonly',
        removeAccessibilityOverlays: 'readonly',
        toggleAccessibilityHighlight: 'readonly',
        logs: 'readonly'
      }
    },
    rules: {
      'no-undef': 'off'
    }
  },

  // Repo-level Node tooling and config files
  {
    files: [
      'scripts/**/*.js',
      'jest.config.js',
      'eslint.config.js',
      'commitlint.config.js',
      'playwright.config.js',
      '.lintstagedrc.js'
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node
    }
  },

  // Disable rules that conflict with Prettier formatting (must be last).
  prettier
];
