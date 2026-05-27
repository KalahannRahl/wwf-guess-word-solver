import { useMemo, memo } from 'react';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDayHeaders(payPeriodStart) {
  if (!payPeriodStart) return [];
  const days = [];
  const base = new Date(payPeriodStart + 'T00:00:00');
  for (let i = 0; i < 14; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    days.push({
      day: DAY_NAMES[i % 7],
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      week: i < 7 ? 1 : 2,
    });
  }
  return days;
}

const TimecardRow = memo(function TimecardRow({ entry, idx, costCodes, readOnly, onUpdate, onRemove }) {
  const rowTotal = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => parseFloat(entry[`d${i + 1}`]) || 0).reduce((a, b) => a + b, 0),
    [entry]
  );

  return (
    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      {/* Job # */}
      <td className="border-r border-gray-200 px-2 py-1 min-w-[80px]">
        <input
          type="text"
          value={entry.job_number}
          onChange={e => onUpdate(idx, 'job_number', e.target.value)}
          disabled={readOnly}
          placeholder="Job #"
          className="w-full text-sm border-0 bg-transparent outline-none disabled:text-gray-400"
        />
      </td>
      {/* Area */}
      <td className="border-r border-gray-200 px-2 py-1 min-w-[70px]">
        <input
          type="text"
          value={entry.area}
          onChange={e => onUpdate(idx, 'area', e.target.value)}
          disabled={readOnly}
          placeholder="Area"
          className="w-full text-sm border-0 bg-transparent outline-none disabled:text-gray-400"
        />
      </td>
      {/* Cost Code */}
      <td className="border-r border-gray-200 px-1 py-1 min-w-[130px]">
        <select
          value={entry.cost_code_id}
          onChange={e => onUpdate(idx, 'cost_code_id', e.target.value)}
          disabled={readOnly}
          className="w-full text-xs border-0 bg-transparent outline-none disabled:text-gray-400 py-0.5"
        >
          <option value="">— select —</option>
          {costCodes.map(cc => (
            <option key={cc.id} value={cc.id}>{cc.code} {cc.description}</option>
          ))}
        </select>
      </td>
      {/* Day columns */}
      {Array.from({ length: 14 }, (_, i) => {
        const field = `d${i + 1}`;
        const isWk2 = i >= 7;
        return (
          <td
            key={field}
            className={`border-r border-gray-200 text-center w-9 p-0 ${isWk2 ? 'bg-amber-50' : 'bg-blue-50'}`}
          >
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={entry[field]}
              onChange={e => onUpdate(idx, field, e.target.value)}
              disabled={readOnly}
              className={`day-input h-8 ${isWk2 ? 'text-amber-700' : 'text-blue-700'} disabled:text-gray-400`}
            />
          </td>
        );
      })}
      {/* Row total */}
      <td className="text-center font-bold text-sm text-allan-blue w-12 px-1 border-r border-gray-200">
        {rowTotal > 0 ? rowTotal : ''}
      </td>
      {/* Remove */}
      {!readOnly && (
        <td className="text-center w-8">
          <button
            onClick={() => onRemove(idx)}
            className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
            title="Remove row"
          >
            ×
          </button>
        </td>
      )}
    </tr>
  );
});

export default function TimecardTable({ entries, costCodes, payPeriodStart, dayTotals, grandTotal, readOnly, onUpdate, onAddRow, onRemoveRow }) {
  const dayHeaders = useMemo(() => getDayHeaders(payPeriodStart), [payPeriodStart]);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse min-w-max w-full">
          <thead>
            {/* Week labels */}
            <tr>
              <th colSpan={3} className="bg-allan-blue" />
              <th
                colSpan={7}
                className="bg-blue-600 text-white text-xs font-bold py-1 text-center border-x border-blue-400"
              >
                WEEK 1
              </th>
              <th
                colSpan={7}
                className="bg-amber-700 text-white text-xs font-bold py-1 text-center border-x border-amber-500"
              >
                WEEK 2
              </th>
              <th colSpan={readOnly ? 1 : 2} className="bg-allan-blue" />
            </tr>
            {/* Column headers */}
            <tr className="bg-allan-blue text-white">
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-white/20 min-w-[80px]">JOB #</th>
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-white/20 min-w-[70px]">AREA</th>
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-white/20 min-w-[130px]">COST CODE</th>
              {dayHeaders.map((d, i) => (
                <th
                  key={i}
                  className={`w-9 py-2 text-center font-semibold border-r border-white/20 ${
                    d.week === 1 ? 'bg-blue-600' : 'bg-amber-700'
                  }`}
                >
                  <div className="font-bold">{d.day}</div>
                  <div className="font-normal opacity-80 text-[10px]">{d.date}</div>
                </th>
              ))}
              <th className="w-12 py-2 text-center font-semibold border-r border-white/20">TOT</th>
              {!readOnly && <th className="w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((entry, idx) => (
              <TimecardRow
                key={idx}
                idx={idx}
                entry={entry}
                costCodes={costCodes}
                readOnly={readOnly}
                onUpdate={onUpdate}
                onRemove={onRemoveRow}
              />
            ))}
          </tbody>
          {/* Daily totals footer */}
          <tfoot>
            <tr className="bg-allan-blue text-white font-bold text-xs">
              <td colSpan={3} className="px-3 py-2 text-right border-r border-white/20">DAILY TOTALS</td>
              {dayTotals.map((t, i) => (
                <td key={i} className={`text-center w-9 py-2 border-r border-white/20 ${i >= 7 ? 'bg-amber-700/80' : 'bg-blue-700/80'}`}>
                  {t > 0 ? t : ''}
                </td>
              ))}
              <td className="text-center w-12 py-2 border-r border-white/20">{grandTotal > 0 ? grandTotal : ''}</td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add row button */}
      {!readOnly && (
        <div className="px-4 py-2 border-t border-gray-100">
          <button
            onClick={onAddRow}
            className="text-sm text-allan-blue font-medium flex items-center gap-1 hover:underline"
          >
            <span className="text-lg leading-none">+</span> Add Row
          </button>
        </div>
      )}
    </div>
  );
}
