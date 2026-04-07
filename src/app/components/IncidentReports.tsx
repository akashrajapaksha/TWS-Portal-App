import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Save, Plus, Printer, Trash2,
  X, Loader2, Banknote, Search, RotateCcw, AlertTriangle, FileWarning, CheckCircle2
} from 'lucide-react';

const HIGH_SEVERITY_TYPES = ["DOUBLE PAY", "LOCK A BANK", "BREAK", "DOUBLE APPROVE SAME TICKET", "MONEY SHORT"];

interface Report {
  id: string;
  emp_no: string;
  full_name: string;
  nick_name?: string;
  initials?: string;
  incident_date: string;
  incident_details: string;
  mistake_count: number;
  amount?: number;
  status: 'pending' | 'created';
  position?: string;
  prevention?: string;
  description?: string;
}

export function IncidentReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingEmp, setIsFetchingEmp] = useState(false);
  const [searchId, setSearchId] = useState('');

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

  const savedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
  const userRole = savedUser.role || '';
  const loggedInEmployeeId = savedUser.employee_id || '';

  const isEmployee = userRole === 'Employees';
  const isAdmin = userRole === 'Admin';

  const [formData, setFormData] = useState({
    fullName: '', nickName: '', initials: '', empNo: '', position: '',
    details: '', dateIncident: new Date().toISOString().split('T')[0],
    description: '', prevention: '', amount: 0
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ir?userRole=${userRole}&loggedInEmployeeId=${loggedInEmployeeId}&searchId=${searchId}`);
      const result = await res.json();
      if (result.success) setReports(result.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userRole, loggedInEmployeeId, searchId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const checkIsCritical = (report: Report) => {
    const details = (report.incident_details || "").toUpperCase();
    const hasHighSeverity = HIGH_SEVERITY_TYPES.some(type => details.includes(type));
    return report.mistake_count >= 3 || hasHighSeverity;
  };

  const handlePromote = (report: Report) => {
    setConfirmModal({
      isOpen: true,
      title: 'Issue Official IR',
      message: `Convert this mistake log for ${report.full_name} into an official Incident Report?`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch('http://localhost:5000/api/ir/promote-from-mistake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mistake: report,
              adminId: loggedInEmployeeId,
              adminName: savedUser.name,
              userRole: userRole,
            }),
          });
          const data = await res.json();
          if (data.success) {
            showToast("✅ IR Issued Successfully!");
            fetchReports();
          } else {
            showToast(data.error || "Promotion failed.", 'error');
          }
        } catch (err) { showToast("❌ Server error during promotion.", 'error'); }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleEmpNoBlur = async () => {
    const targetId = formData.empNo.trim();
    if (!targetId) return;
    setIsFetchingEmp(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ir/fetch-by-id/${targetId}`);
      const result = await res.json();
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          fullName: result.name || '',
          initials: result.initials || '',
          position: result.position || prev.position
        }));
      } else {
        setFormData(prev => ({ ...prev, fullName: 'EMPLOYEE NOT FOUND', position: '' }));
      }
    } catch (error) { console.error("Auto-fetch failed:", error); } 
    finally { setIsFetchingEmp(false); }
  };

  const handlePrint = (report: Report) => {
    const dataForPrint = {
      fullName: report.full_name, nickName: report.nick_name || '',
      position: report.position || '', details: report.incident_details,
      date: report.incident_date, prevention: report.prevention || '',
      description: report.description || ''
    };
    localStorage.setItem("incidentData", JSON.stringify(dataForPrint));
    window.open("/OUTPUTFORM.html", "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fullName === 'EMPLOYEE NOT FOUND' || !formData.fullName) {
      return showToast("Please enter a valid Employee ID.", 'error');
    }
    try {
      const res = await fetch('http://localhost:5000/api/ir/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData, adminId: loggedInEmployeeId, adminName: savedUser.name, userRole: userRole
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchReports();
        showToast("✅ Incident Report Saved Successfully!");
        setFormData({
          fullName: '', nickName: '', initials: '', empNo: '', position: '',
          details: '', dateIncident: new Date().toISOString().split('T')[0],
          description: '', prevention: '', amount: 0
        });
      }
    } catch (err) { showToast("❌ Error saving IR.", 'error'); }
  };

  const handleDelete = (id: string, status: string) => {
    if (status === 'pending') return showToast("Cannot delete pending candidates.", 'error');
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Record',
      message: 'Are you sure you want to delete this IR record permanently? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/ir/${id}?userRole=${userRole}`, { method: 'DELETE' });
          const result = await res.json();
          if (result.success) {
            setReports(prev => prev.filter(r => r.id !== id));
            showToast("Record deleted successfully.");
          }
        } catch (err) { showToast("Delete failed.", 'error'); }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const renderImpact = (report: Report) => {
    const details = (report.incident_details || "").toUpperCase();
    const isMonetary = details.includes("MONEY SHORT") || details.includes("DOUBLE PAY");
    if (isMonetary) {
      return (
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">Financial Impact</span>
          <span className="px-2 py-1 rounded-lg font-black text-xs bg-red-50 text-red-700 flex items-center gap-1">
            <Banknote className="w-3 h-3" /> MYR {report.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">Frequency</span>
        <span className="text-xs font-bold text-gray-700">{report.mistake_count} Incident(s)</span>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 p-8 min-h-screen font-sans">
      
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

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600 rounded-2xl text-white shadow-lg shadow-red-100"><FileText className="w-6 h-6" /></div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Incident Management</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Formal Warning & Disciplinary Tracking</p>
          </div>
        </div>
        {!isEmployee && !isAdmin && (
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg shadow-blue-100 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> New Manual Entry
          </button>
        )}
      </div>

      {/* Filter Bar */}
      {!isEmployee && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="FILTER BY EMPLOYEE ID OR NAME..." 
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl font-bold text-sm uppercase focus:ring-2 focus:ring-blue-100 transition-all outline-none" 
              value={searchId} 
              onChange={(e) => setSearchId(e.target.value.toUpperCase())} 
            />
          </div>
          <button onClick={fetchReports} className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-black text-xs uppercase transition-colors">Apply Filters</button>
          <button onClick={() => { setSearchId(''); fetchReports(); }} className="p-3 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors"><RotateCcw className="w-5 h-5" /></button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Employee Reference</th>
                <th className="px-6 py-4">Incident Details</th>
                <th className="px-6 py-4 text-center">Severity/Count</th>
                <th className="px-6 py-4 text-center">Current Status</th>
                {!isAdmin && <th className="px-6 py-4 text-right">Control</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-red-500 opacity-20" /></td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">No records found</td></tr>
              ) : reports.map((report) => {
                const isCritical = checkIsCritical(report);
                return (
                  <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-red-600 font-mono tracking-tighter">{report.emp_no}</span>
                        <span className="text-sm font-black text-gray-900 uppercase truncate max-w-[180px]">{report.full_name}</span>
                        <span className="text-[9px] text-gray-400 font-black uppercase">{report.position}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-xs font-bold text-gray-600 line-clamp-2">{report.incident_details}</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase italic">{report.incident_date}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{renderImpact(report)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                        report.status === 'pending' 
                        ? (isCritical ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-amber-50 text-amber-600 border-amber-100') 
                        : 'bg-green-50 text-green-600 border-green-100'
                      }`}>
                        {report.status === 'pending' ? (isCritical ? 'Critical Limit' : 'Monitoring') : 'IR Issued'}
                      </span>
                    </td>
                    {!isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {report.status === 'pending' ? (
                            isCritical ? (
                              <button 
                                onClick={() => handlePromote(report)} 
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase hover:bg-red-700 transition-all shadow-md shadow-red-100 active:scale-95"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Issue IR
                              </button>
                            ) : (
                              <span className="text-[9px] font-black text-gray-400 uppercase italic px-4 py-2">Monitoring</span>
                            )
                          ) : (
                            <>
                              <button onClick={() => handlePrint(report)} title="Print IR" className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Printer className="w-4 h-4" /></button>
                              {!isEmployee && (
                                <button onClick={() => handleDelete(report.id, report.status)} title="Delete Record" className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl my-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><FileWarning className="w-5 h-5" /></div>
                <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">Issue Manual Report</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Employee Number</label>
                  <input type="text" required className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-sm transition-all outline-none" value={formData.empNo} onBlur={handleEmpNoBlur} onChange={(e) => setFormData({...formData, empNo: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Employee Initials</label>
                  <input type="text" className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-sm outline-none" value={formData.initials} onChange={(e) => setFormData({...formData, initials: e.target.value.toUpperCase()})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                <div className="relative">
                  <input type="text" required className={`w-full p-3.5 bg-gray-50 border-2 rounded-2xl font-bold text-sm outline-none transition-all ${formData.fullName === 'EMPLOYEE NOT FOUND' ? 'border-red-200 text-red-500' : 'border-transparent focus:border-blue-500'}`} value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
                  {isFetchingEmp && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nick Name</label>
                  <input type="text" className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-sm outline-none" value={formData.nickName} onChange={(e) => setFormData({...formData, nickName: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Position / Grade</label>
                  <input type="text" required className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-sm outline-none" value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nature of Incident</label>
                <textarea rows={2} required className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-sm outline-none resize-none" value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Incident Date</label>
                  <input type="date" required className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-sm outline-none" value={formData.dateIncident} onChange={(e) => setFormData({...formData, dateIncident: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Monetary Loss (If any)</label>
                  <input type="number" step="0.01" className="w-full p-3.5 bg-red-50/30 border-2 border-transparent focus:border-red-500 rounded-2xl font-black text-sm outline-none text-red-600" value={formData.amount} onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Corrective Action</label>
                <textarea rows={2} className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-sm outline-none resize-none" value={formData.prevention} onChange={(e) => setFormData({...formData, prevention: e.target.value})} />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase transition-all">Discard</button>
                <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95">
                  <Save className="w-4 h-4" /> Save IR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}