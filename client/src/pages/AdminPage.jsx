import { useState, useEffect } from 'react';

const API = '';

function fmt(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TimecardDetail({ id, pin, onBack }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/admin/timecards/${id}?pin=${pin}`)
      .then(r => r.json())
      .then(setData);
  }, [id, pin]);

  if (!data) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  const { timecard: tc, entries } = data;
  const dayTotals = Array.from({ length: 14 }, (_, i) =>
    entries.reduce((s, r) => s + (parseFloat(r[`d${i + 1}`]) || 0), 0)
  );
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const base = new Date(tc.pay_period_start + 'T00:00:00');
  const dayHeaders = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(base.getTime() + i * 86400000);
    return { day: DAY_NAMES[i % 7], date: `${d.getMonth() + 1}/${d.getDate()}` };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-allan-blue font-medium hover:underline text-sm">
          ← Back
        </button>
        <div>
          <h2 className="font-bold text-lg">{tc.employee_name}</h2>
          <p className="text-sm text-gray-500">{fmt(tc.pay_period_start)} – {fmt(tc.pay_period_end)}</p>
        </div>
        <span className={`ml-auto inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          tc.status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {tc.status}
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse min-w-max w-full">
            <thead>
              <tr>
                <th colSpan={3} className="bg-allan-blue" />
                <th colSpan={7} className="bg-blue-600 text-white py-1 text-center">WEEK 1</th>
                <th colSpan={7} className="bg-amber-700 text-white py-1 text-center">WEEK 2</th>
                <th className="bg-allan-blue" />
              </tr>
              <tr className="bg-allan-blue text-white">
                <th className="px-2 py-2 text-left border-r border-white/20 min-w-[80px]">JOB #</th>
                <th className="px-2 py-2 text-left border-r border-white/20 min-w-[70px]">AREA</th>
                <th className="px-2 py-2 text-left border-r border-white/20 min-w-[130px]">COST CODE</th>
                {dayHeaders.map((d, i) => (
                  <th key={i} className={`w-9 py-2 text-center border-r border-white/20 ${i < 7 ? 'bg-blue-600' : 'bg-amber-700'}`}>
                    <div>{d.day}</div>
                    <div className="text-[10px] opacity-80">{d.date}</div>
                  </th>
                ))}
                <th className="w-12 py-2 text-center">TOT</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row, ri) => {
                const rt = Array.from({ length: 14 }, (_, i) => parseFloat(row[`d${i + 1}`]) || 0).reduce((a, b) => a + b, 0);
                return (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2 py-1.5 border-r border-gray-200">{row.job_number || '—'}</td>
                    <td className="px-2 py-1.5 border-r border-gray-200">{row.area || '—'}</td>
                    <td className="px-2 py-1.5 border-r border-gray-200 text-[11px]">
                      {row.cc_code ? `${row.cc_code} – ${row.cc_desc}` : '—'}
                    </td>
                    {Array.from({ length: 14 }, (_, i) => (
                      <td key={i} className={`text-center w-9 py-1.5 border-r border-gray-200 ${i >= 7 ? 'bg-amber-50' : 'bg-blue-50'}`}>
                        {parseFloat(row[`d${i + 1}`]) > 0 ? row[`d${i + 1}`] : ''}
                      </td>
                    ))}
                    <td className="text-center font-bold text-allan-blue w-12">{rt > 0 ? rt : ''}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-allan-blue text-white font-bold text-xs">
                <td colSpan={3} className="px-3 py-2 text-right border-r border-white/20">DAILY TOTALS</td>
                {dayTotals.map((t, i) => (
                  <td key={i} className={`text-center w-9 py-2 border-r border-white/20 ${i >= 7 ? 'bg-amber-700/80' : 'bg-blue-700/80'}`}>
                    {t > 0 ? t : ''}
                  </td>
                ))}
                <td className="text-center w-12">{grandTotal > 0 ? grandTotal : ''}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {tc.notes && (
        <div className="bg-white rounded-xl border p-4 text-sm">
          <span className="font-semibold text-gray-600">Notes: </span>{tc.notes}
        </div>
      )}

      <div className="flex gap-2 pb-6">
        <a
          href={`${API}/api/timecards/${id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          📄 Download PDF
        </a>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [pin, setPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [timecards, setTimecards] = useState([]);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const login = async () => {
    const res = await fetch(`${API}/api/admin/timecards?pin=${pinInput}`);
    if (!res.ok) { setError('Invalid PIN'); return; }
    const data = await res.json();
    setPin(pinInput);
    setTimecards(data);
    setError('');
  };

  if (!pin) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🔐</div>
          <h2 className="font-bold text-xl">Admin Access</h2>
          <p className="text-gray-500 text-sm mt-1">Enter your admin PIN to continue</p>
        </div>
        <input
          type="password"
          value={pinInput}
          onChange={e => setPinInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Admin PIN"
          className="w-full border rounded-lg px-4 py-3 text-center text-2xl tracking-widest focus:ring-2 focus:ring-allan-blue"
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button onClick={login} className="btn-primary w-full">Enter</button>
      </div>
    );
  }

  if (selectedId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-4">
        <TimecardDetail id={selectedId} pin={pin} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  const employees = [...new Set(timecards.map(t => t.employee_name))].sort();
  const filtered = timecards.filter(t =>
    (!filterEmployee || t.employee_name === filterEmployee) &&
    (!filterStatus || t.status === filterStatus)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-xl">All Timecards</h2>
        <span className="text-sm text-gray-400">{timecards.length} total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterEmployee}
          onChange={e => setFilterEmployee(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Employees</option>
          {employees.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
        </select>
      </div>

      {/* Timecard list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">No timecards found.</div>
        )}
        {filtered.map(tc => (
          <button
            key={tc.id}
            onClick={() => setSelectedId(tc.id)}
            className="w-full bg-white border rounded-xl p-4 flex items-center gap-4 text-left hover:shadow-md transition-shadow active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-full bg-allan-blue text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {tc.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{tc.employee_name}</p>
              <p className="text-sm text-gray-500">{fmt(tc.pay_period_start)} – {fmt(tc.pay_period_end)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                tc.status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {tc.status}
              </span>
              {tc.submitted_at && (
                <span className="text-xs text-gray-400">
                  {new Date(tc.submitted_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
