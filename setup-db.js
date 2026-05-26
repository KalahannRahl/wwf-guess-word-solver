const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'words.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE,
    score INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_score ON words(score);
  CREATE INDEX IF NOT EXISTS idx_word ON words(word);
`);

db.close();
console.log('Database created at', dbPath);
