import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Vite can't load the experimental `node:sqlite` builtin through its transform
// pipeline, so we alias it (tests only) to a CJS shim that re-exports the real
// native module at runtime.
const sqliteShim = fileURLToPath(new URL('./test/shims/node-sqlite.cjs', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^node:sqlite$/, replacement: sqliteShim }],
  },
  test: {
    pool: 'forks',
    // Pass the experimental flag to fork workers so node:sqlite loads — works on
    // any OS without needing NODE_OPTIONS set in the shell.
    poolOptions: { forks: { execArgv: ['--experimental-sqlite'] } },
    include: ['test/**/*.test.ts'],
    env: {
      RPG_DB_PATH: ':memory:', // never touch the real rpg.db
    },
  },
});
