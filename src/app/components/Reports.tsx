import { useState, useEffect } from 'react';
import { 
  UserSearch, 
  TrendingUp, 
  Receipt, 
  TriangleAlert, 
  ChartBar, 
  RotateCcw,
  Banknote,
  Wallet,
  ShieldCheck,
  Search
} from 'lucide-react';

interface PerformanceReport {
  employeeName: string;
  orderRecords: any[];
  mistakeRecords: any[];
  financialMistakes: any[];
  stats: {
    totalOrders: number;
    totalMistakes: number;
    totalMyrLoss: number;
    overallPerformance: number;
  };
}

export function Reports() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  
  const [searchId, setSearchId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // User context from local storage
  const savedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
  const userRole = savedUser.role || '';
  const loggedInEmployeeId = savedUser.employee_id || '';
  const isEmployee = userRole === 'Employees';

  // Automatically fetch if user is an Employee
  useEffect(() => {
    if (isEmployee) {
      fetchPerformanceData();
    }
  }, []);

  const fetchPerformanceData = async () => {
    // If admin/other, they must enter a search ID. If employee, it uses their logged-in ID.
    if (!isEmployee && !searchId) {
      alert("Please enter an Employee ID to search.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        userRole, 
        loggedInEmployeeId, 
        searchId: isEmployee ? loggedInEmployeeId : searchId, 
        fromDate, 
        toDate 
      });

      const res = await fetch(`http://localhost:5000/api/reports/performance?${params}`);
      const data = await res.json();
      if (data.success) {
        setReport(data);
      }
    } catch (error) {
      console.error("Failed to fetch performance:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 h-screen overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ChartBar className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Performance Audit</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              {isEmployee ? 'Personal Dashboard' : 'Management Overview'}
            </p>
          </div>
        </div>
        {isEmployee && (
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase">{loggedInEmployeeId}</span>
          </div>
        )}
      </div>

      {/* Filter Bar - Visibility depends on Role */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          {/* Search ID: Hidden or Read-only for Employees */}
          <div className="relative">
            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block ml-1">Target Employee</label>
            <div className="relative">
              <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder={isEmployee ? loggedInEmployeeId : "Search ID..."} 
                disabled={isEmployee}
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  isEmployee 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-none' 
                  : 'bg-gray-50 border-none focus:ring-2 focus:ring-blue-500'
                }`}
                value={isEmployee ? '' : searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block ml-1">From Date</label>
            <input type="date" className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-sm font-medium" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block ml-1">To Date</label>
            <input type="date" className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-sm font-medium" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={fetchPerformanceData} 
              className="flex-1 bg-blue-600 text-white font-black py-2.5 rounded-xl hover:bg-blue-700 text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-100 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : <><Search className="w-4 h-4"/> Analyze</>}
            </button>
            <button 
              onClick={() => {setSearchId(''); setReport(null); setFromDate(''); setToDate('');}} 
              className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {report ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
          
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-400 font-bold text-[10px] uppercase mb-1 tracking-tighter">Total Orders Procured</p>
              <h2 className="text-2xl font-black text-gray-900">{report.stats.totalOrders}</h2>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-400 font-bold text-[10px] uppercase mb-1 tracking-tighter">Mistake Incidence</p>
              <h2 className="text-2xl font-black text-red-500">{report.stats.totalMistakes}</h2>
            </div>
            
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-red-400 font-bold text-[10px] uppercase mb-1 tracking-tighter">Financial Impact</p>
                <Banknote className="w-4 h-4 text-red-400" />
              </div>
              <h2 className="text-2xl font-black text-red-600">RM {report.stats.totalMyrLoss.toFixed(2)}</h2>
            </div>

            <div className="bg-gray-900 p-4 rounded-2xl shadow-xl text-white relative overflow-hidden group">
              <div className="relative z-10">
                <p className="font-bold text-[10px] uppercase mb-1 opacity-60 tracking-widest">Efficiency Score</p>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black">{report.stats.overallPerformance}</h2>
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 bg-blue-600/20 w-16 h-16 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
            </div>
          </div>

          {/* TABLE 1: Financial Mistakes */}
          {report.financialMistakes?.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-sm">
              <div className="p-3 px-5 border-b flex items-center gap-2 bg-red-50/30">
                <Wallet className="w-4 h-4 text-red-600" />
                <h3 className="font-black text-red-800 text-[10px] uppercase tracking-widest">Financial Loss Log</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/50 text-[9px] font-bold text-gray-400 uppercase border-b">
                    <tr>
                      <th className="px-5 py-2">Incident Date</th>
                      <th className="px-5 py-2">Mistake Type</th>
                      <th className="px-5 py-2 text-right">Penalty (MYR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {report.financialMistakes.map((m, i) => (
                      <tr key={i} className="hover:bg-red-50/10 transition-colors">
                        <td className="px-5 py-2 text-gray-500 font-medium">{m.date}</td>
                        <td className="px-5 py-2 font-bold text-red-700">{m.mistake_type}</td>
                        <td className="px-5 py-2 font-black text-right text-red-600">RM {Number(m.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* TABLE 2: Orders */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-3 px-5 border-b flex items-center gap-2 bg-gray-50/50">
                <Receipt className="w-4 h-4 text-blue-600" />
                <h3 className="font-black text-gray-800 text-[10px] uppercase tracking-widest">Completed Orders</h3>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/50 text-[9px] font-bold text-gray-400 uppercase border-b">
                  <tr>
                    <th className="px-5 py-2">Date</th>
                    <th className="px-5 py-2 text-right">Order Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.orderRecords.map((r, i) => (
                    <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-5 py-2 text-gray-500 font-medium">{r.date}</td>
                      <td className="px-5 py-2 font-black text-right text-blue-600">{r.order_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TABLE 3: General Mistakes */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-3 px-5 border-b flex items-center gap-2 bg-gray-50/50">
                <TriangleAlert className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-gray-800 text-[10px] uppercase tracking-widest">Quality Incidents</h3>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/50 text-[9px] font-bold text-gray-400 uppercase border-b">
                  <tr>
                    <th className="px-5 py-2">Date</th>
                    <th className="px-5 py-2">Category</th>
                    <th className="px-5 py-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.mistakeRecords.map((r, i) => (
                    <tr key={i} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-5 py-2 text-gray-500 font-medium">{r.date}</td>
                      <td className="px-5 py-2 font-bold text-gray-700">{r.mistake_type}</td>
                      <td className="px-5 py-2 font-black text-right text-amber-600">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-3xl">
          <ChartBar className="w-12 h-12 mb-2 opacity-20" />
          <p className="font-bold text-sm">Enter parameters and click Analyze to view results</p>
        </div>
      )}
    </div>
  );
}