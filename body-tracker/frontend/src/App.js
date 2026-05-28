import React, { useState, useEffect, useCallback } from 'react';
import api from './api';
import Login from './components/Login';
import Layout from './components/Layout';
import DataEntry from './components/DataEntry';
import Charts from './components/Charts';
import PhotoGallery from './components/PhotoGallery';
import Comparison from './components/Comparison';

export default function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    return token ? { token, username } : null;
  });
  const [page, setPage] = useState('charts');
  const [entries, setEntries] = useState([]);
  const [photos, setPhotos] = useState([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [eRes, pRes] = await Promise.all([
        api.get('/entries'),
        api.get('/photos'),
      ]);
      setEntries(eRes.data);
      setPhotos(pRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setUser(null);
      }
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!user) {
    return <Login onLogin={u => { setUser(u); }} />;
  }

  return (
    <Layout user={user} page={page} onPage={setPage} onLogout={() => setUser(null)}>
      {page === 'entry' && <DataEntry entries={entries} onRefresh={loadData} />}
      {page === 'charts' && <Charts entries={entries} />}
      {page === 'gallery' && <PhotoGallery photos={photos} onRefresh={loadData} />}
      {page === 'compare' && <Comparison entries={entries} photos={photos} />}
    </Layout>
  );
}
