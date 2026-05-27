const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'timecard.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS cost_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    color TEXT DEFAULT '#6B7280'
  );

  CREATE TABLE IF NOT EXISTS timecards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    pay_period_start TEXT NOT NULL,
    pay_period_end TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    submitted_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS timecard_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timecard_id INTEGER NOT NULL,
    row_order INTEGER DEFAULT 0,
    job_number TEXT,
    area TEXT,
    cost_code_id INTEGER,
    d1 REAL DEFAULT 0,
    d2 REAL DEFAULT 0,
    d3 REAL DEFAULT 0,
    d4 REAL DEFAULT 0,
    d5 REAL DEFAULT 0,
    d6 REAL DEFAULT 0,
    d7 REAL DEFAULT 0,
    d8 REAL DEFAULT 0,
    d9 REAL DEFAULT 0,
    d10 REAL DEFAULT 0,
    d11 REAL DEFAULT 0,
    d12 REAL DEFAULT 0,
    d13 REAL DEFAULT 0,
    d14 REAL DEFAULT 0,
    FOREIGN KEY (timecard_id) REFERENCES timecards(id),
    FOREIGN KEY (cost_code_id) REFERENCES cost_codes(id)
  );
`);

// Seed employees
const insertEmployee = db.prepare('INSERT OR IGNORE INTO employees (id, name, email) VALUES (?, ?, ?)');
const employees = [
  [1, 'Jake Morrison', 'jake.morrison@allanconstruction.com'],
  [2, 'Maria Santos', 'maria.santos@allanconstruction.com'],
  [3, 'Derek Olson', 'derek.olson@allanconstruction.com'],
  [4, 'Tina Brewer', 'tina.brewer@allanconstruction.com'],
  [5, 'Carlos Vega', 'carlos.vega@allanconstruction.com'],
];
employees.forEach(e => insertEmployee.run(...e));

// Seed cost codes
const insertCode = db.prepare('INSERT OR IGNORE INTO cost_codes (id, code, description, category, color) VALUES (?, ?, ?, ?, ?)');
const costCodes = [
  // General Conditions
  [1,  '01-100', 'Project Management',          'General Conditions',  '#3B82F6'],
  [2,  '01-200', 'Site Superintendent',          'General Conditions',  '#3B82F6'],
  [3,  '01-300', 'Safety & Compliance',          'General Conditions',  '#3B82F6'],
  [4,  '01-400', 'Temporary Facilities',         'General Conditions',  '#3B82F6'],
  [5,  '01-500', 'Travel / Mobilization',        'General Conditions',  '#3B82F6'],
  // Site Work
  [6,  '02-100', 'Demolition',                   'Site Work',           '#F59E0B'],
  [7,  '02-200', 'Excavation & Grading',         'Site Work',           '#F59E0B'],
  [8,  '02-300', 'Utilities – Underground',      'Site Work',           '#F59E0B'],
  [9,  '02-400', 'Paving & Surfacing',           'Site Work',           '#F59E0B'],
  [10, '02-500', 'Landscaping',                  'Site Work',           '#F59E0B'],
  // Concrete
  [11, '03-100', 'Forming',                      'Concrete',            '#EF4444'],
  [12, '03-200', 'Reinforcing Steel',            'Concrete',            '#EF4444'],
  [13, '03-300', 'Cast-in-Place Concrete',       'Concrete',            '#EF4444'],
  [14, '03-400', 'Precast Concrete',             'Concrete',            '#EF4444'],
  [15, '03-500', 'Flatwork / Slabs',             'Concrete',            '#EF4444'],
  // Masonry
  [16, '04-100', 'Brick & Block',                'Masonry',             '#D97706'],
  [17, '04-200', 'Stone Work',                   'Masonry',             '#D97706'],
  // Metals / Steel
  [18, '05-100', 'Structural Steel',             'Metals',              '#8B5CF6'],
  [19, '05-200', 'Metal Decking',                'Metals',              '#8B5CF6'],
  [20, '05-300', 'Misc. Metals / Handrails',     'Metals',              '#8B5CF6'],
  // Carpentry / Framing
  [21, '06-100', 'Rough Framing',                'Carpentry',           '#10B981'],
  [22, '06-200', 'Finish Carpentry / Millwork',  'Carpentry',           '#10B981'],
  [23, '06-300', 'Sheathing',                    'Carpentry',           '#10B981'],
  // Thermal / Moisture
  [24, '07-100', 'Waterproofing',                'Thermal & Moisture',  '#06B6D4'],
  [25, '07-200', 'Insulation',                   'Thermal & Moisture',  '#06B6D4'],
  [26, '07-300', 'Roofing',                      'Thermal & Moisture',  '#06B6D4'],
  [27, '07-400', 'Siding / Cladding',            'Thermal & Moisture',  '#06B6D4'],
  // Openings
  [28, '08-100', 'Doors & Frames',               'Openings',            '#EC4899'],
  [29, '08-200', 'Windows & Glazing',            'Openings',            '#EC4899'],
  [30, '08-300', 'Hardware',                     'Openings',            '#EC4899'],
  // Finishes
  [31, '09-100', 'Drywall / GWB',                'Finishes',            '#F97316'],
  [32, '09-200', 'Tile & Stone Flooring',        'Finishes',            '#F97316'],
  [33, '09-300', 'Painting & Coatings',          'Finishes',            '#F97316'],
  [34, '09-400', 'Flooring / Carpet',            'Finishes',            '#F97316'],
  [35, '09-500', 'Acoustical Ceilings',          'Finishes',            '#F97316'],
  // Mechanical
  [36, '15-100', 'HVAC – Ductwork',              'Mechanical',          '#14B8A6'],
  [37, '15-200', 'Plumbing – Rough-in',          'Mechanical',          '#14B8A6'],
  [38, '15-300', 'Plumbing – Trim',              'Mechanical',          '#14B8A6'],
  [39, '15-400', 'Fire Suppression',             'Mechanical',          '#14B8A6'],
  // Electrical
  [40, '16-100', 'Electrical Rough-in',          'Electrical',          '#F43F5E'],
  [41, '16-200', 'Electrical Trim & Devices',    'Electrical',          '#F43F5E'],
  [42, '16-300', 'Low Voltage / Data',           'Electrical',          '#F43F5E'],
  [43, '16-400', 'Lighting',                     'Electrical',          '#F43F5E'],
  // Equipment
  [44, '17-100', 'Equipment Operation',          'Equipment',           '#6366F1'],
  [45, '17-200', 'Equipment Maintenance',        'Equipment',           '#6366F1'],
  // Other
  [46, '99-100', 'Punch List / Closeout',        'Other',               '#9CA3AF'],
  [47, '99-200', 'Training / Safety Meeting',    'Other',               '#9CA3AF'],
  [48, '99-300', 'Shop / Yard Work',             'Other',               '#9CA3AF'],
];
costCodes.forEach(c => insertCode.run(...c));

console.log('Database initialized with employees and cost codes.');
db.close();
