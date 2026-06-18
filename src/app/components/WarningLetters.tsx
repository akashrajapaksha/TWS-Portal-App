import { useState, useEffect, useMemo } from 'react';
import { 
  Send, FileCheck, RefreshCw, X, 
  Trash2, Edit3, CheckCircle, Search, RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert
} from 'lucide-react';

const DISCIPLINARY_CONFIG = {
  "Performance": ["Failure to meet individual KPI's", "Failure to meet team KPI's"],
  "Disciplinary": ["Verbal Harassment", "Physical Harassment", "Sexual Harassment", "Alcohol / drugs abuse", "Sleep during work hours", "Consuming food at workstation"],
  "SOP Violations / Poor quality of work": ["Non-compliance with the established protocol", "Breach of confidential information"],
  "Punctuality": ["Late Reporting", "Early Exits", "Break time violation", "Unauthorized Absence", "Failure to punch attendance"],
  "Termination": ["Gross Misconduct", "End of Probation", "Contractual Breach"]
};

export function WarningLetters() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [stats, setStats] = useState({ first: 0, second: 0, final: 0 });
  const [warnings, setWarnings] = useState<any[]>([]); 
  const [employeeName, setEmployeeName] = useState<string>('');
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // --- CUSTOM ALERT/CONFIRM STATES ---
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    type: 'warning' | 'danger' 
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const currentUser = useMemo(() => {
    const storedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
    const rawRole = (storedUser.role || localStorage.getItem('userRole') || 'Employees').trim().toUpperCase();
    const rawId = (storedUser.employee_id || localStorage.getItem('employeeId') || '').trim().toUpperCase();
    
    const managementRoles = ['SUPERVISORS', 'SUPER ADMIN', 'ADMIN', 'ER', 'TSP'];
    const adminRoles = ['SUPER ADMIN', 'ADMIN'];

    return {
      id: rawId,
      name: storedUser.name || localStorage.getItem('employeeName') || 'User',
      role: rawRole,
      isMgmt: managementRoles.includes(rawRole),
      isAdmin: adminRoles.includes(rawRole),
      isSuperAdmin: rawRole === 'SUPER ADMIN'
    };
  }, []);

  const [formData, setFormData] = useState({
    employee_id: '',
    reason: '',
    sub_reason: '',
    warning_date: new Date().toISOString().split('T')[0],
    explanation: '',
  });

  // --- DEBOUNCE REAL-TIME SEARCH TERM FOR BACKEND EFFICIENCY ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = async () => {
    if (!currentUser.id) return;
    setTableLoading(true);
    try {
      const headers = { 
        'x-user-role': currentUser.role, 
        'x-employee-id': currentUser.id 
      };

      // Construct dynamic API search query strings cleanly
      const listUrl = debouncedSearch 
        ? `https://ambassador-michigan-mandate-penalty.trycloudflare.com/api/warnings?searchId=${encodeURIComponent(debouncedSearch)}`
        : 'https://ambassador-michigan-mandate-penalty.trycloudflare.com/api/warnings';

      const [statsRes, listRes] = await Promise.all([
        fetch('https://ambassador-michigan-mandate-penalty.trycloudflare.com/api/warnings/stats', { headers }),
        fetch(listUrl, { headers })
      ]);
      
      const sResult = await statsRes.json();
      const lResult = await listRes.json();
      
      if (sResult.success) setStats({ first: sResult.first, second: sResult.second, final: sResult.final });
      if (lResult.success) setWarnings(lResult.data || []); // Bound cleanly to backend layout return key
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [currentUser.id, currentUser.role, debouncedSearch]);

  // --- LOOKUP EMPLOYEE REGISTRATION VIA BACKEND AUTOFILL ---
  useEffect(() => {
    const search = async () => {
      if (formData.employee_id.length > 2 && currentUser.isMgmt) {
        setIsSearchingName(true);
        try {
          const res = await fetch(`https://ambassador-michigan-mandate-penalty.trycloudflare.com/api/employees/search/${formData.employee_id.trim().toUpperCase()}`, {
            headers: { 'x-user-role': currentUser.role }
          });
          const data = await res.json();
          setEmployeeName(data.success ? data.name : 'Employee Not Found');
        } catch { 
          setEmployeeName('Error'); 
        } finally { 
          setIsSearchingName(false); 
        }
      } else { 
        setEmployeeName(''); 
      }
    };
    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [formData.employee_id, currentUser.isMgmt, currentUser.role]);

  const handleApprove = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve Warning',
      message: 'Are you sure you want to approve this warning record? This will finalize the disciplinary action.',
      type: 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch(`https://ambassador-michigan-mandate-penalty.trycloudflare.com/api/warnings/approve/${id}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-role': currentUser.role 
            },
            body: JSON.stringify({ admin_id: currentUser.id, admin_name: currentUser.name }),
          });
          const result = await res.json();
          if (result.success) {
            showToast("Warning record approved successfully.");
            fetchData();
          } else {
            showToast(result.message, 'error');
          }
        } catch (err) { 
          showToast("Approval failed", 'error'); 
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeName === 'Employee Not Found' || !employeeName) {
      showToast("Cannot process: Valid Employee reference required", "error");
      return;
    }
    setLoading(true);
    try {
      const url = isEditing 
        ? `https://ambassador-michigan-mandate-penalty.trycloudflare.com/api/warnings/${isEditing}` 
        : 'https://ambassador-michigan-mandate-penalty.trycloudflare.com/api/warnings';
      
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': currentUser.role },
        body: JSON.stringify({ 
          ...formData, 
          employee_id: formData.employee_id.trim().toUpperCase(),
          admin_id: currentUser.id, 
          admin_name: currentUser.name 
        }),
      });

      const responseData = await res.json();
      if (responseData.success) {
        setIsModalOpen(false);
        setIsEditing(null);
        fetchData();
        showToast(isEditing ? "Record updated successfully" : "New entry confirmed");
        setFormData({ employee_id: '', reason: '', sub_reason: '', warning_date: new Date().toISOString().split('T')[0], explanation: '' });
        setEmployeeName('');
      } else {
        showToast(responseData.message || "Action Failed", 'error');
      }
    } catch (err) { 
      showToast("Action Failed", 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Record',
      message: 'Permanently delete this warning record? This action is irreversible.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`https://ambassador-michigan-mandate-penalty.trycloudflare.com/api/warnings/${id}`, {
            method: 'DELETE',
            headers: { 
              'x-user-role': currentUser.role, 
              'x-employee-id': currentUser.id 
            }
          });
          if ((await res.json()).success) {
            showToast("Record deleted successfully.");
            fetchData();
          }
        } catch (err) { 
          showToast("Delete failed", 'error'); 
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const openEditModal = (warning: any) => {
    setIsEditing(warning.id);
    setFormData({
      employee_id: warning.employee_id,
      reason: warning.reason,
      sub_reason: warning.sub_reason || '',
      warning_date: warning.warning_date,
      explanation: warning.explanation || '',
    });
    setEmployeeName(warning.issued_by || 'Verified');
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 bg-gray-50 p-8 min-h-screen font-sans text-gray-900">
      
      {/* --- CUSTOM TOAST NOTIFICATION --- */}
      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
            notification.type === 'success' ? 'bg-white border-emerald-100 text-emerald-600' : 'bg-white border-red-100 text-red-600'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              confirmModal.type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
            }`}>
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase italic text-center">{confirmModal.title}</h3>
            <p className="text-gray-400 text-[10px] font-bold mt-2 uppercase tracking-tight text-center leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                className="flex-1 py-3 text-xs font-black uppercase text-gray-400 hover:bg-gray-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm} 
                className={`flex-1 py-3 text-xs font-black uppercase text-white rounded-xl shadow-lg transition-all active:scale-95 ${
                  confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Warning Records</h1>
          <p className="text-gray-500 font-medium italic">
            {currentUser.isMgmt ? "Management Portal" : "Personal Record"} — 
            <span className="text-red-600 font-bold ml-1">{currentUser.role}</span>
          </p>
        </div>
        
        {currentUser.isMgmt && (
          <button 
            onClick={() => { setIsEditing(null); setFormData({ employee_id: '', reason: '', sub_reason: '', warning_date: new Date().toISOString().split('T')[0], explanation: '' }); setEmployeeName(''); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg transition-transform active:scale-95"
          >
            <Send className="w-5 h-5" /> 
            {currentUser.role === 'ER' ? 'New Request' : 'New Manual Entry'}
          </button>
        )}
      </div>

      {/* --- STATISTICS CARDS DISPLAY PANEL --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 shadow-sm flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-blue-50 text-blue-600"><FileCheck className="w-6 h-6" /></div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">First Written Warning</div>
            <div className="text-2xl font-black text-gray-900">{stats.first} <span className="text-xs font-normal text-gray-400 italic">cases</span></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 shadow-sm flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-500"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Second Warning Track</div>
            <div className="text-2xl font-black text-gray-900">{stats.second} <span className="text-xs font-normal text-gray-400 italic">cases</span></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 shadow-sm flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-red-50 text-red-500"><ShieldAlert className="w-6 h-6" /></div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Final Escalation Limit</div>
            <div className="text-2xl font-black text-gray-900">{stats.final} <span className="text-xs font-normal text-gray-400 italic">cases</span></div>
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-3xl border-2 border-gray-100 shadow-sm flex gap-4 mb-8 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="FILTER BY EMPLOYEE ID OR VIOLATION TYPE (BACKEND INTEGRATED)..."
            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl py-3 pl-12 pr-4 outline-none font-bold text-xs tracking-widest text-gray-500 placeholder:text-gray-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setSearchTerm('')}
          className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors"
          title="Reset Filters"
        >
          <RotateCcw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[2rem] border-2 border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {currentUser.isMgmt && <th className="px-6 py-4">Employee Reference</th>}
                <th className="px-6 py-4">Incident Details</th>
                <th className="px-6 py-4">Current Status</th>
                <th className="px-6 py-4">Date</th>
                {currentUser.isMgmt && <th className="px-6 py-4 text-right">Control</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tableLoading ? (
                <tr>
                  <td colSpan={currentUser.isMgmt ? 5 : 3} className="text-center py-10 text-xs font-bold uppercase tracking-widest text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" /> Updating records...
                  </td>
                </tr>
              ) : warnings.length === 0 ? (
                <tr>
                  <td colSpan={currentUser.isMgmt ? 5 : 3} className="text-center py-10 text-xs font-bold uppercase tracking-widest text-gray-400">
                    No incident logs found matching criteria.
                  </td>
                </tr>
              ) : (
                warnings.map((w) => (
                  <tr key={w.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                    {currentUser.isMgmt && (
                      <td className="px-6 py-4">
                         <div className="font-black text-red-600 text-xs">{w.employee_id}</div>
                         <div className="font-black text-gray-900 uppercase tracking-tight text-[11px]">{w.issued_by || 'Staff Member'}</div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-700 uppercase text-xs">{w.reason}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold">{w.sub_reason}</div>
                      {w.explanation && <p className="text-gray-400 text-[11px] font-medium tracking-tight mt-0.5 normal-case line-clamp-1">{w.explanation}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        w.status?.toUpperCase() === 'APPROVED' ? 'bg-green-50 text-green-500 border border-green-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                      }`}>
                        {w.status?.toUpperCase() === 'APPROVED' ? 'WARNING ISSUED' : w.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-bold italic text-xs">
                      {w.warning_date ? new Date(w.warning_date).toISOString().split('T')[0] : 'N/A'}
                    </td>
                    
                    {currentUser.isMgmt && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          {currentUser.isSuperAdmin && w.status?.toUpperCase() === 'PENDING' && (
                            <button 
                              onClick={() => handleApprove(w.id)}
                              className="p-2 text-green-600 hover:scale-110 transition-transform"
                              title="Approve Record"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button onClick={() => openEditModal(w)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {currentUser.isAdmin && (
                            <button onClick={() => handleDelete(w.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-black italic uppercase text-gray-900">
                {isEditing ? "Edit Record" : "New Incident Entry"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6 text-gray-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  required
                  disabled={!!isEditing}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 uppercase font-bold outline-none disabled:opacity-50 text-xs tracking-widest"
                  placeholder="Employee ID (e.g. PCB-104)"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                />
                <div className={`flex items-center px-4 rounded-2xl border text-xs font-black uppercase tracking-wider ${
                  employeeName === 'Employee Not Found' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-gray-50 text-gray-500'
                }`}>
                  {isSearchingName ? 'Searching Profile...' : (employeeName || 'Verification')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select 
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none font-bold text-sm"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value, sub_reason: ''})}
                >
                  <option value="">Category</option>
                  {Object.keys(DISCIPLINARY_CONFIG).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select 
                  required
                  disabled={!formData.reason}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none font-bold text-sm"
                  value={formData.sub_reason}
                  onChange={(e) => setFormData({...formData, sub_reason: e.target.value})}
                >
                  <option value="">Specific Issue</option>
                  {formData.reason && (DISCIPLINARY_CONFIG as any)[formData.reason].map((sub: string) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <textarea 
                required
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none font-medium text-sm"
                placeholder="Incident execution explanation details..."
                value={formData.explanation}
                onChange={(e) => setFormData({...formData, explanation: e.target.value})}
              />

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-[0.98] disabled:opacity-50 text-xs"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isEditing ? "Update Record" : "Confirm Entry"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}