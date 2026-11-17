import { defineConfig } from 'eslint/config';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Mesma base da API (typescript-eslint e prettier), mais as regras dos hooks do React.
export default defineConfig(
  { ignores: ['eslint.config.mjs', 'dist', 'coverage', '.expo'] },
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  prettierRecommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
