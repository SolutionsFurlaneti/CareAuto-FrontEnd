import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
export default ts.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'playwright-report',
      'test-results',
      'storybook-static',
      'artifacts',
      'dist-android',
      'android',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': hooks },
    rules: {
      ...hooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Use lib/apiClient.' }],
    },
  },
  { files: ['src/lib/apiClient.ts', 'frontend/src/lib/apiClient.ts', 'test/**'], rules: { 'no-restricted-globals': 'off' } },
  { files: ['**/*.{js,mjs}'], languageOptions: { globals: globals.node } },
);
