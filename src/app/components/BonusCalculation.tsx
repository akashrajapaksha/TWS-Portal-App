import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Trophy, RefreshCcw, Plus, Trash2,
  Lock, Sparkles, Layers, Settings2, Save
} from 'lucide-react';

// --- Configuration ---
const API_BASE_URL = "http://localhost:5000/api/bonus";
const PROJECTS_API_URL = "http://localhost:5000/api/projects"; 

interface BonusTier {
  threshold: number;
  bonus: number;
}

interface Project {
  id: string; // Changed from _id to match Supabase
  name: string;
  bonus_tiers?: BonusTier[]; // Changed to snake_case to match DB
}

interface DailyData {
  date: string;
  status: string;
  orders: number;
  mistakes: number;
  net: number;
}

interface CalculationResult {
  success: boolean;
  employeeName: string;
  totalOrders: number;
  totalNet: number;
  projectName: string;
  dailyBreakdown: DailyData[];
}

export function BonusCalculation() {
  // --- Auth & Role Logic ---
  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('tws_user') || '{}'); } catch { return {}; }
  }, []);

  const userRole = String(storedUser.role || 'Employees'); 
  const isSuperAdmin = userRole.toUpperCase() === 'SUPER ADMIN' || userRole.toUpperCase() === 'ADMIN';
  const userEmployeeId = String(storedUser.employee_id || '').trim().toUpperCase();
  const userAssignedProject = String(storedUser.project || '').toUpperCase();

  // Helper for Headers
  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-user-role': userRole,
    'x-employee-id': userEmployeeId
  }), [userRole, userEmployeeId]);

  // --- Configuration States ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newThreshold, setNewThreshold] = useState('');
  const [newBonus, setNewBonus] = useState('');
  
  // --- Dashboard States ---
  const [employeeSearchId, setEmployeeSearchId] = useState(isSuperAdmin ? '' : userEmployeeId);
  const [dateRange, setDateRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA'), 
    end: new Date().toLocaleDateString('en-CA') 
  });
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching: Projects ---
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(PROJECTS_API_URL, { headers: getAuthHeaders() });
      const data = await res.json();
      
      // Backend now returns raw array []
      if (Array.isArray(data)) {
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      console.error("Project fetch failed", err);
    }
  }, [selectedProjectId, getAuthHeaders]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // --- Logic: Dynamic Bonus Engine ---
  const metrics = useMemo(() => {
    if (!calculation) return null;
    
    const activeProject = projects.find(p => 
      isSuperAdmin ? p.id === selectedProjectId : p.name.toUpperCase() === userAssignedProject
    );

    const tiers = activeProject?.bonus_tiers || [];
    const totalNet = calculation.totalNet;
    
    const sortedTiers = [...tiers].sort((a, b) => b.threshold - a.threshold);
    const metTier = sortedTiers.find(t => totalNet >= t.threshold);
    const nextTier = [...tiers].sort((a, b) => a.threshold - b.threshold).find(t => t.threshold > totalNet);

    return {
      projectName: activeProject?.name || "Standard",
      earnedBonus: metTier ? metTier.bonus : 0,
      next: nextTier ? {
        gap: nextTier.threshold - totalNet,
        bonus: nextTier.bonus,
        percent: Math.min(100, (totalNet / nextTier.threshold) * 100)
      } : null
    };
  }, [calculation, projects, selectedProjectId, isSuperAdmin, userAssignedProject]);

  // --- Handlers ---
  const handleUpdateTiers = async () => {
    if (!selectedProjectId) return;
    setIsSaving(true);
    try {
      const targetProject = projects.find(p => p.id === selectedProjectId);
      const res = await fetch(`${PROJECTS_API_URL}/${selectedProjectId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          ...targetProject,
          bonus_tiers: targetProject?.bonus_tiers 
        })
      });
      if (res.ok) alert("Project Rules Synced Successfully");
    } catch {
      setError("Failed to save configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCalculate = useCallback(async () => {
    if (!employeeSearchId) return;
    setIsLoading(true);
    setError(null);
    try {
      const url = `${API_BASE_URL}/calculate/${employeeSearchId}?startDate=${dateRange.start}&endDate=${dateRange.end}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const result = await res.json();
      
      if (result.success) {
        setCalculation(result);
      } else {
        setError(result.message || "Failed to calculate.");
        setCalculation(null);
      }
    } catch {
      setError("Server connection lost.");
    } finally {
      setIsLoading(false);
    }
  }, [employeeSearchId, dateRange, getAuthHeaders]);

  useEffect(() => { 
    if (!isSuperAdmin && userEmployeeId && projects.length > 0) {
        handleCalculate(); 
    }
  }, [isSuperAdmin, userEmployeeId, handleCalculate, projects.length]);

  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen p-8 font-sans">
      
      {/* 1. ADMIN CONFIGURATION BOX */}
      {isSuperAdmin && (
        <div className="max-w-7xl mx-auto mb-8 bg-white border-2 border-blue-50 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl">
                <Settings2 className="text-white w-5 h-5" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 italic">Project Rules Setup</h3>
            </div>
            <button 
              onClick={handleUpdateTiers} 
              disabled={isSaving} 
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
            >
              {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />} 
              {isSaving ? "Syncing..." : "Apply Rules"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Project</label>
              <select 
                value={selectedProjectId} 
                onChange={(e) => setSelectedProjectId(e.target.value)} 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm border-none outline-none"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="lg:col-span-3 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Incentive Tier</label>
              <div className="flex gap-3">
                <input type="number" placeholder="Net Threshold" value={newThreshold} onChange={e => setNewThreshold(e.target.value)} className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                <input type="number" placeholder="Bonus ($)" value={newBonus} onChange={e => setNewBonus(e.target.value)} className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                <button 
                  onClick={() => {
                    if (!newThreshold || !newBonus) return;
                    setProjects(projects.map(p => p.id === selectedProjectId ? { ...p, bonus_tiers: [...(p.bonus_tiers || []), { threshold: Number(newThreshold), bonus: Number(newBonus) }] } : p));
                    setNewThreshold(''); setNewBonus('');
                  }} 
                  className="bg-blue-600 text-white px-6 rounded-2xl hover:bg-blue-700"
                >
                  <Plus size={24}/>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {projects.find(p => p.id === selectedProjectId)?.bonus_tiers?.sort((a,b) => b.threshold - a.threshold).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 font-black text-[10px] uppercase tracking-wider">
                    <span>{t.threshold} Net = ${t.bonus}</span>
                    <button onClick={() => {
                      setProjects(projects.map(p => p.id === selectedProjectId ? { ...p, bonus_tiers: p.bonus_tiers?.filter((_, idx) => idx !== i) } : p));
                    }} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN DASHBOARD CONTENT */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee ID</label>
                <div className="relative">
                  {isSuperAdmin ? <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" /> : <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />}
                  <input 
                    type="text" 
                    value={employeeSearchId} 
                    readOnly={!isSuperAdmin} 
                    onChange={(e) => setEmployeeSearchId(e.target.value.toUpperCase())} 
                    className={`w-full pl-11 pr-4 py-4 rounded-2xl font-bold text-sm border-none ${!isSuperAdmin ? 'bg-blue-50/50 text-blue-700' : 'bg-slate-50'}`} 
                  />
                </div>
              </div>
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                  <input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({...p, start: e.target.value}))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm border-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                  <input type="date" value={dateRange.end} onChange={(e) => setDateRange(p => ({...p, end: e.target.value}))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm border-none" />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2">
                <RefreshCcw size={14} /> {error}
              </div>
            )}

            <button onClick={handleCalculate} className="mt-6 w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-black transition-all">
              {isLoading ? "Analyzing..." : "Execute Bonus Analysis"}
            </button>
          </div>

          {calculation && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Date</th>
                    <th className="px-8 py-5 text-right">Orders</th>
                    <th className="px-8 py-5 text-right">Mistakes</th>
                    <th className="px-8 py-5 text-right text-blue-600 bg-blue-50/30">Net Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold text-xs text-slate-600">
                  {calculation.dailyBreakdown.map((day, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="px-8 py-4 font-mono">{day.date}</td>
                      <td className="px-8 py-4 text-right">{day.orders}</td>
                      <td className="px-8 py-4 text-right text-red-400">{day.mistakes}</td>
                      <td className="px-8 py-4 text-right text-blue-600 bg-blue-50/20">{day.net}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          {calculation && metrics ? (
            <>
              <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                <Trophy size={140} className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-700" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-8">
                    <Layers size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{metrics.projectName}</span>
                  </div>
                  <div className="flex justify-between items-end mb-10">
                    <div><p className="text-[10px] text-slate-500 uppercase font-black">Total Net</p><h3 className="text-6xl font-black italic tracking-tighter">{calculation.totalNet}</h3></div>
                  </div>
                  <div className="pt-10 border-t border-white/5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-blue-400">$</span>
                      <h3 className="text-7xl font-black italic tracking-tighter leading-none">{metrics.earnedBonus}</h3>
                    </div>
                    <p className="text-[10px] font-black uppercase mt-4 tracking-widest text-slate-500 italic">Projected Bonus</p>
                  </div>
                </div>
              </div>

              {metrics.next && (
                <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Next Achievement</span>
                  </div>
                  <p className="text-sm font-bold leading-relaxed mb-6">
                    Earn <span className="text-2xl font-black text-blue-200">{metrics.next.gap}</span> more points to reach 
                    <span className="font-black"> ${metrics.next.bonus}</span> bracket!
                  </p>
                  <div className="h-4 bg-white/20 rounded-full overflow-hidden p-1">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${metrics.next.percent}%` }} />
                  </div>
                </div>
              )}
            </>
          ) : (
             <div className="h-full min-h-[300px] border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center">
               <div className="bg-slate-100 p-4 rounded-full mb-4"><Search className="text-slate-300" size={32} /></div>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Enter ID for Insights</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}