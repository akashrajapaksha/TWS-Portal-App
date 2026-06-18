import React, { useState, useEffect } from 'react';
import { 
  Search, User, AlertTriangle, FileWarning, Keyboard, 
  ShoppingBag, Banknote, Filter, ArrowLeft, LucideIcon, 
  Users, Info, Loader2, Construction, Hammer, Settings
} from 'lucide-react';

// Pointing back to your local development server
const API_BASE_URL = 'https://ambassador-michigan-mandate-penalty.trycloudflare.com';

export function Analyzing({ onBack }: { onBack?: () => void }) {
  // --- TOGGLE FOR WORK IN PROGRESS STATUS ---
  const isPageUnderConstruction = true; 

  // Filters & State
  const [selectionMode, setSelectionMode] = useState<'single' | 'all'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shift, setShift] = useState('All');
  const [project, setProject] = useState('All');
  const [projectList, setProjectList] = useState<any[]>([]);
  
  // UI State
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Load Projects from Backend
  useEffect(() => {
    if (isPageUnderConstruction) return; // Skip if under development
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/projects`, {
          headers: { 'x-user-role': 'Admin' }
        });
        const data = await res.json();
        if (data.success) setProjectList(data.projects);
      } catch (err) {
        console.error("Failed to load projects local", err);
      }
    };
    fetchProjects();
  }, []);

  // 2. Search Handler
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isPageUnderConstruction) return;

    if (selectionMode === 'single' && !searchQuery) {
      setError("Please enter an Employee ID");
      return;
    }

    setResults(null); 
    setIsSearching(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        mode: selectionMode,
        empId: selectionMode === 'single' ? searchQuery.trim() : 'ALL',
        start: startDate,
        end: endDate,
        shift: shift,
        project: project
      });

      const res = await fetch(`${API_BASE_URL}/api/analytics/search?${params}`);
      const data = await res.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.message || "No records found.");
      }
    } catch (err) {
      setError("Connection to local server failed. Is the backend running on port 5000?");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative p-4 md:p-8 space-y-6 animate-in fade-in duration-500 min-h-[80vh]">
      
      {/* WORK IN PROGRESS OVERLAY LAYER */}
      {isPageUnderConstruction && (
        <div className="absolute inset-0 bg-slate-50/60 backdrop-blur-[6px] z-50 rounded-[3rem] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-slate-200/80 shadow-2xl max-w-lg space-y-6 relative overflow-hidden group">
            {/* Top Amber Highlight Bar */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />
            
            {/* Animated Icon Cluster */}
            <div className="flex justify-center items-center gap-3 relative">
              <Settings className="w-12 h-12 text-slate-800 animate-spin [animation-duration:8s]" />
              <Hammer className="w-8 h-8 text-indigo-500 absolute -top-2 -right-2 transform rotate-12 group-hover:animate-bounce" />
              <Construction className="w-6 h-6 text-amber-500 absolute -bottom-1 -left-2" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-wide">Module In Progress</h2>
              <p className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.25em] bg-indigo-50 px-3 py-1.5 rounded-full w-fit mx-auto">
                Database Engineering Syncing
              </p>
            </div>

            <p className="text-xs font-bold text-slate-500 leading-relaxed max-w-sm mx-auto">
              The performance analytics calculation queries are currently being optimized to link with the new attendance reporting structures.
            </p>

            {/* Simulated Progress bar */}
            <div className="space-y-2 pt-2">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-900 h-full w-[75%] rounded-full animate-pulse" />
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">
                <span>Phase 2 deployment</span>
                <span>75% Complete</span>
              </div>
            </div>

            {/* Back Navigation Button out of jail */}
            {onBack && (
              <button 
                onClick={onBack}
                className="mt-4 px-6 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 transition-all inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-3 h-3" /> Return to Dashboard
              </button>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase italic">Performance Analytics</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team TWS Internal System</p>
          </div>
        </div>
      </div>

      {/* SELECTION MODES */}
      <div className="flex gap-2 p-1 bg-slate-100 w-fit rounded-2xl border border-slate-200">
        <button 
          onClick={() => { setSelectionMode('single'); setResults(null); setError(null); }} 
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectionMode === 'single' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
        >
          <User className="w-3 h-3" /> Individual
        </button>
        <button 
          onClick={() => { setSelectionMode('all'); setResults(null); setError(null); setSearchQuery(''); }} 
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectionMode === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
        >
          <Users className="w-3 h-3" /> All Employees
        </button>
      </div>

      {/* FILTER BOX */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm space-y-6">
        <form onSubmit={handleSearch} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className={`space-y-2 transition-opacity ${selectionMode === 'all' ? 'opacity-30 pointer-events-none' : ''}`}>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Employee ID</label>
              <input 
                type="text" 
                placeholder=""
                className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold italic focus:ring-2 focus:ring-indigo-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="lg:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Analysis Period</label>
              <div className="flex gap-2">
                 <input type="date" className="w-full px-3 py-4 bg-slate-50 border-none rounded-2xl text-[10px] font-bold" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
                 <input type="date" className="w-full px-3 py-4 bg-slate-50 border-none rounded-2xl text-[10px] font-bold" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Shift Filter</label>
              <select className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-[10px] font-bold uppercase cursor-pointer" value={shift} onChange={(e) => setShift(e.target.value)}>
                <option value="All">All Shifts</option>
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Night">Night</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Project</label>
              <select className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-[10px] font-bold uppercase cursor-pointer" value={project} onChange={(e) => setProject(e.target.value)}>
                <option value="All">All Projects</option>
                {projectList.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={isSearching} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 disabled:bg-slate-200 transition-all">
            {isSearching ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</span> : 'Execute Analysis'}
          </button>
        </form>

        <div className="space-y-3">
          <div className={`flex items-center gap-3 px-6 py-4 border rounded-2xl transition-all ${error ? 'bg-rose-50 border-rose-100' : results ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
            <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center shadow-sm">
              {selectionMode === 'all' ? <Users className="w-5 h-5 text-indigo-500" /> : <User className={`w-5 h-5 ${results ? 'text-emerald-500' : 'text-slate-300'}`} />}
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {error ? 'Analysis Error' : results ? 'Identity Verified' : 'System Ready'}
              </p>
              <p className={`text-xs font-black uppercase italic ${error ? 'text-rose-600' : 'text-slate-700'}`}>
                {error || (results ? results.employee.name : "Select parameters to begin")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS GRID */}
      {results && results.stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-in zoom-in-95 duration-500">
           <MetricCard icon={AlertTriangle} label="Incident Reports" value={results.stats.total_irs} color="text-amber-500" bg="bg-amber-50" />
           <MetricCard icon={FileWarning} label="Active Warnings" value={results.stats.total_warnings} color="text-rose-500" bg="bg-rose-50" />
           <MetricCard icon={Keyboard} label="Wrong Keys" value={results.stats.total_wrong_keys} color="text-indigo-500" bg="bg-indigo-50" />
           <MetricCard icon={ShoppingBag} label="Orders" value={results.stats.total_orders} color="text-emerald-500" bg="bg-emerald-50" />
           <MetricCard icon={Banknote} label="Short Money" value={`LKR ${results.stats.total_short_money.toLocaleString()}`} color="text-slate-900" bg="bg-slate-100" />
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[3rem]">
           <Filter className="w-10 h-10 text-slate-100 mb-4" />
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Awaiting Analysis Parameters</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, bg }: { icon: LucideIcon, label: string, value: any, color: string, bg: string }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-4 hover:-translate-y-1 transition-all">
      <div className={`p-4 rounded-2xl ${bg} ${color}`}><Icon className="w-8 h-8" /></div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-3xl font-black ${color} italic tabular-nums tracking-tighter`}>{value}</p>
      </div>
    </div>
  );
}

export default Analyzing;