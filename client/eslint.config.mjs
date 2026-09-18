// @ts-check
import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: globals.browser,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      // Flags the standard cancelled-flag data-fetching effect pattern
      // (https://react.dev/learn/synchronizing-with-effects#fetching-data)
      // as an error; downgraded rather than restructured around a data
      // library, matching this project's plain fetch + useEffect choice.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Composants shadcn/ui générés : co-localisent volontairement une
    // fonction de variantes (cva) avec le composant, motif standard de
    // l'écosystème shadcn que react-refresh ne reconnaît pas.
    files: ['src/components/ui/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
