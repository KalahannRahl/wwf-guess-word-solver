import React from 'react';
import api from '../api';

const NAV = [
  { key: 'entry', label: 'Log Entry' },
  { key: 'charts', label: 'Charts' },
  { key: 'gallery', label: 'Photos' },
  { key: 'compare', label: 'Compare' },
];

export default function Layout({ user, page, onPage, onLogout, children }) {
  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    onLogout();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: '#4f46e5',
        color: 'white',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>💪</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Body Tracker</span>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          {NAV.map(n => (
            <button
              key={n.key}
              onClick={() => onPage(n.key)}
              style={{
                background: page === n.key ? 'rgba(255,255,255,0.25)' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontWeight: page === n.key ? 600 : 400,
              }}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14 }}>Hi, <strong>{user.username}</strong></span>
          <button
            onClick={handleLogout}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '5px 12px', fontSize: 13 }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '28px 24px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
