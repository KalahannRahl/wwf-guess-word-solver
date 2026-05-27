import { useState, useEffect, useCallback } from 'react';
import TimecardTable from '../components/TimecardTable.jsx';

const API = '';

function PayPeriodNav({ payPeriodStart, payPeriodEnd, onPrev, onNext }) {
  const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border px-3 py-2 shadow-sm">
      <button onClick={onPrev} className="text-allan-blue font-bold text-lg px-2 active:scale-95">‹</button>
      <div className="flex-1 text-center">
        <p className="text-xs text-gray-500 font-medium">Pay Period</p>
        <p className="text-sm font-semibold text-gray-800">
          {payPeriodStart ? `${fmt(payPeriodStart)} – ${fmt(payPeriodEnd)}` : '—'}
        </p>
      </div>
      <button onClick={onNext} className="text-allan-blue font-bold text-lg px-2 active:scale-95">›</button>
    </div>
  );
}

export default function TimecardPage() {
  const [employees, setEmployees] = useState([]);
  const [costCodes, setCostCodes] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [payPeriodStart, setPayPeriodStart] = useState('');
  const [payPeriodEnd, setPayPeriodEnd] = useState('');
  const [timecard, setTimecard] = useState(null);
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [emailTo, setEmailTo] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [notes, setNotes] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load employees and cost codes
  useEffect(() => {
    fetch(`${API}/api/employees`).then(r => r.json()).then(setEmployees);
    fetch(`${API}/api/cost-codes`).then(r => r.json()).then(setCostCodes);
    fetch(`${API}/api/pay-period/current`).then(r => r.json()).then(pp => {
      setPayPeriodStart(pp.start);
      setPayPeriodEnd(pp.end);
    });
  }, []);

  const shiftPeriod = (dir) => {
    if (!payPeriodStart) return;
    const d = new Date(payPeriodStart + 'T00:00:00');
    d.setDate(d.getDate() + dir * 14);
    const newStart = d.toISOString().slice(0, 10);
    fetch(`${API}/api/pay-period/current?date=${newStart}`).then(r => r.json()).then(pp => {
      setPayPeriodStart(pp.start);
      setPayPeriodEnd(pp.end);
    });
  };

  // Load timecard when employee + period changes
  useEffect(() => {
    if (!selectedEmployee || !payPeriodStart) return;
    fetch(`${API}/api/timecards?employee_id=${selectedEmployee}&pay_period_start=${payPeriodStart}`)
      .then(r => r.json())
      .then(data => {
        setTimecard(data.timecard);
        setNotes(data.timecard.notes || '');
        const loaded = data.entries.length > 0 ? data.entries : [blankRow()];
        setEntries(loaded);
      });
  }, [selectedEmployee, payPeriodStart]);

  function blankRow() {
    const row = { job_number: '', area: '', cost_code_id: '' };
    for (let d = 1; d <= 14; d++) row[`d${d}`] = '';
    return row;
  }

  const addRow = () => setEntries(prev => [...prev, blankRow()]);

  const removeRow = (idx) => setEntries(prev => prev.filter((_, i) => i !== idx));

  const updateEntry = useCallback((idx, field, value) => {
    setEntries(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  const saveEntries = async () => {
    if (!timecard) return;
    setSaving(true);
    try {
      await fetch(`${API}/api/timecards/${timecard.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (notes !== timecard.notes) {
        await fetch(`${API}/api/timecards/${timecard.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        });
      }
      showToast('Saved successfully');
    } catch {
      showToast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitTimecard = async () => {
    if (!timecard) return;
    if (!confirm('Submit this timecard? It cannot be edited after submission.')) return;
    setSubmitting(true);
    try {
      await saveEntries();
      await fetch(`${API}/api/timecards/${timecard.id}/submit`, { method: 'POST' });
      setTimecard(prev => ({ ...prev, status: 'submitted' }));
      showToast('Timecard submitted!');
    } catch {
      showToast('Submit failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPDF = () => {
    if (!timecard) return;
    window.open(`${API}/api/timecards/${timecard.id}/pdf`, '_blank');
  };

  const sendEmail = async () => {
    if (!timecard) return;
    setEmailSending(true);
    try {
      const res = await fetch(`${API}/api/timecards/${timecard.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Email sent!');
        setShowEmailModal(false);
      } else {
        showToast(data.error || 'Email failed', 'error');
      }
    } catch {
      showToast('Email failed', 'error');
    } finally {
      setEmailSending(false);
    }
  };

  const isSubmitted = timecard?.status === 'submitted';

  // Calculate totals
  const dayTotals = Array.from({ length: 14 }, (_, i) =>
    entries.reduce((s, r) => s + (parseFloat(r[`d${i + 1}`]) || 0), 0)
  );
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* Employee selection */}
      <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Employee
          </label>
          <select
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 text-base bg-white focus:ring-2 focus:ring-allan-blue focus:border-allan-blue"
          >
            <option value="">Select your name…</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {payPeriodStart && (
          <PayPeriodNav
            payPeriodStart={payPeriodStart}
            payPeriodEnd={payPeriodEnd}
            onPrev={() => shiftPeriod(-1)}
            onNext={() => shiftPeriod(1)}
          />
        )}

        {timecard && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isSubmitted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {isSubmitted ? '✓ Submitted' : '● Draft'}
            </span>
            {timecard.submitted_at && (
              <span className="text-xs text-gray-400">
                {new Date(timecard.submitted_at).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Timecard table */}
      {selectedEmployee && timecard && (
        <>
          <TimecardTable
            entries={entries}
            costCodes={costCodes}
            payPeriodStart={payPeriodStart}
            dayTotals={dayTotals}
            grandTotal={grandTotal}
            readOnly={isSubmitted}
            onUpdate={updateEntry}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Notes / Comments
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isSubmitted}
              rows={2}
              placeholder="Optional notes…"
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-allan-blue disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pb-6">
            {!isSubmitted && (
              <>
                <button onClick={saveEntries} disabled={saving} className="btn-secondary flex-1 min-w-[120px]">
                  {saving ? 'Saving…' : '💾 Save Draft'}
                </button>
                <button onClick={submitTimecard} disabled={submitting} className="btn-primary flex-1 min-w-[140px]">
                  {submitting ? 'Submitting…' : '✓ Submit Timecard'}
                </button>
              </>
            )}
            <button onClick={downloadPDF} className="btn-secondary flex-1 min-w-[120px]">
              📄 Download PDF
            </button>
            <button onClick={() => { setEmailTo(''); setShowEmailModal(true); }} className="btn-secondary flex-1 min-w-[120px]">
              ✉ Email PDF
            </button>
          </div>
        </>
      )}

      {/* Placeholder when no employee selected */}
      {!selectedEmployee && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">👷</div>
          <p className="font-medium">Select your name above to begin</p>
        </div>
      )}

      {/* Email modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">Email Timecard PDF</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient email</label>
              <input
                type="email"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="e.g. office@allanconstruction.com"
                className="w-full border rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-allan-blue"
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank to send to employee's email on file.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowEmailModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={sendEmail} disabled={emailSending} className="btn-primary flex-1">
                {emailSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm z-50 transition-all ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
