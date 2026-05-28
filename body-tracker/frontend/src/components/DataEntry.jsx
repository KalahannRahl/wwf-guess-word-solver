import React, { useState, useEffect } from 'react';
import api from '../api';

const FIELDS = [
  { key: 'weight', label: 'Weight (lbs)', step: '0.1' },
  { key: 'chest', label: 'Chest (in)', step: '0.25' },
  { key: 'waist', label: 'Waist (in)', step: '0.25' },
  { key: 'hips', label: 'Hips (in)', step: '0.25' },
  { key: 'body_fat_percent', label: 'Body Fat (%)', step: '0.1' },
  { key: 'visceral_fat_area', label: 'Visceral Fat Area (cm²)', step: '1' },
  { key: 'lean_mass', label: 'Lean Mass (lbs)', step: '0.1' },
];

const empty = () => ({
  date: new Date().toISOString().slice(0, 10),
  weight: '', chest: '', waist: '', hips: '',
  body_fat_percent: '', visceral_fat_area: '', lean_mass: '', notes: '',
});

export default function DataEntry({ entries, onRefresh }) {
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);

  // Check if selected date already has an entry
  const existingEntry = entries.find(e => e.date === form.date);

  function loadEntry(entry) {
    setEditId(entry.id);
    setForm({
      date: entry.date,
      weight: entry.weight ?? '',
      chest: entry.chest ?? '',
      waist: entry.waist ?? '',
      hips: entry.hips ?? '',
      body_fat_percent: entry.body_fat_percent ?? '',
      visceral_fat_area: entry.visceral_fat_area ?? '',
      lean_mass: entry.lean_mass ?? '',
      notes: entry.notes ?? '',
    });
    setMsg('');
    setErr('');
  }

  function resetForm() {
    setForm(empty());
    setEditId(null);
    setMsg('');
    setErr('');
    setPhotoFile(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setLoading(true);

    const payload = { ...form };
    FIELDS.forEach(f => {
      if (payload[f.key] === '') payload[f.key] = null;
      else payload[f.key] = parseFloat(payload[f.key]);
    });

    try {
      if (editId) {
        await api.put(`/entries/${editId}`, payload);
      } else {
        await api.post('/entries', payload);
      }

      if (photoFile) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        fd.append('date', form.date);
        await api.post('/photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      setMsg(editId ? 'Entry updated!' : 'Entry saved!');
      onRefresh();
      setTimeout(resetForm, 1200);
    } catch (err) {
      setErr(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this entry?')) return;
    await api.delete(`/entries/${id}`);
    onRefresh();
    if (editId === id) resetForm();
  }

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
      {/* Form */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{editId ? 'Edit Entry' : 'Log Entry'}</h2>
          {editId && (
            <button className="btn-secondary btn-sm" onClick={resetForm}>Cancel</button>
          )}
        </div>

        {!editId && existingEntry && (
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            Entry exists for this date.{' '}
            <button
              style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, padding: 0, cursor: 'pointer' }}
              onClick={() => loadEntry(existingEntry)}
            >
              Edit it →
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label>Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {FIELDS.map(f => (
              <div key={f.key}>
                <label>{f.label}</label>
                <input
                  type="number"
                  step={f.step}
                  min="0"
                  value={form[f.key]}
                  onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder="—"
                />
              </div>
            ))}
          </div>

          <div>
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Optional notes…"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div>
            <label>Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setPhotoFile(e.target.files[0] || null)}
              style={{ padding: '6px 0', border: 'none' }}
            />
          </div>

          {err && <p className="error-msg">{err}</p>}
          {msg && <p className="success-msg">{msg}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : editId ? 'Update Entry' : 'Save Entry'}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="card">
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Entry History</h2>
        {sorted.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '32px 0' }}>No entries yet. Log your first one!</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={th}>Date</th>
                  <th style={th}>Weight</th>
                  <th style={th}>BF%</th>
                  <th style={th}>Lean</th>
                  <th style={th}>Waist</th>
                  <th style={th}>Visc.Fat</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6', background: editId === e.id ? '#eef2ff' : 'white' }}>
                    <td style={td}>{e.date}</td>
                    <td style={td}>{e.weight ?? '—'}</td>
                    <td style={td}>{e.body_fat_percent != null ? `${e.body_fat_percent}%` : '—'}</td>
                    <td style={td}>{e.lean_mass ?? '—'}</td>
                    <td style={td}>{e.waist ?? '—'}</td>
                    <td style={td}>{e.visceral_fat_area ?? '—'}</td>
                    <td style={{ ...td, display: 'flex', gap: 6 }}>
                      <button className="btn-secondary btn-sm" onClick={() => loadEntry(e)}>Edit</button>
                      <button className="btn-danger btn-sm" onClick={() => handleDelete(e.id)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 10px', color: '#6b7280', fontWeight: 600 };
const td = { padding: '9px 10px', color: '#374151' };
