const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const entries = db.prepare(
    'SELECT * FROM entries WHERE user_id = ? ORDER BY date ASC'
  ).all(req.userId);
  res.json(entries);
});

router.post('/', (req, res) => {
  const { date, weight, chest, waist, hips, body_fat_percent, visceral_fat_area, lean_mass, notes } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const result = db.prepare(`
      INSERT INTO entries (user_id, date, weight, chest, waist, hips, body_fat_percent, visceral_fat_area, lean_mass, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.userId, date, weight, chest, waist, hips, body_fat_percent, visceral_fat_area, lean_mass, notes);

    const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(entry);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Entry for this date already exists. Edit it instead.' });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  const { date, weight, chest, waist, hips, body_fat_percent, visceral_fat_area, lean_mass, notes } = req.body;

  db.prepare(`
    UPDATE entries SET date=?, weight=?, chest=?, waist=?, hips=?, body_fat_percent=?, visceral_fat_area=?, lean_mass=?, notes=?
    WHERE id = ? AND user_id = ?
  `).run(date, weight, chest, waist, hips, body_fat_percent, visceral_fat_area, lean_mass, notes, req.params.id, req.userId);

  const updated = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  db.prepare('DELETE FROM entries WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

module.exports = router;
