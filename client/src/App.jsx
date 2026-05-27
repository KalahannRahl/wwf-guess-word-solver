import { useState } from 'react';
import TimecardPage from './pages/TimecardPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import Header from './components/Header.jsx';

export default function App() {
  const [view, setView] = useState('timecard'); // 'timecard' | 'admin'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header view={view} setView={setView} />
      <main className="flex-1">
        {view === 'timecard' ? <TimecardPage /> : <AdminPage />}
      </main>
    </div>
  );
}
