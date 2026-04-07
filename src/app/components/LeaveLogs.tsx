import { useState, useEffect } from 'react';
import { Loader2, Search, FileText, Calendar, User, ClipboardList } from 'lucide-react';

interface LeaveLog {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  status: string;
  apply_date: string;
  reason: string;
}

export function LeaveLogs() {
  const [logs, setLogs] = useState<LeaveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // LocalStorage එකෙන් User විස්තර ලබා ගැනීම (Role එක පරීක්ෂා කිරීමට)
  const storedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');

  useEffect(() => {
    const fetchAllLogs = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/leave-logs/all-logs', {
          headers: {
            'x-user-role': storedUser.role || ''
          }
        });
        const data = await response.json();
        
        if (data.success) {
          setLogs(data.logs);
        } else {
          console.error(data.message);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (storedUser.role) {
      fetchAllLogs();
    }
  }, [storedUser.role]);

  // Search Logic (නම හෝ ID එක අනුව සෙවීම)
  const filteredLogs = logs.filter(log => 
    log.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
      <p className="font-black italic text-gray-400 uppercase tracking-widest">Loading Master Logs...</p>
    </div>
  );

  return (
    <div className="flex-1 bg-gray-50 min-h-screen font-sans">
      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-gray-100 px-10 py-5 flex justify-between items-center">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <span>Admin</span>
          <span className="text-gray-200">/</span>
          <span className="text-blue-600">Leave Master Logs</span>
        </div>
        <div className="text-[10px] font-black text-gray-300 uppercase italic">
          Total Records: {logs.length}
        </div>
      </div>

      <div className="p-10 mx-auto">
        {/* Page Title & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-gray-900 uppercase flex items-center gap-3">
              <ClipboardList size={36} className="text-blue-600" />
              Leave Master Logs
            </h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Unified records from Annual, Casual, Medical & No Pay</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="SEARCH BY NAME OR ID..."
              className="w-full pl-12 pr-6 py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-xs focus:border-blue-600 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Leave Details</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Applied Date</th>
                  <th className="px-8 py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="font-black text-gray-900 uppercase tracking-tighter leading-tight">{log.employee_name}</div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{log.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`text-xs font-black uppercase tracking-tighter ${['Medical', 'No Pay'].includes(log.leave_type) ? 'text-red-500' : 'text-blue-600'}`}>
                        {log.leave_type} Leave
                      </div>
                      <div className="text-[10px] font-medium text-gray-400 line-clamp-1 max-w-[200px]">
                        {log.reason || 'No reason provided'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-xs font-black text-gray-700 italic">
                        <Calendar size={14} className="text-gray-300" />
                        {log.number_of_days} DAYS
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">
                        {log.start_date} - {log.end_date}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {new Date(log.apply_date).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <div className="py-20 text-center">
                <FileText size={48} className="mx-auto text-gray-100 mb-4" />
                <p className="text-gray-300 font-black italic uppercase tracking-widest">No matching leave records found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}