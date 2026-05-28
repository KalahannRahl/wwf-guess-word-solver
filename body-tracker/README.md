# Body Composition Tracker

## Setup

```bash
# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

## Running

**Terminal 1 — Backend (port 5000):**
```bash
cd body-tracker/backend
npm start
```

**Terminal 2 — Frontend (port 3000):**
```bash
cd body-tracker/frontend
npm start
```

Then open http://localhost:3000

## Logins

| User | Password |
|------|----------|
| chad | chad123  |
| jen  | jen123   |

## Features

- **Log Entry** — record date, weight, chest/waist/hips, body fat %, visceral fat area, lean mass, notes; attach a photo
- **Charts** — body fat, lean mass, weight, visceral fat, and waist trends with mini-chart grid
- **Photos** — upload progress photos, grouped by date with lightbox viewer
- **Compare** — side-by-side photo and metric comparison between any two dates with color-coded deltas
