import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Search, User, Briefcase, DollarSign, Loader2, Calendar, Target, ShieldAlert, Lock, Clock } from 'lucide-react';

interface BonusCalculationProps {
  employeeDesignation?: string; // Links directly to userData.role
  currentEmployeeId?: string;    // Links directly to userData.employee_id
}

interface DailyBreakdownItem {
  date: string;
  orders: number;
  mistakes: number;
  net: number;
  status: 'Active' | 'Excluded';
  shiftType: string; // 'Morning' | 'Noon' | 'Night'
}

interface NextTierInfo {
  nextThreshold: number;
  gapToNext: number;
  potentialBonus: number;
}

interface ShiftMetricsSummary {
  activeDays: number;
  calculatedBonus: number;
  metrics: {
    totalOrders: number;
    totalMistakes: number;
    totalNet: number;
    nextTierInfo: NextTierInfo | null;
  };
}

interface BonusResult {
  employeeId: string;
  employeeName: string;
  project: string;
  shifts: {
    morning: ShiftMetricsSummary;
    noon: ShiftMetricsSummary;
    night: ShiftMetricsSummary;
  };
  dailyBreakdown: DailyBreakdownItem[];
}

type AllowedShiftTabs = 'morning' | 'noon' | 'night';

export default function BonusCalculation({ 
  employeeDesignation = "Employees", 
  currentEmployeeId = "" 
}: BonusCalculationProps) {

  // --- PRIVILEGE VERIFICATION MECHANISM ---
  const userRole = (employeeDesignation || '').trim();
  
  // Included 'TPS' into management scope for global operational overrides
  const isManagement = [
    'Super Admin', 'Admin', 'Supervisors', 'ER', 'TPS', 'LD'
  ].includes(userRole);

  const [formData, setFormData] = useState({
    employeeId: isManagement ? '' : (currentEmployeeId || '').trim().toUpperCase(),
    employeeName: '',
    project: '',
    startDate: '2026-06-01',
    endDate: '2026-06-02',
  });

  const [activeShiftTab, setActiveShiftTab] = useState<AllowedShiftTabs>('morning');
  const [result, setResult] = useState<BonusResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingEmp, setFetchingEmp] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Structural sync hook for non-management visibility loops
  useEffect(() => {
    if (!isManagement && currentEmployeeId) {
      setFormData(prev => ({ ...prev, employeeId: currentEmployeeId.trim().toUpperCase() }));
    }
  }, [currentEmployeeId, isManagement]);

  const getUserAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'x-user-role': userRole,
      'x-employee-id': (currentEmployeeId || '').trim().toUpperCase()
    };
  };

  // Debounced identity checker for administrative processing
  useEffect(() => {
    if (!formData.employeeId.trim()) {
      setFormData(prev => ({ ...prev, employeeName: '', project: '' }));
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setFetchingEmp(true);
      setError('');
      try {
        const response = await fetch(
          `http://localhost:5000/api/bonus/public-search/${formData.employeeId.trim()}`,
          {
            method: 'GET',
            headers: getUserAuthHeaders()
          }
        );
        const data = await response.json();

        if (response.ok && data.success) {
          setFormData(prev => ({
            ...prev,
            employeeName: data.name,
            project: data.project
          }));
        } else {
          setFormData(prev => ({ ...prev, employeeName: '', project: '' }));
          setError(data.message || data.error || 'No employee record verified for this ID.');
        }
      } catch (err) {
        console.error("Identity matching trace fault:", err);
        setError('System validation link error.');
      } finally {
        setFetchingEmp(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.employeeId, userRole, currentEmployeeId]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    // SECURITY WALL: Prevent changes if non-management updates ID parameter fields
    if (!isManagement && e.target.name === 'employeeId') return;
    
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleExecuteAnalysis = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    const baselinePayload = {
      ...formData,
      employeeId: isManagement ? formData.employeeId : (currentEmployeeId || '').trim().toUpperCase()
    };

    try {
      const response = await fetch('http://localhost:5000/api/bonus/analyze', {
        method: 'POST',
        headers: getUserAuthHeaders(),
        body: JSON.stringify(baselinePayload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis configuration rejected.');
      setResult(data.summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred generating evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const currentViewMetrics = result?.shifts[activeShiftTab] || {
    activeDays: 0,
    calculatedBonus: 0,
    metrics: { totalOrders: 0, totalMistakes: 0, totalNet: 0, nextTierInfo: null }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 md:p-8 space-y-6 font-sans">
      
      {/* Privilege Status Tracker Banner */}
      {!isManagement ? (
        <div className="w-full bg-indigo-50 border border-indigo-100/70 p-4 rounded-2xl flex items-center gap-2 text-indigo-700 text-xs font-semibold">
          <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>Secure Mode: Access scope restricted exclusively to your logged employee identity (ID: {currentEmployeeId}).</span>
        </div>
      ) : (
        <div className="w-full bg-emerald-50 border border-emerald-100/70 p-4 rounded-2xl flex items-center gap-2 text-emerald-700 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Administrative Control Panel: System-wide search and operational override mode activated for role type: {userRole}.</span>
        </div>
      )}

      {/* Primary Configuration Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <form onSubmit={handleExecuteAnalysis} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Employee ID Selector box */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Employee ID</label>
                <div className="relative flex items-center">
                  {fetchingEmp ? (
                    <Loader2 className="absolute left-4 w-4 h-4 text-slate-400 animate-spin" />
                  ) : !isManagement ? (
                    <Lock className="absolute left-4 w-4 h-4 text-indigo-500 pointer-events-none" />
                  ) : (
                    <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
                  )}
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    placeholder="Ex: 1024"
                    disabled={!isManagement}
                    className={`w-full font-semibold py-3 pl-11 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-black/5 transition text-sm ${
                      !isManagement 
                        ? 'bg-indigo-50/30 border border-indigo-100/40 text-indigo-600 font-bold cursor-not-allowed' 
                        : 'bg-[#f4f6f9] text-slate-700'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Verified Identity Readout */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Employee Name</label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.employeeName}
                    placeholder={fetchingEmp ? "Verifying records..." : "Employee name"}
                    className="w-full bg-[#f4f6f9]/60 text-slate-500 font-semibold py-3 pl-11 pr-4 rounded-xl outline-none text-sm cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>

              {/* Assignment Allocation Readout */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Project Name</label>
                <div className="relative flex items-center">
                  <Briefcase className="absolute left-4 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.project}
                    placeholder={fetchingEmp ? "Loading alignment..." : "Assigned project"}
                    className="w-full bg-[#f4f6f9]/60 text-slate-500 font-semibold py-3 pl-11 pr-4 rounded-xl outline-none text-sm cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>

              {/* Range Filters */}
              <div className="flex flex-col space-y-1.5 sm:col-span-1 md:col-span-1">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full bg-[#f4f6f9] text-slate-700 font-semibold py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-black/5 transition text-sm cursor-pointer"
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5 sm:col-span-1 md:col-span-2">
                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full bg-[#f4f6f9] text-slate-700 font-semibold py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-black/5 transition text-sm cursor-pointer"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || fetchingEmp || !formData.employeeName}
              className="w-full bg-black hover:bg-zinc-900 text-white font-bold tracking-[0.15em] text-xs py-3.5 rounded-xl uppercase transition-all duration-200 disabled:bg-zinc-200 disabled:text-slate-400 disabled:cursor-not-allowed mt-2 shadow-sm"
            >
              {loading ? 'Evaluating Parameters...' : 'Execute Bonus Analysis'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Summary Presentation Display */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col justify-center items-center min-h-[260px]">
          {result ? (
            <div className="w-full h-full flex flex-col justify-between space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{result.employeeName}</h4>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Allocation: {result.project}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shift Volume</p>
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1 justify-end mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {currentViewMetrics.activeDays} Days
                  </p>
                </div>
              </div>

              {/* Score parameter boxes */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#f4f6f9] p-2.5 rounded-xl text-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Orders</span>
                  <span className="text-xs font-bold text-slate-700 block mt-0.5">{currentViewMetrics.metrics.totalOrders}</span>
                </div>
                <div className="bg-[#f4f6f9] p-2.5 rounded-xl text-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Mistakes</span>
                  <span className="text-xs font-bold text-red-500 block mt-0.5">{currentViewMetrics.metrics.totalMistakes}</span>
                </div>
                <div className="bg-[#f4f6f9] p-2.5 rounded-xl text-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Net Score</span>
                  <span className="text-xs font-bold text-indigo-600 block mt-0.5">{currentViewMetrics.metrics.totalNet}</span>
                </div>
              </div>

              {/* Milestone Tracker Notification */}
              {currentViewMetrics.metrics.nextTierInfo && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> Next Milestone:
                  </span>
                  <span>
                    Need <strong className="text-indigo-600 font-bold">{currentViewMetrics.metrics.nextTierInfo.gapToNext}</strong> net score to hit <strong className="text-slate-700 font-bold">${currentViewMetrics.metrics.nextTierInfo.potentialBonus}</strong>
                  </span>
                </div>
              )}

              {/* Bonus summary tracking container */}
              <div className="bg-emerald-50/60 border border-emerald-100/70 p-3.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="bg-emerald-500 text-white p-2 rounded-xl shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-wider block">Calculated Bonus</span>
                    <span className="text-xl font-black text-emerald-600 block">${currentViewMetrics.calculatedBonus}</span>
                  </div>
                </div>

                {/* Horizontal Shift Swapping Box */}
                <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200 shrink-0">
                  {(['morning', 'noon', 'night'] as AllowedShiftTabs[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveShiftTab(tab)}
                      className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-md transition-all duration-150 ${
                        activeShiftTab === tab
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <div className="w-12 h-12 bg-slate-50 border border-dashed border-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Target className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metrics Presentation</p>
              <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto text-center">
                {isManagement 
                  ? "Enter an authorized employee profile ID to populate summary data views."
                  : "Select targeted operational date windows to evaluate your active performance summary metrics."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Operational Logs Table */}
      <div className="w-full bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Operational Log Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Day-by-day itemization of tracked shift allocation logs.</p>
          </div>
          {result && (
            <div className="bg-indigo-50 text-indigo-600 font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg self-start sm:self-auto">
              Evaluation Rule: Orders - (Mistakes × 5)
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Shift Window</th>
                <th className="py-3 px-4 text-center">Order Count</th>
                <th className="py-3 px-4 text-center">Mistakes Incidence</th>
                <th className="py-3 px-4 text-right">Net Metric Score</th>
              </tr>
            </thead>
            <tbody>
              {result && result.dailyBreakdown.length > 0 ? (
                result.dailyBreakdown.map((day, idx) => (
                  <tr 
                    key={idx} 
                    className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors text-xs font-semibold ${
                      day.status === 'Excluded' ? 'opacity-50 bg-slate-50/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{day.date}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold border ${
                        day.status === 'Excluded'
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : day.shiftType === 'Night' ? 'bg-purple-50 text-purple-600 border-purple-100'
                          : day.shiftType === 'Noon' ? 'bg-amber-50 text-amber-600 border-amber-100'
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {day.status === 'Excluded' ? 'Excluded' : day.shiftType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-700">{day.orders}</td>
                    <td className="py-3.5 px-4 text-center text-red-500">{day.mistakes}</td>
                    <td className={`py-3.5 px-4 text-right font-bold ${day.net < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                      {day.status === 'Excluded' ? '-' : day.net}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-xs font-medium text-slate-400">
                    No timeline tracking data parsed to display.
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