import React, { useState } from 'react';
import { Clock, AlertTriangle, Calendar, Search, Loader2, FileText } from 'lucide-react';

interface ReportStats {
  totalOT: number;
  totalLates: number;
  totalLeaves: number;
}

export function AttendanceReports() {
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  const [stats, setStats] = useState<ReportStats>({
    totalOT: 0,
    totalLates: 0,
    totalLeaves: 0
  });

  const handleGenerateReport = async () => {
  if (!query || !startDate || !endDate) {
    alert("Please provide Employee ID and the Date Range.");
    return;
  }

  setLoading(true);
  try {
    // 1. Match your backend: /api/employees/public-search/[ID]
    // Note: We use the 'query' state directly as the URL parameter
    const empRes = await fetch(`http://localhost:5000/api/employees/public-search/${query.trim()}`);
    
    if (!empRes.ok) {
      const errorData = await empRes.json();
      throw new Error(errorData.message || "Employee not found");
    }

    const employee = await empRes.json();

    // 2. Now call your reports route using the ID the user typed
    // (Since your public-search only returns the name, we use 'query' for the ID)
    const reportRes = await fetch(
      `http://localhost:5000/api/attendance-reports/generate?employee_id=${query.trim()}&start_date=${startDate}&end_date=${endDate}`
    );
    
    const result = await reportRes.json();

    if (result.success) {
      setStats(result.data);
      setHasGenerated(true);
    } else {
      throw new Error(result.message);
    }

  } catch (error: any) {
    console.error("Report Error:", error);
    alert(error.message || "Failed to generate report.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Search & Filter Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
          
          <div className="lg:col-span-1">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Employee Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Name or ID..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">From Date</label>
            <input 
              type="date"
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">To Date</label>
            <input 
              type="date"
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button 
            onClick={handleGenerateReport}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-200"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Process Report'}
          </button>

        </div>
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ReportTile 
          label="Total OT Hours" 
          value={`${stats.totalOT}h`} 
          icon={Clock} 
          color="indigo" 
          active={hasGenerated}
        />
        <ReportTile 
          label="Late Arrivals" 
          value={stats.totalLates.toString()} 
          icon={AlertTriangle} 
          color="rose" 
          active={hasGenerated}
        />
        <ReportTile 
          label="Total Leaves" 
          value={stats.totalLeaves.toString()} 
          icon={Calendar} 
          color="amber" 
          active={hasGenerated}
        />
      </div>

      {!hasGenerated && !loading && (
        <div className="mt-20 flex flex-col items-center justify-center text-slate-300">
          <FileText className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Enter details above to see results</p>
        </div>
      )}
    </div>
  );
}

interface TileProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: 'indigo' | 'rose' | 'amber';
  active: boolean;
}

function ReportTile({ label, value, icon: Icon, color, active }: TileProps) {
  const colorMap = {
    indigo: "text-indigo-600 bg-indigo-50",
    rose: "text-rose-600 bg-rose-50",
    amber: "text-amber-600 bg-amber-50"
  };

  return (
    <div className={`
      bg-white p-10 rounded-[3rem] border border-slate-50 shadow-sm flex flex-col items-center text-center 
      group transition-all duration-500 
      ${active ? 'opacity-100 scale-100 shadow-xl' : 'opacity-40 scale-95 pointer-events-none'}
    `}>
      <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${colorMap[color]}`}>
        <Icon className="w-10 h-10" />
      </div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{label}</p>
      <p className="text-5xl font-black text-slate-900">{active ? value : '--'}</p>
    </div>
  );
}