import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const db = new DatabaseSync(path.join(process.cwd(), 'rpg.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export default db;
