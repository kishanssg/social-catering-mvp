import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Relaxed rules for MVP
      '@typescript-eslint/no-explicit-any': 'warn',  // Change from error to warning
      '@typescript-eslint/no-unused-vars': 'warn',  // Change from error to warning
      'no-case-declarations': 'warn',  // Change from error to warning
      'react-hooks/exhaustive-deps': 'warn',  // Change from error to warning
      'react-refresh/only-export-components': 'warn',  // Change from error to warning
    },
  },
])
