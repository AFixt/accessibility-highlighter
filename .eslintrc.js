module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    webextensions: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script'
  },
  globals: {
    // Chrome extension APIs
    chrome: 'readonly',
    
    // Test globals
    global: 'writable',
    jest: 'readonly',
    expect: 'readonly',
    test: 'readonly',
    describe: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly',
    
    // DOM globals
    window: 'readonly',
    document: 'readonly',
    console: 'readonly',
    performance: 'readonly',
    requestAnimationFrame: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    URL: 'readonly',
    Blob: 'readonly',
    Node: 'readonly',
    NodeFilter: 'readonly',
    TreeWalker: 'readonly'
  },
  rules: {
    // Code quality
    'no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_'
    }],
    'no-console': 'off', // Allow console for debugging
    'no-debugger': 'error',
    'no-alert': 'warn',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    
    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'dot-notation': 'error',
    'no-multi-spaces': 'error',
    'no-trailing-spaces': 'error',
    'no-multiple-empty-lines': ['error', { 'max': 2 }],
    
    // Style consistency
    'indent': ['error', 2, { 
      'SwitchCase': 1,
      'MemberExpression': 1
    }],
    'quotes': ['error', 'single', { 
      'avoidEscape': true,
      'allowTemplateLiterals': true 
    }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-function-paren': ['error', {
      'anonymous': 'never',
      'named': 'never',
      'asyncArrow': 'always'
    }],
    'keyword-spacing': 'error',
    'space-infix-ops': 'error',
    'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
    
    // Naming conventions
    'camelcase': ['error', { 
      'properties': 'always',
      'ignoreDestructuring': false,
      'allow': [
        'A11Y_CONFIG',
        'INCREMENTAL_CONFIG',
        'data_a11ymessage',
        'aria_label',
        'aria_labelledby',
        'aria_describedby'
      ]
    }],
    
    // Function and variable declarations
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'arrow-parens': ['error', 'as-needed'],
    
    // Error prevention
    'no-undef': 'error',
    'no-unused-expressions': 'error',
    'no-unreachable': 'error',
    'valid-typeof': 'error',
    'no-constant-condition': 'error',
    'no-cond-assign': ['error', 'except-parens'],
    'no-case-declarations': 'error',
    
    // Chrome extension specific
    'no-restricted-globals': ['error', {
      'name': 'event',
      'message': 'Use local parameter instead of global event'
    }],
    
    // JSDoc enforcement for functions
    'valid-jsdoc': ['warn', {
      'requireReturn': false,
      'requireReturnDescription': false,
      'requireParamDescription': true,
      'prefer': {
        'return': 'returns'
      }
    }],
    'require-jsdoc': ['warn', {
      'require': {
        'FunctionDeclaration': true,
        'MethodDefinition': false,
        'ClassDeclaration': false,
        'ArrowFunctionExpression': false,
        'FunctionExpression': false
      }
    }]
  },
  overrides: [
    {
      // Specific rules for test files
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-unused-expressions': 'off',
        'require-jsdoc': 'off',
        'valid-jsdoc': 'off',
        'no-unused-vars': ['error', { 
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_'
        }]
      }
    },
    {
      // E2E test files have access to global functions
      files: ['tests/e2e/**/*.js'],
      globals: {
        'runAccessibilityChecks': 'readonly',
        'removeAccessibilityOverlays': 'readonly',
        'toggleAccessibilityHighlight': 'readonly',
        'logs': 'readonly'
      },
      rules: {
        'no-undef': 'off'
      }
    },
    {
      // Specific rules for configuration files
      files: ['.eslintrc.js', 'jest.config.js'],
      env: {
        node: true
      },
      rules: {
        'require-jsdoc': 'off'
      }
    }
  ]
};