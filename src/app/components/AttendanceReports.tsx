import React, { useState } from 'react';
import { Search, Loader2, FileText } from 'lucide-react';

interface AttendanceLogItem {
  id: number;
  employee_id: string;
  employee_name: string;
  timestamp: string;
  entry_type: 'CHECK-IN' | 'CHECK-OUT';
}

interface ProcessedLog {
  date: string;
  check_in_time: string;
  check_out_time: string;
  status: string;
}

export function AttendanceReports() {
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Normalized logs ready for table rendering
  const [logs, setLogs] = useState<ProcessedLog[]>([]);

  const handleGenerateReport = async () => {
    if (!query || !startDate || !endDate) {
      alert("Please provide Employee ID and the Date Range.");
      return;
    }

    setLoading(true);
    try {
      // --- STEP 1: TEST THE EMPLOYEE MASTER LOOKUP (NON-BLOCKING) ---
      console.log(`Searching master records for employee: ${query.trim()}`);
      const empRes = await fetch(`https://ambassador-michigan-mandate-penalty.trycloudflare.com/api/employees/public-search/${query.trim()}`);
      
      if (!empRes.ok) {
        const errorData = await empRes.json();
        console.warn("Step 1 Public Search warning:", errorData.message || "Not found in profile master table.");
        // We log it but do not throw an error here, so it continues to try and pull log history rows.
      } else {
        const empData = await empRes.json();
        console.log("Step 1 Success - Employee Profile Verified:", empData);
      }

      // --- STEP 2: FETCH THE ACTUAL ATTENDANCE LOGS ---
      console.log(`Fetching logs for ID ${query.trim()} from ${startDate} to ${endDate}`);
      const reportRes = await fetch(
        `https://ambassador-michigan-mandate-penalty.trycloudflare.com/api/attendance-reports/generate?employee_id=${query.trim()}&start_date=${startDate}&end_date=${endDate}`
      );
      
      if (!reportRes.ok) {
        const reportErr = await reportRes.json();
        throw new Error(reportErr.message || "Failed to fetch logs");
      }

      const result = await reportRes.json();
      console.log("Step 2 Success - Received Payload:", result);

      if (result.success && Array.isArray(result.data)) {
        processRawLogs(result.data);
        setHasGenerated(true);
      } else {
        throw new Error(result.message || "Failed parsing record streams from the server.");
      }

    } catch (error: any) {
      console.error("Caught Report Generation Error:", error);
      alert(error.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Processes the flat array of raw CHECK-IN / CHECK-OUT logs from the database
   * and maps them together by explicit day values for clean tabular display.
   */
  const processRawLogs = (rawItems: AttendanceLogItem[]) => {
    const dayMap: { [key: string]: { checkIn?: string; checkOut?: string } } = {};

    rawItems.forEach(item => {
      const dateObj = new Date(item.timestamp);
      // Clean string formatting layout: DD Month YYYY
      const dateKey = dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      const timeString = dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      if (!dayMap[dateKey]) dayMap[dateKey] = {};

      if (item.entry_type === 'CHECK-IN') {
        dayMap[dateKey].checkIn = timeString;
      } else if (item.entry_type === 'CHECK-OUT') {
        dayMap[dateKey].checkOut = timeString;
      }
    });

    // Structure raw metrics into UI presentation blocks
    const processedList: ProcessedLog[] = Object.keys(dayMap).map(dateStr => {
      const dayData = dayMap[dateStr];
      let rowStatus = 'Absent';

      if (dayData.checkIn && dayData.checkOut) {
        rowStatus = 'Completed';
      } else if (dayData.checkIn) {
        rowStatus = 'Check-in Only';
      } else if (dayData.checkOut) {
        rowStatus = 'Check-out Only';
      }

      return {
        date: dateStr,
        check_in_time: dayData.checkIn || '--:--',
        check_out_time: dayData.checkOut || '--:--',
        status: rowStatus
      };
    });

    setLogs(processedList);
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

      {/* Detailed Log Table View */}
      {hasGenerated && logs.length > 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
          <div className="px-4 py-4 border-b border-slate-50 mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Attendance Log Sheet</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Date</th>
                  <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Check In</th>
                  <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Check Out</th>
                  <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 text-xs font-bold text-slate-700">{log.date}</td>
                    <td className="py-4 text-xs font-bold text-slate-600">{log.check_in_time}</td>
                    <td className="py-4 text-xs font-bold text-slate-600">{log.check_out_time}</td>
                    <td className="py-4 text-xs text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                        ${log.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : ''}
                        ${log.status === 'Absent' ? 'bg-rose-50 text-rose-600' : ''}
                        ${log.status.includes('Only') ? 'bg-amber-50 text-amber-600' : ''}
                        ${log.status === 'N/A' ? 'bg-slate-100 text-slate-400' : ''}
                      `}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : hasGenerated && (
        <div className="mt-20 flex flex-col items-center justify-center text-slate-300">
          <FileText className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">No attendance logs found within this date range</p>
        </div>
      )}

      {!hasGenerated && !loading && (
        <div className="mt-20 flex flex-col items-center justify-center text-slate-300">
          <FileText className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Enter details above to see results</p>
        </div>
      )}
    </div>
  );
}