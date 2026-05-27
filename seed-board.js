const Database = require('better-sqlite3');
const https = require('https');
const http = require('http');
const path = require('path');

// Same sources as seed-db.js — no length filter (accept 2–15 letter words)
const WORD_SOURCES = [
  'https://raw.githubusercontent.com/redbo/scrabblewords/master/dictionary.txt',
  'https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt',
  'https://raw.githubusercontent.com/lorenbrichter/Words/master/Words/en.txt',
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const db = new Database(path.join(__dirname, 'board.db'));
  db.exec('DELETE FROM words');

  const allWords = new Set();

  for (const url of WORD_SOURCES) {
    try {
      console.log(`Fetching ${url}...`);
      const text = await fetchUrl(url);
      const words = text.split(/\s+/)
        .map(w => w.trim().toUpperCase())
        .filter(w => /^[A-Z]{2,15}$/.test(w));
      words.forEach(w => allWords.add(w));
      console.log(`  +${words.length} words (total: ${allWords.size})`);
    } catch (e) {
      console.warn(`  Failed: ${e.message}`);
    }
  }

  console.log(`\nSeeding ${allWords.size} words into board.db...`);
  const ins = db.prepare('INSERT OR IGNORE INTO words (word) VALUES (?)');
  const insertAll = db.transaction(list => { for (const w of list) ins.run(w); });
  insertAll([...allWords]);

  const { cnt } = db.prepare('SELECT COUNT(*) as cnt FROM words').get();
  console.log(`Done. board.db contains ${cnt} words.`);
  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
