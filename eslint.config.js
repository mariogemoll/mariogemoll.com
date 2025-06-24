import importPlugin from 'eslint-plugin-import';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin
    },
    rules: {
      semi: ['error', 'always'],
      indent: ['error', 2],
      'max-len': ['error', { code: 100, tabWidth: 2, ignoreUrls: true }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'object-curly-spacing': ['error', 'always'],
      'space-before-function-paren': ['error', 'never'],
      'array-bracket-spacing': ['error', 'never'],
      'eol-last': ['error', 'always'],
      'no-trailing-spaces': 'error',
      'linebreak-style': ['error', 'unix'],
      'comma-dangle': ['error', 'never'],
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: false }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/member-ordering': ['error', {
        default: [
          'signature',
          'field',
          'constructor',
          'method',
        ]
      }],
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      }],
      'import/no-default-export': 'error',
      'import/no-relative-packages': 'error',

      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'yoda': ['error', 'never']
    }
  }
);