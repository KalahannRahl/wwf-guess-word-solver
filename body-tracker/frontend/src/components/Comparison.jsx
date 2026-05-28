import React, { useState } from 'react';

const METRICS = [
  { key: 'weight', label: 'Weight', unit: ' lbs' },
  { key: 'body_fat_percent', label: 'Body Fat', unit: '%' },
  { key: 'lean_mass', label: 'Lean Mass', unit: ' lbs' },
  { key: 'waist', label: 'Waist', unit: '"' },
  { key: 'chest', label: 'Chest', unit: '"' },
  { key: 'hips', label: 'Hips', unit: '"' },
  { key: 'visceral_fat_area', label: 'Visceral Fat Area', unit: ' cm²' },
];

// For these metrics, lower is better
const LOWER_BETTER = new Set(['weight', 'body_fat_percent', 'waist', 'hips', 'visceral_fat_area']);

function Delta({ metricKey, a, b }) {
  if (a == null || b == null) return <span style={{ color: '#9ca3af' }}>—</span>;
  const diff = b - a;
  if (diff === 0) return <span style={{ color: '#6b7280' }}>→ 0</span>;

  const lowerBetter = LOWER_BETTER.has(metricKey);
  const improved = lowerBetter ? diff < 0 : diff > 0;
  const color = improved ? '#10b981' : '#ef4444';
  const arrow = diff > 0 ? '▲' : '▼';
  return (
    <span style={{ color, fontWeight: 600 }}>
      {arrow} {Math.abs(diff).toFixed(1)}
    </span>
  );
}

export default function Comparison({ entries, photos }) {
  const dates = [...new Set(entries.map(e => e.date))].sort((a, b) => b.localeCompare(a));
  const photoDates = [...new Set(photos.map(p => p.date))].sort((a, b) => b.localeCompare(a));

  const [dateA, setDateA] = useState(dates[1] || '');
  const [dateB, setDateB] = useState(dates[0] || '');

  const entryA = entries.find(e => e.date === dateA);
  const entryB = entries.find(e => e.date === dateB);

  const photosA = photos.filter(p => p.date === dateA);
  const photosB = photos.filter(p => p.date === dateB);

  if (dates.length < 2) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
        Need at least 2 logged entries to compare.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Date selectors */}
      <div className="card">
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Compare Two Dates</h2>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label>Earlier Date (Before)</label>
            <select value={dateA} onChange={e => setDateA(e.target.value)}>
              {dates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 24, color: '#9ca3af', paddingBottom: 6 }}>→</div>
          <div style={{ flex: '1 1 160px' }}>
            <label>Later Date (After)</label>
            <select value={dateB} onChange={e => setDateB(e.target.value)}>
              {dates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Side-by-side photos */}
      {(photosA.length > 0 || photosB.length > 0) && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Photos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <PhotoCol photos={photosA} date={dateA} label="Before" />
            <PhotoCol photos={photosB} date={dateB} label="After" />
          </div>
        </div>
      )}

      {/* Metrics table */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Metrics</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={th}>Metric</th>
              <th style={{ ...th, textAlign: 'center' }}>{dateA || '—'} (Before)</th>
              <th style={{ ...th, textAlign: 'center' }}>{dateB || '—'} (After)</th>
              <th style={{ ...th, textAlign: 'center' }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map(m => {
              const va = entryA?.[m.key];
              const vb = entryB?.[m.key];
              return (
                <tr key={m.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={td}>{m.label}</td>
                  <td style={{ ...td, textAlign: 'center', color: '#6b7280' }}>
                    {va != null ? `${va}${m.unit}` : '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 600 }}>
                    {vb != null ? `${vb}${m.unit}` : '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <Delta metricKey={m.key} a={va} b={vb} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PhotoCol({ photos, date, label }) {
  const [idx, setIdx] = useState(0);
  const photo = photos[idx];

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontWeight: 600, color: '#374151', marginBottom: 8 }}>
        {label} — {date || '—'}
      </p>
      {photo ? (
        <>
          <img
            src={`/api/photos/${photo.id}/image`}
            alt={date}
            style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 10, border: '2px solid #e5e7eb' }}
          />
          {photos.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', padding: 0,
                    background: i === idx ? '#4f46e5' : '#d1d5db',
                  }}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{
          height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f9fafb', borderRadius: 10, color: '#9ca3af', fontSize: 13,
        }}>
          No photo for this date
        </div>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600 };
const td = { padding: '11px 12px', color: '#374151' };
