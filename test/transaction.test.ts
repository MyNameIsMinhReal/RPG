import { describe, it, expect, beforeAll } from 'vitest';
import db from '../src/database/connection';
import { withTransaction } from '../src/database/transaction';

beforeAll(() => {
  db.exec('CREATE TABLE IF NOT EXISTS tx_test (id INTEGER PRIMARY KEY, v INTEGER)');
  db.exec('DELETE FROM tx_test');
});

function count(): number {
  return (db.prepare('SELECT COUNT(*) AS c FROM tx_test').get() as { c: number }).c;
}

describe('withTransaction (SAVEPOINT-based)', () => {
  it('commits all writes on success', () => {
    withTransaction(() => {
      db.prepare('INSERT INTO tx_test (v) VALUES (1)').run();
      db.prepare('INSERT INTO tx_test (v) VALUES (2)').run();
    });
    expect(count()).toBe(2);
  });

  it('rolls everything back when the body throws', () => {
    const before = count();
    expect(() =>
      withTransaction(() => {
        db.prepare('INSERT INTO tx_test (v) VALUES (3)').run();
        throw new Error('boom');
      })
    ).toThrow('boom');
    expect(count()).toBe(before); // row 3 rolled back
  });

  it('nests safely: inner rollback does not abort the outer transaction', () => {
    const before = count();
    withTransaction(() => {
      db.prepare('INSERT INTO tx_test (v) VALUES (10)').run();
      // inner transaction fails and is rolled back, but is caught here
      try {
        withTransaction(() => {
          db.prepare('INSERT INTO tx_test (v) VALUES (11)').run();
          throw new Error('inner');
        });
      } catch { /* swallow */ }
      db.prepare('INSERT INTO tx_test (v) VALUES (12)').run();
    });
    // outer rows 10 and 12 committed; inner row 11 rolled back → +2
    expect(count()).toBe(before + 2);
  });

  it('returns the body return value', () => {
    const result = withTransaction(() => 42);
    expect(result).toBe(42);
  });
});
