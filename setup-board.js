const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'board.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS words (
    word TEXT PRIMARY KEY
  );
  CREATE INDEX IF NOT EXISTS idx_len ON words(length(word));
`);

db.close();
console.log('board.db created at', dbPath);
