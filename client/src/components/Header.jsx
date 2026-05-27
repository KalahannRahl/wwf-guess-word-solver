export default function Header({ view, setView }) {
  return (
    <header className="bg-allan-blue text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="bg-white rounded px-2 py-1 flex flex-col leading-none">
            <span className="text-allan-blue font-black text-sm tracking-tight">ALLAN</span>
            <span className="text-allan-blue font-bold text-[9px] tracking-widest">CONSTRUCTION</span>
          </div>
          <div className="hidden sm:block">
            <p className="font-bold text-sm">Employee Time Card</p>
          </div>
        </div>
        <nav className="flex gap-2">
          <button
            onClick={() => setView('timecard')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'timecard' ? 'bg-white text-allan-blue' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            My Card
          </button>
          <button
            onClick={() => setView('admin')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'admin' ? 'bg-white text-allan-blue' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Admin
          </button>
        </nav>
      </div>
    </header>
  );
}
