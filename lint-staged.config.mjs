/** @type {import('lint-staged').Configuration} */
export default {
  'frontend/**/*.{ts,tsx,js,jsx,mjs}': [
    'pnpm -C frontend exec eslint --fix --max-warnings=0',
    'pnpm -C frontend exec prettier --write',
  ],
  'frontend/**/*.{json,yml,yaml,css,md}': 'pnpm -C frontend exec prettier --write',
  'frontend/**/*.{ts,tsx,js,jsx,mjs,json,yml,yaml,css,md}': () =>
    'pnpm -C frontend type-check',
  'backend/**/*.py': [
    'uv run --project backend ruff check --fix',
    'uv run --project backend ruff format',
  ],
};
