const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Letter values ────────────────────────────────────────────────────────────
const LETTER_VALUES = {
  A:1,B:4,C:4,D:2,E:1,F:4,G:3,H:3,I:1,J:10,K:5,
  L:2,M:4,N:2,O:1,P:4,Q:10,R:1,S:1,T:1,U:2,V:5,
  W:4,X:8,Y:3,Z:10
};

function lv(ch) { return LETTER_VALUES[ch.toUpperCase()] || 1; }

// ─── Scoring formula ──────────────────────────────────────────────────────────
// Sorted descending: vals[0]=highest, vals[1]=2nd highest
// word_score = 3*vals[0] + 2*vals[1] + vals[2] + vals[3] + vals[4]
// final_score = word_score * 3  (Triple Word row)
function computeWordScore(word) {
  const v = word.toUpperCase().split('').map(lv).sort((a, b) => b - a);
  return 3*v[0] + 2*v[1] + v[2] + v[3] + v[4];
}

// ─── Precompute all valid sorted letter-value patterns ─────────────────────────
// Valid WWF letter values: 1,2,3,4,5,8,10
const VALID_VALS = [1, 2, 3, 4, 5, 8, 10];

// VALID_PATTERNS[target] = Set of pattern strings e.g. "4·3·2·1·1"
const VALID_PATTERNS = new Map();
for (const b1 of VALID_VALS)
  for (const b2 of VALID_VALS.filter(v => v <= b1))
    for (const b3 of VALID_VALS.filter(v => v <= b2))
      for (const b4 of VALID_VALS.filter(v => v <= b3))
        for (const b5 of VALID_VALS.filter(v => v <= b4)) {
          const ws = 3*b1 + 2*b2 + b3 + b4 + b5;
          const target = ws * 3;
          const key = `${b1}·${b2}·${b3}·${b4}·${b5}`;
          if (!VALID_PATTERNS.has(target)) VALID_PATTERNS.set(target, new Set());
          VALID_PATTERNS.get(target).add(key);
        }

// ─── Result word priority (most common letters first) ─────────────────────────
const PRIORITY_ORDER = 'TSROIEAUNLDYHGWPMFCBVKXZQJ'.split('');
const PRIORITY = Object.fromEntries(PRIORITY_ORDER.map((c, i) => [c, i]));

function wordPriority(word) {
  return word.toUpperCase().split('').reduce((s, ch) => s + (PRIORITY[ch] ?? 99), 0);
}

// ─── Letter pattern of a word (sorted desc, dot-joined) ───────────────────────
function letterPattern(word) {
  return word.toUpperCase().split('').map(lv).sort((a, b) => b - a).join('·');
}

// ─── Which positions are the top-3 highest-value letters ──────────────────────
// Tiebreaker: reverse alpha (Z beats A), then leftmost position wins
function top3Positions(word) {
  const w = word.toUpperCase();
  const ranked = w.split('').map((ch, i) => ({
    i, v: lv(ch), a: ch.charCodeAt(0) - 65
  }));
  ranked.sort((a, b) => {
    if (b.v !== a.v) return b.v - a.v;
    if (b.a !== a.a) return b.a - a.a;
    return a.i - b.i;
  });
  return new Set(ranked.slice(0, 3).map(r => r.i));
}

// Which positions get the TL (×3) and DL (×2) bonuses for display purposes
function bonusPositions(word) {
  const w = word.toUpperCase();
  const ranked = w.split('').map((ch, i) => ({
    i, v: lv(ch), a: ch.charCodeAt(0) - 65
  }));
  ranked.sort((a, b) => {
    if (b.v !== a.v) return b.v - a.v;
    if (b.a !== a.a) return b.a - a.a;
    return a.i - b.i;
  });
  return { tl: ranked[0].i, dl: ranked[1].i };
}

// ─── Word cache ───────────────────────────────────────────────────────────────
let _words = null;
function allWords() {
  if (!_words) {
    const db = new Database(path.join(__dirname, 'words.db'), { readonly: true });
    _words = db.prepare('SELECT word FROM words').all().map(r => r.word.toUpperCase());
    db.close();
    console.log(`Loaded ${_words.length} words into memory`);
  }
  return _words;
}

// ─── Smart starter suggestions ────────────────────────────────────────────────
function computeStarters(candidates) {
  if (candidates.length === 0) return [];

  // Positional letter frequency across all candidates
  const freq = [{},{},{},{},{}];
  for (const word of candidates)
    for (let i = 0; i < 5; i++)
      freq[i][word[i]] = (freq[i][word[i]] || 0) + 1;

  // Score each candidate by how often its letters appear at those positions
  const scored = candidates.map(word => {
    let score = 0;
    for (let i = 0; i < 5; i++) score += freq[i][word[i]] || 0;
    return { word, score };
  });
  scored.sort((a, b) => b.score - a.score || wordPriority(a.word) - wordPriority(b.word));

  // Return top 6, de-duplicated by pattern
  const seen = new Set();
  const starters = [];
  for (const { word } of scored) {
    const pat = letterPattern(word);
    if (!seen.has(pat)) { seen.add(pat); starters.push(word); }
    if (starters.length >= 6) break;
  }
  return starters;
}

// ─── /api/solve ───────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/solve', (req, res) => {
  const {
    score,
    tlPositions = '',
    mustInclude = '',
    mustExclude = '',
    blocked = '',
    pos0, pos1, pos2, pos3, pos4
  } = req.query;

  const targetScore = parseInt(score);

  if (!targetScore || targetScore % 3 !== 0 || targetScore < 24) {
    return res.json({ error: 'Score must be a positive multiple of 3 (minimum 24)' });
  }

  const baseScore = targetScore / 3;

  // Parse TL positions: "0,2,4" → Set{0,2,4}
  const tlPosSet = tlPositions
    ? new Set(tlPositions.split(',').map(Number).filter(n => n >= 0 && n <= 4))
    : new Set();
  const useTlFilter = tlPosSet.size === 3;

  // Letter filters
  const mustIncArr = mustInclude.toUpperCase().split('').filter(Boolean);
  const blockedSet = new Set([
    ...blocked.toUpperCase().split(''),
    ...mustExclude.toUpperCase().split('')
  ].filter(Boolean));

  // Exact position filters (pos0–pos4)
  const posFilters = [pos0, pos1, pos2, pos3, pos4].map(p => p ? p.toUpperCase() : null);

  const words = allWords();
  const matched = [];

  for (const word of words) {
    // ① Score check (fastest: arithmetic only)
    if (computeWordScore(word) !== baseScore) continue;

    // ② TL position check
    if (useTlFilter) {
      const top3 = top3Positions(word);
      let ok = true;
      for (const p of tlPosSet) if (!top3.has(p)) { ok = false; break; }
      if (!ok) continue;
    }

    // ③ Exact position filters
    let posOk = true;
    for (let i = 0; i < 5; i++)
      if (posFilters[i] && word[i] !== posFilters[i]) { posOk = false; break; }
    if (!posOk) continue;

    // ④ Must-include
    if (mustIncArr.some(ch => !word.includes(ch))) continue;

    // ⑤ Blocked / must-exclude
    if ([...word].some(ch => blockedSet.has(ch))) continue;

    matched.push(word);
  }

  matched.sort((a, b) => wordPriority(a) - wordPriority(b));

  // Group by sorted letter-value pattern
  const groupMap = new Map();
  for (const word of matched) {
    const pat = letterPattern(word);
    if (!groupMap.has(pat)) groupMap.set(pat, []);
    groupMap.get(pat).push({ word, bonus: bonusPositions(word) });
  }

  const groups = Array.from(groupMap.entries())
    .map(([pattern, words]) => ({ pattern, words }))
    .sort((a, b) => b.words.length - a.words.length);

  const starters = computeStarters(matched);

  res.json({ total: matched.length, groups, starters });
});

// ─── /api/patterns — list valid breakdowns for a score ────────────────────────
app.get('/api/patterns', (req, res) => {
  const target = parseInt(req.query.score);
  const patterns = VALID_PATTERNS.get(target);
  res.json({ patterns: patterns ? [...patterns].sort() : [] });
});

app.listen(PORT, () => {
  console.log(`Grok Guess Word — http://localhost:${PORT}`);
  allWords(); // preload word cache on startup
});
