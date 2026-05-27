// Client-side localStorage API — mirrors the shape of the Express API routes
// so components stay identical whether running against backend or GitHub Pages.

// ─── Embedded seed data ──────────────────────────────────────────────────────

export const EMPLOYEES = [
  { id: 1, name: 'Jake Morrison',  email: 'jake.morrison@allanconstruction.com' },
  { id: 2, name: 'Maria Santos',   email: 'maria.santos@allanconstruction.com' },
  { id: 3, name: 'Derek Olson',    email: 'derek.olson@allanconstruction.com' },
  { id: 4, name: 'Tina Brewer',    email: 'tina.brewer@allanconstruction.com' },
  { id: 5, name: 'Carlos Vega',    email: 'carlos.vega@allanconstruction.com' },
];

export const COST_CODES = [
  { id:  1, code:'01-100', description:'Project Management',         category:'General Conditions', color:'#3B82F6' },
  { id:  2, code:'01-200', description:'Site Superintendent',        category:'General Conditions', color:'#3B82F6' },
  { id:  3, code:'01-300', description:'Safety & Compliance',        category:'General Conditions', color:'#3B82F6' },
  { id:  4, code:'01-400', description:'Temporary Facilities',       category:'General Conditions', color:'#3B82F6' },
  { id:  5, code:'01-500', description:'Travel / Mobilization',      category:'General Conditions', color:'#3B82F6' },
  { id:  6, code:'02-100', description:'Demolition',                 category:'Site Work',          color:'#F59E0B' },
  { id:  7, code:'02-200', description:'Excavation & Grading',       category:'Site Work',          color:'#F59E0B' },
  { id:  8, code:'02-300', description:'Utilities – Underground',    category:'Site Work',          color:'#F59E0B' },
  { id:  9, code:'02-400', description:'Paving & Surfacing',         category:'Site Work',          color:'#F59E0B' },
  { id: 10, code:'02-500', description:'Landscaping',                category:'Site Work',          color:'#F59E0B' },
  { id: 11, code:'03-100', description:'Forming',                    category:'Concrete',           color:'#EF4444' },
  { id: 12, code:'03-200', description:'Reinforcing Steel',          category:'Concrete',           color:'#EF4444' },
  { id: 13, code:'03-300', description:'Cast-in-Place Concrete',     category:'Concrete',           color:'#EF4444' },
  { id: 14, code:'03-400', description:'Precast Concrete',           category:'Concrete',           color:'#EF4444' },
  { id: 15, code:'03-500', description:'Flatwork / Slabs',           category:'Concrete',           color:'#EF4444' },
  { id: 16, code:'04-100', description:'Brick & Block',              category:'Masonry',            color:'#D97706' },
  { id: 17, code:'04-200', description:'Stone Work',                 category:'Masonry',            color:'#D97706' },
  { id: 18, code:'05-100', description:'Structural Steel',           category:'Metals',             color:'#8B5CF6' },
  { id: 19, code:'05-200', description:'Metal Decking',              category:'Metals',             color:'#8B5CF6' },
  { id: 20, code:'05-300', description:'Misc. Metals / Handrails',   category:'Metals',             color:'#8B5CF6' },
  { id: 21, code:'06-100', description:'Rough Framing',              category:'Carpentry',          color:'#10B981' },
  { id: 22, code:'06-200', description:'Finish Carpentry / Millwork',category:'Carpentry',          color:'#10B981' },
  { id: 23, code:'06-300', description:'Sheathing',                  category:'Carpentry',          color:'#10B981' },
  { id: 24, code:'07-100', description:'Waterproofing',              category:'Thermal & Moisture', color:'#06B6D4' },
  { id: 25, code:'07-200', description:'Insulation',                 category:'Thermal & Moisture', color:'#06B6D4' },
  { id: 26, code:'07-300', description:'Roofing',                    category:'Thermal & Moisture', color:'#06B6D4' },
  { id: 27, code:'07-400', description:'Siding / Cladding',          category:'Thermal & Moisture', color:'#06B6D4' },
  { id: 28, code:'08-100', description:'Doors & Frames',             category:'Openings',           color:'#EC4899' },
  { id: 29, code:'08-200', description:'Windows & Glazing',          category:'Openings',           color:'#EC4899' },
  { id: 30, code:'08-300', description:'Hardware',                   category:'Openings',           color:'#EC4899' },
  { id: 31, code:'09-100', description:'Drywall / GWB',              category:'Finishes',           color:'#F97316' },
  { id: 32, code:'09-200', description:'Tile & Stone Flooring',      category:'Finishes',           color:'#F97316' },
  { id: 33, code:'09-300', description:'Painting & Coatings',        category:'Finishes',           color:'#F97316' },
  { id: 34, code:'09-400', description:'Flooring / Carpet',          category:'Finishes',           color:'#F97316' },
  { id: 35, code:'09-500', description:'Acoustical Ceilings',        category:'Finishes',           color:'#F97316' },
  { id: 36, code:'15-100', description:'HVAC – Ductwork',            category:'Mechanical',         color:'#14B8A6' },
  { id: 37, code:'15-200', description:'Plumbing – Rough-in',        category:'Mechanical',         color:'#14B8A6' },
  { id: 38, code:'15-300', description:'Plumbing – Trim',            category:'Mechanical',         color:'#14B8A6' },
  { id: 39, code:'15-400', description:'Fire Suppression',           category:'Mechanical',         color:'#14B8A6' },
  { id: 40, code:'16-100', description:'Electrical Rough-in',        category:'Electrical',         color:'#F43F5E' },
  { id: 41, code:'16-200', description:'Electrical Trim & Devices',  category:'Electrical',         color:'#F43F5E' },
  { id: 42, code:'16-300', description:'Low Voltage / Data',         category:'Electrical',         color:'#F43F5E' },
  { id: 43, code:'16-400', description:'Lighting',                   category:'Electrical',         color:'#F43F5E' },
  { id: 44, code:'17-100', description:'Equipment Operation',        category:'Equipment',          color:'#6366F1' },
  { id: 45, code:'17-200', description:'Equipment Maintenance',      category:'Equipment',          color:'#6366F1' },
  { id: 46, code:'99-100', description:'Punch List / Closeout',      category:'Other',              color:'#9CA3AF' },
  { id: 47, code:'99-200', description:'Training / Safety Meeting',  category:'Other',              color:'#9CA3AF' },
  { id: 48, code:'99-300', description:'Shop / Yard Work',           category:'Other',              color:'#9CA3AF' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPayPeriod(dateStr) {
  const anchor = new Date('2024-01-01T00:00:00');
  const target = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const ms14 = 14 * 86400000;
  const idx = Math.floor((target - anchor) / ms14);
  const start = new Date(anchor.getTime() + idx * ms14);
  const end = new Date(start.getTime() + 13 * 86400000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function getDayLabels(startDate) {
  const days = [];
  const base = new Date(startDate + 'T00:00:00');
  const DAY = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  for (let i = 0; i < 14; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    days.push({
      short: DAY[i % 7],
      date: d.toISOString().slice(0, 10),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    });
  }
  return days;
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? null) ?? fallback; } catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

let _tcId = load('tc_next_id', 1);
function nextId() { const id = _tcId++; save('tc_next_id', _tcId); return id; }

// ─── localStorage CRUD ────────────────────────────────────────────────────────

export function lsGetEmployees() { return EMPLOYEES; }
export function lsGetCostCodes() { return COST_CODES; }

export function lsGetOrCreateTimecard(employeeId, payPeriodStart) {
  const all = load('timecards', []);
  const pp = getPayPeriod(payPeriodStart);
  let tc = all.find(t => t.employee_id === Number(employeeId) && t.pay_period_start === pp.start);
  if (!tc) {
    tc = {
      id: nextId(),
      employee_id: Number(employeeId),
      pay_period_start: pp.start,
      pay_period_end: pp.end,
      status: 'draft',
      notes: null,
      submitted_at: null,
      created_at: new Date().toISOString(),
    };
    all.push(tc);
    save('timecards', all);
  }
  const entries = load(`entries_${tc.id}`, []);
  return { timecard: tc, entries };
}

export function lsSaveEntries(timecardId, entries) {
  save(`entries_${timecardId}`, entries);
}

export function lsSubmitTimecard(timecardId) {
  const all = load('timecards', []);
  const idx = all.findIndex(t => t.id === Number(timecardId));
  if (idx >= 0) {
    all[idx].status = 'submitted';
    all[idx].submitted_at = new Date().toISOString();
    save('timecards', all);
    return all[idx];
  }
  return null;
}

export function lsSaveNotes(timecardId, notes) {
  const all = load('timecards', []);
  const idx = all.findIndex(t => t.id === Number(timecardId));
  if (idx >= 0) { all[idx].notes = notes; save('timecards', all); }
}

export function lsAdminGetAll() {
  const all = load('timecards', []);
  return all.map(tc => ({
    ...tc,
    employee_name: EMPLOYEES.find(e => e.id === tc.employee_id)?.name ?? 'Unknown',
  })).sort((a, b) => b.pay_period_start.localeCompare(a.pay_period_start));
}

export function lsAdminGetOne(id) {
  const all = load('timecards', []);
  const tc = all.find(t => t.id === Number(id));
  if (!tc) return null;
  const emp = EMPLOYEES.find(e => e.id === tc.employee_id);
  const entries = load(`entries_${tc.id}`, []).map(row => {
    const cc = COST_CODES.find(c => c.id === Number(row.cost_code_id));
    return { ...row, cc_code: cc?.code, cc_desc: cc?.description, cc_cat: cc?.category };
  });
  return { timecard: { ...tc, employee_name: emp?.name, employee_email: emp?.email }, entries };
}
