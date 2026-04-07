import { useState, useEffect, useCallback } from 'react';
import { 
  Users, Package, TriangleAlert, RefreshCcw, 
  Search, Activity, Calendar, Target, Zap
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

interface LeaveRecord {
  id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  project: string;
}

interface DashboardContentProps {
  employeeName?: string;
  employeeId?: string; 
  employeeInitials?: string;
  userRole?: string; 
}

export function DashboardContent({ 
  employeeName: authName = "User", 
  employeeId: authId = "",
  employeeInitials: authInitials = "??",
  userRole = 'Employees' 
}: DashboardContentProps) {
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalMistakes: 0,
    totalMyrLoss: 0,
    overallPerformance: 0,
    upcomingLeaves: [] as LeaveRecord[]
  });
  
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [targetEmployee, setTargetEmployee] = useState({
    name: authName,
    id: authId,
    initials: authInitials,
    isSelf: true
  });

  const isAuthority = ['SUPER ADMIN', 'ADMIN', 'ER', 'TPS', 'TL', 'SUPERVISORS', 'TSP', 'LD'].includes(userRole.toUpperCase().trim());

  const fetchDashboardData = useCallback(async (empId: string) => {
    if (!empId) return;
    setLoading(true);
    try {
      const role = userRole.toUpperCase().trim();
      const response = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
        params: { employeeId: empId, userRole: role },
        withCredentials: true 
      });
      
      const { data } = response;
      setStats({
        totalOrders: Number(data.totalOrders) || 0,
        totalMistakes: Number(data.totalMistakes) || 0,
        totalMyrLoss: Number(data.totalMyrLoss) || 0,
        overallPerformance: Number(data.overallPerformance) || 0,
        upcomingLeaves: data.upcomingLeaves || []
      });
      
      if (data.totalEmployees !== undefined) {
        setTotalEmployees(Number(data.totalEmployees));
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (targetEmployee.id) fetchDashboardData(targetEmployee.id);
  }, [targetEmployee.id, fetchDashboardData]);

  const handleSearch = async () => {
    if (!isAuthority || !searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/search/${searchQuery.trim().toUpperCase()}`, {
        withCredentials: true
      });
      
      if (response.data) {
        const data = response.data;
        setTargetEmployee({
          name: data.name,
          id: data.id,
          initials: data.initials || '??',
          isSelf: data.id === authId
        });
      }
    } catch (err: any) {
      alert(err.response?.status === 404 ? "Employee Not Found" : "Search Failed");
    } finally {
      setIsSearching(false);
      setSearchQuery('');
    }
  };

  return (
    <div className="flex-1 bg-[#F9FBFF] min-h-screen font-sans pb-10">
      
      {/* --- 1. NAVIGATION (Removed TWS & Personal Intelligence) --- */}
      <nav className="bg-white border-b border-slate-100 px-8 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Zap size={14} className="text-blue-600 fill-blue-600" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">System Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthority && !targetEmployee.isSelf && (
            <button 
              onClick={() => setTargetEmployee({ name: authName, id: authId, initials: authInitials, isSelf: true })}
              className="text-[9px] font-black text-blue-600 uppercase border border-blue-100 px-3 py-1 rounded-lg hover:bg-blue-50 transition-all"
            >
              <RefreshCcw size={10} className={`inline mr-1 ${loading ? 'animate-spin' : ''}`} /> Reset View
            </button>
          )}
          <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-[9px] font-black text-slate-500 border border-slate-200">
            {targetEmployee.initials}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8 space-y-6">
        
        {/* --- 2. HEADER (System Live & Decreased Name Size) --- */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-md">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">System Live</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              {targetEmployee.isSelf ? authName : targetEmployee.name}
            </h1>
          </div>

          {isAuthority && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" placeholder="SEARCH ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-11 pr-20 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all shadow-sm"
              />
              <button 
                onClick={handleSearch}
                disabled={isSearching}
                className="absolute right-2 top-2 bottom-2 px-4 bg-slate-900 text-white text-[9px] font-black uppercase rounded-xl disabled:opacity-50"
              >
                {isSearching ? '...' : 'Find'}
              </button>
            </div>
          )}
        </header>

        {/* --- 3. TILES (Decreased Size, Larger Names, No Network Nodes) --- */}
        <section className={`grid grid-cols-1 ${isAuthority ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
          {isAuthority && (
            <MetricTile title="Staff Count" value={totalEmployees} color="blue" loading={loading} />
          )}
          <MetricTile title="Orders Done" value={stats.totalOrders} color="blue" loading={loading} />
          
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Mistakes</h3>
             <div className="text-5xl font-black text-rose-600 italic tracking-tighter leading-none mb-3">
                {loading ? '...' : stats.totalMistakes}
             </div>
             <div className="text-2xl font-black text-slate-400 uppercase tracking-tighter">
                RM {stats.totalMyrLoss.toFixed(2)} <span className="text-[10px] text-slate-300 ml-1">Impact</span>
             </div>
          </div>
        </section>

        {/* --- 5. EFFICIENCY INDEX (Small Size) --- */}
        <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="text-center md:text-left">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 block mb-1">Efficiency Index</span>
                <div className="text-7xl font-black italic tracking-tighter text-blue-400 leading-none">
                  {loading ? '...' : stats.overallPerformance}
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-80 space-y-3">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>Reliability Flow</span>
                <span>{stats.overallPerformance}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                  style={{ width: `${Math.min(100, Math.max(0, stats.overallPerformance))}%` }} 
                />
              </div>
            </div>
          </div>
        </section>

        {/* --- 6. LEAVES CHART (Replaced Availability Flow Tiles) --- */}
        <section className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-10">
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
              <Calendar size={20} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Leaves</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="pb-5 px-4">Employee Name</th>
                  <th className="pb-5 px-4 text-right">Date of Leave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.upcomingLeaves.length > 0 ? (
                  stats.upcomingLeaves.map((leave) => (
                    <tr key={leave.id} className="group hover:bg-slate-50/50 transition-all">
                      <td className="py-5 px-4">
                        <span className="text-sm font-black text-slate-900 uppercase group-hover:text-blue-600 transition-colors">
                          {leave.employee_name}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-right">
                        <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl text-[11px] font-black text-slate-600 uppercase">
                          <Activity size={12} className="text-blue-400" />
                          {new Date(leave.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-20 text-center">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">No Pending Records</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricTile({ title, value, loading }: any) {
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">{title}</h3>
      <div className="text-5xl font-black text-blue-600 italic tracking-tighter leading-none mb-3">
        {loading ? '...' : value}
      </div>
      <div className="h-1 w-10 bg-slate-50 rounded-full" />
    </div>
  );
}