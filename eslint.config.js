import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Existing
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'error',

      // Error prevention
      'no-constant-condition': 'warn',
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unreachable-loop': 'warn',

      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'warn',
      'prefer-template': 'warn',
      'no-throw-literal': 'error',

      // Style consistency
      'curly': ['warn', 'multi-line'],
      'dot-notation': 'warn',
      'no-else-return': 'warn',
      'no-lonely-if': 'warn',
      'prefer-arrow-callback': 'warn',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'coverage/', '**/*.min.js', 'tests/', 'nvim-ccasp/'],
  },
];
