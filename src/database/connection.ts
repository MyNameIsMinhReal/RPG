import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

// DB location is configurable so tests can point at an in-memory database
// (RPG_DB_PATH=':memory:') without touching the real rpg.db file.
const dbPath = process.env.RPG_DB_PATH
  ? process.env.RPG_DB_PATH
  : path.join(process.cwd(), 'rpg.db');

const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export default db;
