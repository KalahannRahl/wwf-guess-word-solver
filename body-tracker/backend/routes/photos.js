const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.userId}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files allowed'));
    }
    cb(null, true);
  },
});

router.get('/', (req, res) => {
  const photos = db.prepare(
    'SELECT * FROM photos WHERE user_id = ? ORDER BY date DESC, created_at DESC'
  ).all(req.userId);
  res.json(photos);
});

router.post('/', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  const result = db.prepare(
    'INSERT INTO photos (user_id, date, filename, original_name) VALUES (?, ?, ?, ?)'
  ).run(req.userId, date, req.file.filename, req.file.originalname);

  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(photo);
});

router.get('/:id/image', (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const filePath = path.join(uploadsDir, photo.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  res.sendFile(filePath);
});

router.delete('/:id', (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const filePath = path.join(uploadsDir, photo.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM photos WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

module.exports = router;
