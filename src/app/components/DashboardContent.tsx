import { useState, useEffect, useCallback } from 'react';
import { 
  Package, TriangleAlert, Activity, Calendar, Zap, Crown, Clock
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
// ✅ ADDED: Define server base path to resolve profile image URL addresses correctly
const SERVER_BASE_URL = 'http://localhost:5000';

interface LeaveRecord {
  id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  project: string;
}

interface TopPerformer {
  name: string;
  project: string;
  profilePhoto: string;
  ordersCount: number;
  date: string;
  shift: string;
  isHistorical: boolean;
}

interface DashboardContentProps {
  employeeName?: string;
  employeeId?: string; 
  userRole?: string; 
}

export function DashboardContent({ 
  employeeName: authName = "User", 
  employeeId: authId = "",
  userRole = 'Employees' 
}: DashboardContentProps) {
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalMistakes: 0,
    totalMyrLoss: 0,
    upcomingLeaves: [] as LeaveRecord[],
    currentShift: 'MORNING',
    topPerformer: null as TopPerformer | null
  });
  
  const [loading, setLoading] = useState(true);
  const [lankaTimeStr, setLankaTimeStr] = useState('');

  // ✅ ADDED: Image URL string parsing path normalizer helper function
  const getProfileImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return '';
    // If the path is already a fully qualified HTTP URL link reference directly, return it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Clean trailing or leading slashes and append local backend static uploads pathway context
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `${SERVER_BASE_URL}/${cleanPath}`;
  };

  // Real-time clock synchronization engine formatted to Asia/Colombo
  useEffect(() => {
    const updateClock = () => {
      const options = {
        timeZone: 'Asia/Colombo',
        hour: '2-digit' as const,
        minute: '2-digit' as const,
        second: '2-digit' as const,
        hour12: true
      };
      setLankaTimeStr(new Date().toLocaleTimeString('en-US', options));
    };

    updateClock();
    const intervalId = setInterval(updateClock, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchDashboardData = useCallback(async (empId: string) => {
    if (!empId) return;
    setLoading(true);
    try {
      const role = userRole.toUpperCase().trim();
      const response = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
        params: { employeeId: String(empId).trim(), userRole: role },
        withCredentials: true 
      });
      
      const { data } = response;
      setStats({
        totalOrders: Number(data.totalOrders) || 0,
        totalMistakes: Number(data.totalMistakes) || 0,
        totalMyrLoss: Number(data.totalMyrLoss) || 0,
        upcomingLeaves: data.upcomingLeaves || [],
        currentShift: data.currentShift || 'MORNING',
        topPerformer: data.topPerformer || null
      });
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (authId) fetchDashboardData(authId);
  }, [authId, fetchDashboardData]);

  // Helper utility variant selector for shifting badge UI colors dynamically
  const getShiftBadgeStyles = (shift: string) => {
    const cleanShift = shift.toUpperCase().trim();
    if (cleanShift === 'AFTERNOON') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (cleanShift === 'NIGHT') {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'; // Fallback / Morning Shift
  };

  return (
    <div className="flex-1 bg-[#F9FBFF] min-h-screen font-sans pb-10">
      
      {/* --- 1. NAVIGATION (CLOCK AND DYNAMIC SHIFT CONTEXT) --- */}
      <nav className="bg-white border-b border-slate-100 px-8 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-sm">
            <Clock size={13} className="text-blue-400 animate-pulse" />
            <span className="text-[11px] font-black tracking-tight tabular-nums w-[75px]">
              {lankaTimeStr || '00:00:00 AM'}
            </span>
            <span className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded ml-1 uppercase">SL</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-6">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Shift:</span>
            <span className={`text-[10px] font-black border px-2.5 py-1 rounded-lg uppercase tracking-tight transition-colors duration-350 ${getShiftBadgeStyles(stats.currentShift)}`}>
              {stats.currentShift} Shift
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Zap size={14} className="text-blue-600 fill-blue-600" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">System Dashboard</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8 space-y-6">
        
        {/* --- 2. HEADER --- */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-md">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">System Live</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              {authName}
            </h1>
          </div>
        </header>

        {/* --- 3. TILES GRID --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <MetricTile title="Orders Done" value={stats.totalOrders} color="blue" loading={loading} icon={<Package size={16} />} />
          
          {/* Mistakes Card */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Mistakes</h3>
                <TriangleAlert size={16} className="text-rose-500" />
              </div>
              <div className="text-5xl font-black text-rose-600 italic tracking-tighter leading-none mb-3">
                {loading ? '...' : stats.totalMistakes}
              </div>
            </div>
            <div className="text-xl font-black text-slate-400 uppercase tracking-tighter border-t border-slate-50 pt-2">
              RM {stats.totalMyrLoss.toFixed(2)} <span className="text-[10px] text-slate-300 ml-1">Impact</span>
            </div>
          </div>

          {/* DYNAMIC TOP PERFORMER TILE WITH HISTORICAL NOTATIONS */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
            {stats.topPerformer?.isHistorical && (
              <div className="absolute top-0 right-0 left-0 bg-amber-500/10 text-amber-700 text-[8px] font-black uppercase text-center py-1 tracking-wider border-b border-amber-500/20">
                Last Recorded Performance
              </div>
            )}
            
            <div className={`flex items-center justify-between mb-2 ${stats.topPerformer?.isHistorical ? 'mt-4' : ''}`}>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Top Performer</h3>
              <Crown size={16} className="text-amber-500 fill-amber-500" />
            </div>

            {loading ? (
              <div className="text-xl font-black text-slate-400 italic">...</div>
            ) : stats.topPerformer && stats.topPerformer.name !== "N/A" ? (
              <div className="my-1 flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center">
                    {/* ✅ FIXED: Wrapped profilePhoto source parameter with getProfileImageUrl() modifier engine */}
                    {stats.topPerformer.profilePhoto ? (
                      <img 
                        src={getProfileImageUrl(stats.topPerformer.profilePhoto)} 
                        alt={stats.topPerformer.name} 
                        className="h-full w-full object-cover" 
                        onError={(e) => {
                          // Fallback to text initials if rendering encounters a system execution crash
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xs font-black text-slate-400 uppercase">{stats.topPerformer.name.slice(0, 2)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-md font-black text-slate-900 uppercase truncate tracking-tight">{stats.topPerformer.name}</h4>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider truncate">{stats.topPerformer.project}</p>
                  </div>
                </div>
                
                {/* Historical Date Footnote Labels */}
                <div className="text-[8px] font-bold text-slate-400 uppercase mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100 flex justify-between">
                  <span>Shift: {stats.topPerformer.shift}</span>
                  <span>{stats.topPerformer.date}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs font-black text-slate-300 uppercase tracking-widest my-3">No Active Staff</div>
            )}

            <div className="text-xl font-black text-slate-400 uppercase tracking-tighter border-t border-slate-50 pt-2">
              {loading ? '...' : (stats.topPerformer?.ordersCount || 0)} <span className="text-[10px] text-slate-300 ml-1">Orders</span>
            </div>
          </div>

        </section>

        {/* --- 4. LEAVES TABLE --- */}
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
                  <th className="pb-5 px-4 text-center">Project</th>
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
                      <td className="py-5 px-4 text-center">
                        <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-[10px] font-black uppercase">
                          {leave.project || 'General'}
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
                    <td colSpan={3} className="py-20 text-center">
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

interface MetricTileProps {
  title: string;
  value: number;
  color?: string;
  loading: boolean;
  icon?: React.ReactNode;
}

function MetricTile({ title, value, loading, icon }: MetricTileProps) {
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</h3>
          {icon && <div className="text-slate-400">{icon}</div>}
        </div>
        <div className="text-5xl font-black text-blue-600 italic tracking-tighter leading-none mb-3">
          {loading ? '...' : value}
        </div>
      </div>
      <div className="h-1 w-10 bg-slate-100 rounded-full" />
    </div>
  );
}