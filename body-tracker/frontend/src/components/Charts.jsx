import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CHARTS = [
  { key: 'body_fat_percent', label: 'Body Fat %', color: '#f59e0b', unit: '%' },
  { key: 'lean_mass', label: 'Lean Mass (lbs)', color: '#10b981', unit: ' lbs' },
  { key: 'weight', label: 'Weight (lbs)', color: '#4f46e5', unit: ' lbs' },
  { key: 'visceral_fat_area', label: 'Visceral Fat Area (cm²)', color: '#ef4444', unit: ' cm²' },
  { key: 'waist', label: 'Waist (in)', color: '#8b5cf6', unit: '"' },
];

function fmt(date) {
  const [, m, d] = date.split('-');
  return `${m}/${d}`;
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}{unit}</strong>
        </p>
      ))}
    </div>
  );
}

export default function Charts({ entries }) {
  const [active, setActive] = useState('body_fat_percent');

  const chart = CHARTS.find(c => c.key === active);
  const data = entries
    .filter(e => e[active] != null)
    .map(e => ({ date: fmt(e.date), value: e[active], fullDate: e.date }))
    .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

  const latest = entries.length > 0 ? [...entries].sort((a, b) => b.date.localeCompare(a.date))[0] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stat pills */}
      {latest && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Weight', value: latest.weight, unit: ' lbs' },
            { label: 'Body Fat', value: latest.body_fat_percent, unit: '%' },
            { label: 'Lean Mass', value: latest.lean_mass, unit: ' lbs' },
            { label: 'Waist', value: latest.waist, unit: '"' },
            { label: 'Visceral Fat', value: latest.visceral_fat_area, unit: ' cm²' },
          ].map(s => (
            <div key={s.label} className="card" style={{ flex: '1 1 140px', textAlign: 'center', padding: '16px 12px' }}>
              <p style={{ color: '#6b7280', fontSize: 12, fontWeight: 500 }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginTop: 4 }}>
                {s.value != null ? `${s.value}${s.unit}` : '—'}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{latest.date}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart selector */}
      <div className="card">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {CHARTS.map(c => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              style={{
                background: active === c.key ? c.color : '#f3f4f6',
                color: active === c.key ? 'white' : '#374151',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {data.length < 2 ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            Need at least 2 entries with {chart.label} to show a trend.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={['auto', 'auto']}
                tickFormatter={v => `${v}${chart.unit.trim()}`}
              />
              <Tooltip content={<CustomTooltip unit={chart.unit} />} />
              <Line
                type="monotone"
                dataKey="value"
                name={chart.label}
                stroke={chart.color}
                strokeWidth={2.5}
                dot={{ r: 4, fill: chart.color }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Mini charts grid */}
      {entries.length >= 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {CHARTS.filter(c => c.key !== active).map(c => {
            const d = entries
              .filter(e => e[c.key] != null)
              .map(e => ({ date: fmt(e.date), value: e[c.key], fullDate: e.date }))
              .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
            if (d.length < 2) return null;
            return (
              <div key={c.key} className="card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => setActive(c.key)}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{c.label}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={d} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                    <Line type="monotone" dataKey="value" stroke={c.color} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
