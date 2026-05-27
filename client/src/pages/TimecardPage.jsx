import { useState, useEffect, useCallback } from 'react';
import TimecardTable from '../components/TimecardTable.jsx';
import {
  lsGetEmployees, lsGetCostCodes, getPayPeriod,
  lsGetOrCreateTimecard, lsSaveEntries, lsSubmitTimecard, lsSaveNotes,
} from '../api.js';
import { generatePDF } from '../utils/pdf.js';

function PayPeriodNav({ start, end, onPrev, onNext }) {
  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border px-3 py-2 shadow-sm">
      <button onClick={onPrev} className="text-allan-blue font-bold text-xl px-2 active:scale-95 select-none">‹</button>
      <div className="flex-1 text-center">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pay Period</p>
        <p className="text-sm font-semibold text-gray-800">
          {start ? `${fmt(start)} – ${fmt(end)}` : '—'}
        </p>
      </div>
      <button onClick={onNext} className="text-allan-blue font-bold text-xl px-2 active:scale-95 select-none">›</button>
    </div>
  );
}

function blankRow() {
  const row = { job_number: '', area: '', cost_code_id: '' };
  for (let d = 1; d <= 14; d++) row[`d${d}`] = '';
  return row;
}

export default function TimecardPage() {
  const [employees] = useState(lsGetEmployees);
  const [costCodes] = useState(lsGetCostCodes);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [ppStart, setPpStart] = useState('');
  const [ppEnd, setPpEnd] = useState('');
  const [timecard, setTimecard] = useState(null);
  const [entries, setEntries] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showEmailInfo, setShowEmailInfo] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const pp = getPayPeriod();
    setPpStart(pp.start);
    setPpEnd(pp.end);
  }, []);

  const shiftPeriod = (dir) => {
    if (!ppStart) return;
    const d = new Date(ppStart + 'T00:00:00');
    d.setDate(d.getDate() + dir * 14);
    const pp = getPayPeriod(d.toISOString().slice(0, 10));
    setPpStart(pp.start);
    setPpEnd(pp.end);
  };

  useEffect(() => {
    if (!selectedEmployee || !ppStart) return;
    const { timecard: tc, entries: ents } = lsGetOrCreateTimecard(selectedEmployee, ppStart);
    setTimecard(tc);
    setNotes(tc.notes || '');
    setEntries(ents.length > 0 ? ents : [blankRow()]);
  }, [selectedEmployee, ppStart]);

  const updateEntry = useCallback((idx, field, value) => {
    setEntries(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  const addRow = () => setEntries(prev => [...prev, blankRow()]);
  const removeRow = (idx) => setEntries(prev => prev.filter((_, i) => i !== idx));

  const save = () => {
    if (!timecard) return;
    setSaving(true);
    lsSaveEntries(timecard.id, entries);
    lsSaveNotes(timecard.id, notes);
    showToast('Saved');
    setSaving(false);
  };

  const submit = () => {
    if (!timecard) return;
    if (!confirm('Submit this timecard? It cannot be edited after submission.')) return;
    lsSaveEntries(timecard.id, entries);
    lsSaveNotes(timecard.id, notes);
    const updated = lsSubmitTimecard(timecard.id);
    setTimecard(updated);
    showToast('Submitted!');
  };

  const downloadPDF = () => {
    if (!timecard) return;
    const empName = employees.find(e => e.id === Number(timecard.employee_id))?.name || 'Employee';
    generatePDF({ ...timecard, employee_name: empName }, entries);
  };

  const isSubmitted = timecard?.status === 'submitted';

  const dayTotals = Array.from({ length: 14 }, (_, i) =>
    entries.reduce((s, r) => s + (parseFloat(r[`d${i + 1}`]) || 0), 0)
  );
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* Employee + Pay Period */}
      <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Employee</label>
          <select
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 text-base bg-white focus:ring-2 focus:ring-allan-blue focus:border-allan-blue"
          >
            <option value="">Select your name…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        {ppStart && (
          <PayPeriodNav start={ppStart} end={ppEnd} onPrev={() => shiftPeriod(-1)} onNext={() => shiftPeriod(1)} />
        )}

        {timecard && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isSubmitted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {isSubmitted ? '✓ Submitted' : '● Draft'}
            </span>
            {isSubmitted && timecard.submitted_at && (
              <span className="text-xs text-gray-400">{new Date(timecard.submitted_at).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </div>

      {/* Timecard grid */}
      {selectedEmployee && timecard && (
        <>
          <TimecardTable
            entries={entries}
            costCodes={costCodes}
            payPeriodStart={ppStart}
            dayTotals={dayTotals}
            grandTotal={grandTotal}
            readOnly={isSubmitted}
            onUpdate={updateEntry}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isSubmitted}
              rows={2}
              placeholder="Optional notes…"
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-allan-blue disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pb-6">
            {!isSubmitted && (
              <>
                <button onClick={save} disabled={saving} className="btn-secondary flex-1 min-w-[120px]">
                  {saving ? 'Saving…' : '💾 Save Draft'}
                </button>
                <button onClick={submit} className="btn-primary flex-1 min-w-[140px]">
                  ✓ Submit Timecard
                </button>
              </>
            )}
            <button onClick={downloadPDF} className="btn-secondary flex-1 min-w-[120px]">
              📄 Download PDF
            </button>
            <button onClick={() => setShowEmailInfo(true)} className="btn-secondary flex-1 min-w-[120px]">
              ✉ Email
            </button>
          </div>
        </>
      )}

      {!selectedEmployee && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">👷</div>
          <p className="font-medium">Select your name above to begin</p>
        </div>
      )}

      {/* Email info modal */}
      {showEmailInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-6 space-y-3">
            <h3 className="font-bold text-lg">Email Timecard</h3>
            <p className="text-sm text-gray-600">
              Email delivery requires the backend server. Download the PDF and attach it manually, or set up the server with SMTP credentials.
            </p>
            <p className="text-sm text-gray-500">
              <strong>Tip:</strong> Use "Share" → "Mail" from your phone's Files app after downloading the PDF.
            </p>
            <button onClick={() => setShowEmailInfo(false)} className="btn-primary w-full">Got it</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm z-50 ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
