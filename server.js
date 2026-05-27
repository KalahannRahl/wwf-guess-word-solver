const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const dbPath = path.join(__dirname, 'timecard.db');
if (!fs.existsSync(dbPath)) {
  console.log('Database not found. Run: node setup-timecard-db.js');
  process.exit(1);
}
const db = new Database(dbPath);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPayPeriod(dateStr) {
  // 2-week pay periods anchored to 2024-01-01 (Monday)
  const anchor = new Date('2024-01-01T00:00:00');
  const target = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const msPerPeriod = 14 * 24 * 60 * 60 * 1000;
  const diff = target - anchor;
  const periodIndex = Math.floor(diff / msPerPeriod);
  const start = new Date(anchor.getTime() + periodIndex * msPerPeriod);
  const end = new Date(start.getTime() + 13 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function formatDate(isoStr) {
  const d = new Date(isoStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDayLabels(startDate) {
  const days = [];
  const d = new Date(startDate + 'T00:00:00');
  for (let i = 0; i < 14; i++) {
    const cur = new Date(d.getTime() + i * 86400000);
    days.push({
      label: cur.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
      short: cur.toLocaleDateString('en-US', { weekday: 'short' }),
      date: cur.toISOString().slice(0, 10),
    });
  }
  return days;
}

// ─── API Routes ─────────────────────────────────────────────────────────────

app.get('/api/employees', (req, res) => {
  const rows = db.prepare('SELECT * FROM employees WHERE active = 1 ORDER BY name').all();
  res.json(rows);
});

app.get('/api/cost-codes', (req, res) => {
  const rows = db.prepare('SELECT * FROM cost_codes ORDER BY code').all();
  res.json(rows);
});

app.get('/api/pay-period/current', (req, res) => {
  const { date } = req.query;
  res.json(getPayPeriod(date));
});

// Get or create timecard for employee + pay period
app.get('/api/timecards', (req, res) => {
  const { employee_id, pay_period_start } = req.query;
  if (!employee_id || !pay_period_start) return res.status(400).json({ error: 'Missing params' });

  let tc = db.prepare('SELECT * FROM timecards WHERE employee_id = ? AND pay_period_start = ?')
    .get(employee_id, pay_period_start);

  if (!tc) {
    const { start, end } = getPayPeriod(pay_period_start);
    const result = db.prepare(
      'INSERT INTO timecards (employee_id, pay_period_start, pay_period_end) VALUES (?, ?, ?)'
    ).run(employee_id, start, end);
    tc = db.prepare('SELECT * FROM timecards WHERE id = ?').get(result.lastInsertRowid);
  }

  const entries = db.prepare('SELECT * FROM timecard_entries WHERE timecard_id = ? ORDER BY row_order').all(tc.id);
  res.json({ timecard: tc, entries });
});

// Save timecard entries (replace all)
app.post('/api/timecards/:id/entries', (req, res) => {
  const { id } = req.params;
  const { entries } = req.body;

  const tc = db.prepare('SELECT * FROM timecards WHERE id = ?').get(id);
  if (!tc) return res.status(404).json({ error: 'Timecard not found' });
  if (tc.status === 'submitted') return res.status(400).json({ error: 'Timecard already submitted' });

  db.prepare('DELETE FROM timecard_entries WHERE timecard_id = ?').run(id);

  const insert = db.prepare(`
    INSERT INTO timecard_entries
      (timecard_id, row_order, job_number, area, cost_code_id,
       d1,d2,d3,d4,d5,d6,d7,d8,d9,d10,d11,d12,d13,d14)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const saveAll = db.transaction((rows) => {
    rows.forEach((row, i) => {
      insert.run(
        id, i,
        row.job_number || null,
        row.area || null,
        row.cost_code_id || null,
        ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(n => Number(row[`d${n}`]) || 0)
      );
    });
  });
  saveAll(entries);

  res.json({ success: true });
});

app.post('/api/timecards/:id/submit', (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE timecards SET status='submitted', submitted_at=datetime('now') WHERE id=?").run(id);
  res.json({ success: true });
});

app.patch('/api/timecards/:id', (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  db.prepare('UPDATE timecards SET notes=? WHERE id=?').run(notes, id);
  res.json({ success: true });
});

// Admin – list all timecards
app.get('/api/admin/timecards', (req, res) => {
  const { pin } = req.query;
  if (pin !== (process.env.ADMIN_PIN || '1234')) return res.status(403).json({ error: 'Invalid PIN' });

  const rows = db.prepare(`
    SELECT t.*, e.name as employee_name
    FROM timecards t
    JOIN employees e ON t.employee_id = e.id
    ORDER BY t.pay_period_start DESC, e.name
  `).all();
  res.json(rows);
});

app.get('/api/admin/timecards/:id', (req, res) => {
  const { pin } = req.query;
  if (pin !== (process.env.ADMIN_PIN || '1234')) return res.status(403).json({ error: 'Invalid PIN' });

  const tc = db.prepare(`
    SELECT t.*, e.name as employee_name, e.email as employee_email
    FROM timecards t JOIN employees e ON t.employee_id = e.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!tc) return res.status(404).json({ error: 'Not found' });

  const entries = db.prepare(`
    SELECT te.*, cc.code as cc_code, cc.description as cc_desc, cc.category as cc_cat
    FROM timecard_entries te
    LEFT JOIN cost_codes cc ON te.cost_code_id = cc.id
    WHERE te.timecard_id = ?
    ORDER BY te.row_order
  `).all(tc.id);

  res.json({ timecard: tc, entries });
});

// ─── PDF Generation ─────────────────────────────────────────────────────────

function buildPDF(tc, entries, dayLabels) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 30 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = 792;
    const margin = 30;
    const W = pageW - margin * 2;
    const blue = '#1E3A5F';

    // Header bar
    doc.rect(0, 0, pageW, 70).fill(blue);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('ALLAN', margin, 12);
    doc.fontSize(10).font('Helvetica').text('CONSTRUCTION', margin, 36);
    doc.fontSize(13).font('Helvetica-Bold').text('EMPLOYEE TIME CARD', margin + 110, 22);

    const emp = tc.employee_name || 'Unknown';
    doc.fontSize(9).font('Helvetica').fillColor('white')
      .text(`Employee: ${emp}`, 450, 15)
      .text(`Pay Period: ${formatDate(tc.pay_period_start)} – ${formatDate(tc.pay_period_end)}`, 450, 28)
      .text(`Status: ${tc.status.toUpperCase()}`, 450, 41)
      .text(`Submitted: ${tc.submitted_at ? new Date(tc.submitted_at).toLocaleDateString() : '—'}`, 450, 54);

    // Table layout
    const tableY = 80;
    const rowH = 16;
    const colJob = 75, colArea = 65, colCC = 110, colTot = 36;
    const availForDays = W - colJob - colArea - colCC - colTot;
    const dayW = Math.floor(availForDays / 14);

    // Header row
    doc.fillColor(blue).rect(margin, tableY, W, rowH + 4).fill();
    doc.fillColor('white').fontSize(6.5).font('Helvetica-Bold');
    let cx = margin;
    doc.text('JOB #', cx + 2, tableY + 4, { width: colJob - 4, align: 'left' }); cx += colJob;
    doc.text('AREA', cx + 2, tableY + 4, { width: colArea - 4 }); cx += colArea;
    doc.text('COST CODE', cx + 2, tableY + 4, { width: colCC - 4 }); cx += colCC;

    // Week labels above day headers
    const wk1Color = '#2563EB', wk2Color = '#B45309';
    dayLabels.forEach((d, i) => {
      const col = i < 7 ? wk1Color : wk2Color;
      doc.fillColor(col).fontSize(6).font('Helvetica-Bold')
        .text(d.short.toUpperCase(), cx + 1, tableY + 2, { width: dayW - 2, align: 'center' });
      doc.fontSize(5).text(d.date.slice(5), cx + 1, tableY + 9, { width: dayW - 2, align: 'center' });
      cx += dayW;
    });
    doc.fillColor('white').fontSize(6.5).font('Helvetica-Bold')
      .text('TOTAL', cx + 1, tableY + 4, { width: colTot - 2, align: 'center' });

    // Data rows
    let ry = tableY + rowH + 4;
    entries.forEach((row, ri) => {
      const bg = ri % 2 === 0 ? '#FFFFFF' : '#F3F4F6';
      doc.fillColor(bg).rect(margin, ry, W, rowH).fill();
      doc.strokeColor('#D1D5DB').lineWidth(0.5).rect(margin, ry, W, rowH).stroke();

      doc.fillColor('#111827').fontSize(6.5).font('Helvetica');
      cx = margin;
      doc.text(row.job_number || '', cx + 2, ry + 4, { width: colJob - 4 }); cx += colJob;
      doc.text(row.area || '', cx + 2, ry + 4, { width: colArea - 4 }); cx += colArea;
      doc.text(row.cc_code ? `${row.cc_code}` : '', cx + 2, ry + 4, { width: colCC - 4, lineBreak: false }); cx += colCC;

      let rowTotal = 0;
      for (let d = 1; d <= 14; d++) {
        const hrs = Number(row[`d${d}`]) || 0;
        rowTotal += hrs;
        const dayBg = d <= 7 ? '#EFF6FF' : '#FFFBEB';
        doc.fillColor(dayBg).rect(cx, ry, dayW, rowH).fill();
        doc.strokeColor('#D1D5DB').lineWidth(0.3).rect(cx, ry, dayW, rowH).stroke();
        if (hrs > 0) doc.fillColor('#111827').text(String(hrs), cx + 1, ry + 4, { width: dayW - 2, align: 'center' });
        cx += dayW;
      }
      doc.fillColor('#1E3A5F').font('Helvetica-Bold')
        .text(rowTotal > 0 ? String(rowTotal) : '', cx + 1, ry + 4, { width: colTot - 2, align: 'center' });
      ry += rowH;
    });

    // Totals footer row
    doc.fillColor(blue).rect(margin, ry, W, rowH).fill();
    doc.fillColor('white').fontSize(6.5).font('Helvetica-Bold')
      .text('DAILY TOTALS', margin + 2, ry + 4, { width: colJob + colArea + colCC - 4 });
    cx = margin + colJob + colArea + colCC;
    let grand = 0;
    for (let d = 1; d <= 14; d++) {
      const dt = entries.reduce((s, r) => s + (Number(r[`d${d}`]) || 0), 0);
      grand += dt;
      if (dt > 0) doc.text(String(dt), cx + 1, ry + 4, { width: dayW - 2, align: 'center' });
      cx += dayW;
    }
    doc.text(String(grand), cx + 1, ry + 4, { width: colTot - 2, align: 'center' });

    // Notes
    if (tc.notes) {
      doc.fillColor('#374151').fontSize(8).font('Helvetica')
        .text(`Notes: ${tc.notes}`, margin, ry + rowH + 6);
    }

    doc.fillColor('#9CA3AF').fontSize(7).text(
      `Generated ${new Date().toLocaleString()} | Allan Construction Timecard System`,
      margin, 590
    );

    doc.end();
  });
}

app.get('/api/timecards/:id/pdf', async (req, res) => {
  const tc = db.prepare(`
    SELECT t.*, e.name as employee_name, e.email as employee_email
    FROM timecards t JOIN employees e ON t.employee_id = e.id WHERE t.id = ?
  `).get(req.params.id);
  if (!tc) return res.status(404).json({ error: 'Not found' });

  const entries = db.prepare(`
    SELECT te.*, cc.code as cc_code, cc.description as cc_desc
    FROM timecard_entries te
    LEFT JOIN cost_codes cc ON te.cost_code_id = cc.id
    WHERE te.timecard_id = ? ORDER BY te.row_order
  `).all(tc.id);

  const dayLabels = getDayLabels(tc.pay_period_start);
  try {
    const pdf = await buildPDF(tc, entries, dayLabels);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="timecard-${tc.id}.pdf"`,
    });
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

app.post('/api/timecards/:id/email', async (req, res) => {
  const { to } = req.body;
  const tc = db.prepare(`
    SELECT t.*, e.name as employee_name, e.email as employee_email
    FROM timecards t JOIN employees e ON t.employee_id = e.id WHERE t.id = ?
  `).get(req.params.id);
  if (!tc) return res.status(404).json({ error: 'Not found' });

  const entries = db.prepare(`
    SELECT te.*, cc.code as cc_code, cc.description as cc_desc
    FROM timecard_entries te
    LEFT JOIN cost_codes cc ON te.cost_code_id = cc.id
    WHERE te.timecard_id = ? ORDER BY te.row_order
  `).all(tc.id);

  const dayLabels = getDayLabels(tc.pay_period_start);
  try {
    const pdf = await buildPDF(tc, entries, dayLabels);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'timecards@allanconstruction.com',
      to: to || tc.employee_email,
      subject: `Time Card – ${tc.employee_name} – ${tc.pay_period_start} to ${tc.pay_period_end}`,
      text: `Attached is the timecard for ${tc.employee_name}, pay period ${formatDate(tc.pay_period_start)} – ${formatDate(tc.pay_period_end)}.`,
      attachments: [{ filename: `timecard-${tc.id}.pdf`, content: pdf, contentType: 'application/pdf' }],
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h2>Run <code>npm run build-client</code> to build the frontend.</h2>');
  }
});

app.listen(PORT, () => console.log(`Allan Construction Timecard running on http://localhost:${PORT}`));
