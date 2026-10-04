import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

// The goal of this config is to catch real mistakes (undefined names, broken
// hook usage) without reformatting the codebase. Style is left alone.
export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '.data/**', 'tmp/**', 'packages/registry/**'] },

  { linterOptions: { reportUnusedDisableDirectives: 'off' } },

  js.configs.recommended,

  {
    rules: {
      'no-unused-vars': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'no-case-declarations': 'off',
      'no-prototype-builtins': 'off',
    },
  },

  {
    files: ['apps/server/**/*.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    files: ['apps/web/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-key': 'warn',
      'react-hooks/rules-of-hooks': 'error',
    },
  },

  {
    files: ['apps/web/vite.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
