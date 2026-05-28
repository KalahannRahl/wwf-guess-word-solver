import React, { useState } from 'react';
import api from '../api';

export default function PhotoGallery({ photos, onRefresh }) {
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().slice(0, 10));
  const [uploadFile, setUploadFile] = useState(null);
  const [err, setErr] = useState('');

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile) return;
    setErr('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', uploadFile);
      fd.append('date', uploadDate);
      await api.post('/photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadFile(null);
      e.target.reset();
      onRefresh();
    } catch (err) {
      setErr(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this photo?')) return;
    await api.delete(`/photos/${id}`);
    if (lightbox?.id === id) setLightbox(null);
    onRefresh();
  }

  // Group by date
  const byDate = {};
  photos.forEach(p => {
    if (!byDate[p.date]) byDate[p.date] = [];
    byDate[p.date].push(p);
  });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Upload */}
      <div className="card">
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Upload Photo</h2>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 160px' }}>
            <label>Date</label>
            <input type="date" value={uploadDate} onChange={e => setUploadDate(e.target.value)} required />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label>Photo</label>
            <input type="file" accept="image/*" onChange={e => setUploadFile(e.target.files[0])} required />
          </div>
          <button type="submit" className="btn-primary" disabled={uploading} style={{ height: 38, whiteSpace: 'nowrap' }}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
        {err && <p className="error-msg" style={{ marginTop: 8 }}>{err}</p>}
      </div>

      {/* Gallery */}
      {dates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
          No photos yet. Upload your first progress photo!
        </div>
      ) : (
        dates.map(date => (
          <div key={date} className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>{date}</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {byDate[date].map(p => (
                <div key={p.id} style={{ position: 'relative' }}>
                  <img
                    src={`/api/photos/${p.id}/image`}
                    alt={date}
                    onClick={() => setLightbox(p)}
                    style={{
                      width: 140, height: 140, objectFit: 'cover',
                      borderRadius: 8, cursor: 'pointer',
                      border: '2px solid #e5e7eb',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => e.target.style.borderColor = '#4f46e5'}
                    onMouseLeave={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      background: 'rgba(239,68,68,0.9)', color: 'white',
                      border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 11,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, cursor: 'zoom-out',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
            <img
              src={`/api/photos/${lightbox.id}/image`}
              alt={lightbox.date}
              style={{ maxHeight: '85vh', maxWidth: '90vw', borderRadius: 10 }}
            />
            <p style={{ color: 'white', textAlign: 'center', marginTop: 10, fontSize: 14 }}>
              {lightbox.date}
            </p>
            <button
              onClick={() => setLightbox(null)}
              style={{
                position: 'absolute', top: -12, right: -12,
                background: 'white', color: '#333', border: 'none',
                borderRadius: '50%', width: 28, height: 28, fontSize: 14, fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
