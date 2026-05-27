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
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/solve', (req, res) => {
  const {
    score,
    tlPos = '',
    dlPos = '',
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

  // TL/DL position lock — exact bonus position filter
  // tlPos = 0-4 index where the highest-value letter must land (TL ×3)
  // dlPos = 0-4 index where the 2nd-highest-value letter must land (DL ×2)
  const tlPosLock = tlPos !== '' ? parseInt(tlPos) : null;
  const dlPosLock = dlPos !== '' ? parseInt(dlPos) : null;

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

    // ② TL/DL position lock check
    if (tlPosLock !== null || dlPosLock !== null) {
      const bp = bonusPositions(word);
      if (tlPosLock !== null && bp.tl !== tlPosLock) continue;
      if (dlPosLock !== null && bp.dl !== dlPosLock) continue;
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

// ─── WWF Board Solver ─────────────────────────────────────────────────────────

const WWF_BONUS_MAP = (function () {
  const m = Array.from({ length: 15 }, () => new Array(15).fill(''));
  [[0,3],[0,11],[3,0],[3,14],[11,0],[11,14],[14,3],[14,11]].forEach(([r,c]) => { m[r][c] = 'TW'; });
  [[1,1],[1,13],[2,2],[2,12],[3,7],[4,4],[4,10],[7,3],[7,7],[7,11],[10,4],[10,10],[11,7],[12,2],[12,12],[13,1],[13,13]].forEach(([r,c]) => { m[r][c] = 'DW'; });
  [[1,5],[1,9],[3,3],[3,11],[5,1],[5,5],[5,9],[5,13],[9,1],[9,5],[9,9],[9,13],[11,3],[11,11],[13,5],[13,9]].forEach(([r,c]) => { m[r][c] = 'TL'; });
  [[0,6],[0,8],[2,6],[2,8],[6,0],[6,2],[6,6],[6,8],[6,12],[6,14],[8,0],[8,2],[8,6],[8,8],[8,12],[8,14],[12,6],[12,8],[14,6],[14,8]].forEach(([r,c]) => { m[r][c] = 'DL'; });
  return m;
})();

let _boardCache = null;
function getBoardCache() {
  if (_boardCache) return _boardCache;
  let db;
  try { db = new Database(path.join(__dirname, 'board.db'), { readonly: true }); }
  catch (e) {
    console.warn('board.db not found — run: npm run board-setup');
    _boardCache = { wordSet: new Set(), charIdx: new Map(), wordsByLen: new Map() };
    return _boardCache;
  }
  const words = db.prepare('SELECT word FROM words').all().map(r => r.word.toUpperCase());
  db.close();
  const wordSet = new Set(words);
  const charIdx = new Map();
  const wordsByLen = new Map();
  for (const word of words) {
    const L = word.length;
    if (!wordsByLen.has(L)) wordsByLen.set(L, []);
    wordsByLen.get(L).push(word);
    if (!charIdx.has(L)) charIdx.set(L, Array.from({ length: L }, () => new Map()));
    const pa = charIdx.get(L);
    for (let i = 0; i < L; i++) {
      const ch = word[i];
      if (!pa[i].has(ch)) pa[i].set(ch, []);
      pa[i].get(ch).push(word);
    }
  }
  _boardCache = { wordSet, charIdx, wordsByLen };
  console.log(`Board cache: ${words.length} words loaded`);
  return _boardCache;
}

// Find word candidates whose letters match a fixed-char pattern
function boardCandidates(cache, seg) {
  const { charIdx, wordsByLen } = cache;
  const L = seg.length;
  const fixed = seg.map((ch, i) => ch ? { i, ch } : null).filter(Boolean);
  if (fixed.length === 0) return wordsByLen.get(L) || [];
  const pa = charIdx.get(L);
  if (!pa) return [];
  fixed.sort((a, b) => (pa[a.i].get(a.ch)?.length ?? 1e9) - (pa[b.i].get(b.ch)?.length ?? 1e9));
  const base = pa[fixed[0].i].get(fixed[0].ch);
  if (!base) return [];
  if (fixed.length === 1) return base;
  return base.filter(w => {
    for (let k = 1; k < fixed.length; k++) if (w[fixed[k].i] !== fixed[k].ch) return false;
    return true;
  });
}

// Check if rack can supply needed letters (? = blank)
function rackHas(rack, needed) {
  const r = [...rack];
  for (const ch of needed) {
    const i = r.indexOf(ch);
    if (i !== -1) { r.splice(i, 1); continue; }
    const b = r.indexOf('?');
    if (b !== -1) { r.splice(b, 1); continue; }
    return false;
  }
  return true;
}

// Returns Set of indices into `needed` where a blank tile is used
function blankAssign(rack, needed) {
  const r = [...rack];
  const blanks = new Set();
  for (let j = 0; j < needed.length; j++) {
    const i = r.indexOf(needed[j]);
    if (i !== -1) { r.splice(i, 1); continue; }
    r.splice(r.indexOf('?'), 1);
    blanks.add(j);
  }
  return blanks;
}

// Get cross-word string when placing letter at (r,c); crossVert=true = vertical cross
function crossWordAt(board, r, c, letter, crossVert) {
  if (crossVert) {
    let r0 = r; while (r0 > 0 && board[r0 - 1][c]) r0--;
    let r1 = r; while (r1 < 14 && board[r1 + 1][c]) r1++;
    if (r0 === r1) return null;
    let w = ''; for (let rr = r0; rr <= r1; rr++) w += rr === r ? letter : board[rr][c]; return w;
  } else {
    let c0 = c; while (c0 > 0 && board[r][c0 - 1]) c0--;
    let c1 = c; while (c1 < 14 && board[r][c1 + 1]) c1++;
    if (c0 === c1) return null;
    let w = ''; for (let cc = c0; cc <= c1; cc++) w += cc === c ? letter : board[r][cc]; return w;
  }
}

function calcBoardScore(word, startR, startC, isVert, board, rack) {
  // Identify new tile positions and which use blanks
  const newIdx = [], needed = [];
  for (let i = 0; i < word.length; i++) {
    const r = isVert ? startR + i : startR, c = isVert ? startC : startC + i;
    if (!board[r][c]) { newIdx.push(i); needed.push(word[i]); }
  }
  const blankJs = blankAssign(rack, needed);
  const wordBlanks = new Set(newIdx.filter((_, j) => blankJs.has(j)));
  const newSet = new Set(newIdx);

  // Main word score
  let mSum = 0, mMult = 1;
  for (let i = 0; i < word.length; i++) {
    const r = isVert ? startR + i : startR, c = isVert ? startC : startC + i;
    const v = wordBlanks.has(i) ? 0 : lv(word[i]);
    if (newSet.has(i)) {
      const b = WWF_BONUS_MAP[r][c];
      mSum += b === 'TL' ? v * 3 : b === 'DL' ? v * 2 : v;
      if (b === 'TW') mMult *= 3; else if (b === 'DW') mMult *= 2;
    } else { mSum += lv(word[i]); }
  }
  let total = mSum * mMult;

  // Cross-word scores for each new tile
  for (let j = 0; j < newIdx.length; j++) {
    const i = newIdx[j];
    const r = isVert ? startR + i : startR, c = isVert ? startC : startC + i;
    const v = wordBlanks.has(i) ? 0 : lv(word[i]);
    const b = WWF_BONUS_MAP[r][c];
    const hasCross = isVert
      ? (c > 0 && board[r][c - 1]) || (c < 14 && board[r][c + 1])
      : (r > 0 && board[r - 1][c]) || (r < 14 && board[r + 1][c]);
    if (!hasCross) continue;
    let cSum = 0, cMult = 1;
    if (isVert) {
      let c0 = c; while (c0 > 0 && board[r][c0 - 1]) c0--;
      let c1 = c; while (c1 < 14 && board[r][c1 + 1]) c1++;
      for (let cc = c0; cc <= c1; cc++) {
        if (cc === c) { cSum += b === 'TL' ? v * 3 : b === 'DL' ? v * 2 : v; if (b === 'TW') cMult *= 3; else if (b === 'DW') cMult *= 2; }
        else cSum += lv(board[r][cc]);
      }
    } else {
      let r0 = r; while (r0 > 0 && board[r0 - 1][c]) r0--;
      let r1 = r; while (r1 < 14 && board[r1 + 1][c]) r1++;
      for (let rr = r0; rr <= r1; rr++) {
        if (rr === r) { cSum += b === 'TL' ? v * 3 : b === 'DL' ? v * 2 : v; if (b === 'TW') cMult *= 3; else if (b === 'DW') cMult *= 2; }
        else cSum += lv(board[rr][c]);
      }
    }
    total += cSum * cMult;
  }
  if (newIdx.length === 7) total += 35; // bingo bonus
  return total;
}

function findAllPlays(board, rack) {
  const cache = getBoardCache();
  if (cache.wordSet.size === 0)
    throw new Error('Board dictionary not loaded — run: npm run board-setup');
  const { wordSet } = cache;
  const plays = [];

  let isEmpty = true;
  outer: for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) if (board[r][c]) { isEmpty = false; break outer; }

  for (const isVert of [false, true]) {
    for (let lineIdx = 0; lineIdx < 15; lineIdx++) {
      const line = [];
      for (let i = 0; i < 15; i++) line.push(isVert ? board[i][lineIdx] : board[lineIdx][i]);

      for (let start = 0; start < 15; start++) {
        if (start > 0 && line[start - 1]) continue; // tile before start — invalid boundary

        for (let len = 2; start + len <= 15; len++) {
          const end = start + len - 1;
          if (end + 1 < 15 && line[end + 1]) continue; // tile after end — try longer

          const seg = line.slice(start, start + len);
          let existCnt = 0;
          const newPos = [];
          for (let i = 0; i < len; i++) { if (seg[i]) existCnt++; else newPos.push(i); }
          if (newPos.length === 0 || newPos.length > rack.length) continue;

          // Connectivity check
          if (isEmpty) {
            let cc = false;
            for (let i = 0; i < len; i++) {
              const r = isVert ? start + i : lineIdx, c = isVert ? lineIdx : start + i;
              if (r === 7 && c === 7) { cc = true; break; }
            }
            if (!cc) continue;
          } else if (existCnt === 0) {
            let conn = false;
            for (const i of newPos) {
              const r = isVert ? start + i : lineIdx, c = isVert ? lineIdx : start + i;
              const hp = isVert
                ? (c > 0 && board[r][c - 1]) || (c < 14 && board[r][c + 1])
                : (r > 0 && board[r - 1][c]) || (r < 14 && board[r + 1][c]);
              if (hp) { conn = true; break; }
            }
            if (!conn) continue;
          }

          for (const word of boardCandidates(cache, seg)) {
            const needed = newPos.map(i => word[i]);
            if (!rackHas(rack, needed)) continue;

            let crossOk = true;
            for (const i of newPos) {
              const r = isVert ? start + i : lineIdx, c = isVert ? lineIdx : start + i;
              const cw = crossWordAt(board, r, c, word[i], !isVert);
              if (cw && !wordSet.has(cw)) { crossOk = false; break; }
            }
            if (!crossOk) continue;

            const startR = isVert ? start : lineIdx, startC = isVert ? lineIdx : start;
            plays.push({
              word, row: startR, col: startC, isVert,
              score: calcBoardScore(word, startR, startC, isVert, board, rack)
            });
          }
        }
      }
    }
  }

  plays.sort((a, b) => b.score - a.score || a.word.length - b.word.length);
  return plays;
}

app.post('/api/board-solve', (req, res) => {
  const { board, rack } = req.body || {};
  if (!Array.isArray(board) || board.length !== 15 || !Array.isArray(rack))
    return res.json({ error: 'board (15×15 array) and rack (array) required' });

  const nb = board.map(row => {
    const r = Array.isArray(row) ? row : [];
    return Array.from({ length: 15 }, (_, i) => {
      const ch = (r[i] || '').toString().toUpperCase().trim();
      return /^[A-Z]$/.test(ch) ? ch : '';
    });
  });
  while (nb.length < 15) nb.push(new Array(15).fill(''));

  const nr = rack
    .map(c => { const ch = (c || '').toString().toUpperCase().trim(); return ch === '?' ? '?' : /^[A-Z]$/.test(ch) ? ch : null; })
    .filter(Boolean);
  if (nr.length === 0) return res.json({ error: 'rack is empty' });

  try {
    const plays = findAllPlays(nb, nr);
    return res.json({ total: plays.length, plays: plays.slice(0, 500) });
  } catch (e) {
    console.error('board-solve:', e.message);
    return res.json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Grok Guess Word — http://localhost:${PORT}`);
  allWords(); // preload word cache on startup
  try { getBoardCache(); } catch (e) { /* board.db optional at startup */ }
});
