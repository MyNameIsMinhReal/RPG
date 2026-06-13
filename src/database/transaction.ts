import db from './connection';

let savepointCounter = 0;

/**
 * Run `fn` inside a SQLite SAVEPOINT and commit (RELEASE) it on success, or roll
 * back on any thrown error. Returns whatever `fn` returns.
 *
 * Why SAVEPOINT instead of BEGIN/COMMIT: savepoints nest safely. A plain
 * `BEGIN` throws "cannot start a transaction within a transaction" if one is
 * already open, so wrapping a helper that itself uses BEGIN inside another
 * transaction would crash. SAVEPOINT works whether or not a transaction is
 * already active, making this composable.
 *
 * Usage:
 *   withTransaction(() => {
 *     stmtA.run(...);
 *     stmtB.run(...);
 *   });
 */
export function withTransaction<T>(fn: () => T): T {
  const name = `sp_${++savepointCounter}`;
  db.exec(`SAVEPOINT ${name}`);
  try {
    const result = fn();
    db.exec(`RELEASE ${name}`);
    return result;
  } catch (err) {
    // Roll the inner changes back, then release the (now-empty) savepoint so we
    // don't leak it. Guard the release so the original error is what propagates.
    try {
      db.exec(`ROLLBACK TO ${name}`);
      db.exec(`RELEASE ${name}`);
    } catch {
      /* ignore secondary cleanup errors — rethrow the real one below */
    }
    throw err;
  }
}
