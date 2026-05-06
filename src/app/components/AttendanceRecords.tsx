import React, { useState, useEffect } from 'react';
import { Search, Clock } from 'lucide-react';

interface AttendanceRecord {
  id: number;
  date: string;
  employee_id?: string;
  employee_name?: string;
  shift_name: string; 
  check_in_time: string;
  check_out_time: string;
  status: string;
}

interface AttendanceProps {
  userRole: string;
  employeeId?: string;
}

export function AttendanceRecords({ userRole, employeeId }: AttendanceProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); 
  
  // Normalized role check
  const isSuperAdmin = userRole.toUpperCase() === 'SUPER ADMIN';

  /**
   * Helper to map database shift codes to readable names
   */
  const getShiftLabel = (code: string | null | undefined) => {
    if (!code || code === 'N/A') return 'N/A';
    
    const mapping: Record<string, string> = {
      'A': 'Morning',
      'B': 'Afternoon',
      'C': 'Night',
      'RD': 'Off Day'
    };

    return mapping[code.toUpperCase()] || code;
  };

  useEffect(() => {
    fetchAttendance();
  }, [employeeId, userRole]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const url = isSuperAdmin 
        ? 'http://localhost:5000/api/attendance?auth=SUPER ADMIN' 
        : `http://localhost:5000/api/attendance?auth=EMPLOYEES&employee_id=${employeeId}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setRecords(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    if (!isSuperAdmin) return true;
    return (
      record.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            Attendance Records
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
            {isSuperAdmin ? "System-wide Monitoring" : "Personal Attendance Log"}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all w-full md:w-64"
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                {isSuperAdmin && (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  </>
                )}
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">In</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Out</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                 <tr>
                    <td colSpan={isSuperAdmin ? 7 : 5} className="px-6 py-20 text-center">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                 </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => (
                  <tr key={record.id || index} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 text-[11px] font-black text-slate-900 uppercase">
                      {record.date ? new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                    </td>
                    
                    {isSuperAdmin && (
                      <>
                        <td className="px-6 py-4 text-[11px] font-black text-indigo-500 uppercase tracking-tighter">
                          {record.employee_id}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-900 uppercase italic">
                            {record.employee_name || 'System User'}
                          </p>
                        </td>
                      </>
                    )}

                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-600 rounded uppercase tracking-tighter">
                        {getShiftLabel(record.shift_name)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">
                      {record.check_in_time || '--:--'}
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">
                      {record.check_out_time || '--:--'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        record.status === 'On Time' ? 'bg-emerald-50 text-emerald-600' :
                        record.status.includes('Late') ? 'bg-amber-50 text-amber-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 5} className="px-6 py-20 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No matching records</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}