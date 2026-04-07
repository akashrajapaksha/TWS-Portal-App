import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit2, X, AlertCircle, Briefcase, 
  Clock, Hash, User, Calendar, Loader2, ShieldAlert, CheckCircle2, AlertTriangle
} from 'lucide-react';

interface Mistake {
  id: string;
  employeeid: string; 
  employee_name: string;
  project: string;
  employee_position: string;
  date: string;
  shift: string;
  mistake_type: string;
  amount: number;
  count: number;
}

const MISTAKE_CATEGORIES = [
  "WRONG KEY IN OF AMOUNT", "WRONG KEY IN OF BANK CODE", "WRONG KEY - NO REFERENCE",
  "WRONG KEY - DOUBLE KEY IN", "WRONG KEY IN - WRONG ACCOUNT", "WRONG KEY IN - WRONG REVERSAL",
  "DOUBLE PAY", "LOCK A BANK", "BREAK", "DOUBLE APPROVE SAME TICKET", "MONEY SHORT"
];

const MONEY_MISTAKES = ["DOUBLE PAY", "MONEY SHORT"];
const ZERO_COUNT_MISTAKES = ["DOUBLE PAY", "LOCK A BANK", "BREAK", "DOUBLE APPROVE SAME TICKET", "MONEY SHORT"];
const POSITIONS = ["zzz201", "zzz202", "zzz203", "zzz204", "zzz205", "zzz206", "zzz207", "zzz208", "zzz209", "zzz210", "zzz211", "zzz212", "zzz213", "zzz214", "zzz215", "zzz216", "zzz217", "zzz218", "zzz219", "zzz220", "www01", "www02", "www03", "www04", "www05", "www06", "www07", "AAA201", "AAA202", "AAA203", "AAA204", "AAA205", "KK8SL01", "KK8SL02", "KK8SL03", "KK8SL04", "KK8SL05", "KKDSLD01", "KKDSLD02", "Other"];
const SHIFTS = ["Morning", "Afternoon", "Night", "General"];

export function AddMistakes() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingEmp, setIsFetchingEmp] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  // Toast & Modal States
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; item: Mistake | null }>({ show: false, item: null });

  const [formData, setFormData] = useState({
    employeeid: '',
    employee_name: '',
    project: '',
    employee_position: '', 
    date: new Date().toISOString().split('T')[0],
    shift: '',
    mistake_type: '',
    amount: 0,
    count: 1,
  });

  useEffect(() => { 
    const savedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
    setUserRole(savedUser.role || '');
    fetchMistakes(); 
  }, []);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const isEmployee = userRole === 'Employees';
  const isViewOnly = ['ER', 'Admin'].includes(userRole);
  const canModify = ['Super Admin', 'Supervisors', 'TSP', 'LD'].includes(userRole);
  const canDelete = ['Super Admin', 'Supervisors', 'TSP'].includes(userRole);

  const fetchMistakes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:5000/api/mistakes');
      const data = await res.json();
      if (data.success) setMistakes(data.mistakes);
    } catch (error) { console.error("Fetch Error:", error); }
    finally { setIsLoading(false); }
  };

  const handleIdLookup = async (id: string) => {
    const upperId = id.toUpperCase();
    setFormData(prev => ({ ...prev, employeeid: upperId }));
    
    if (upperId.trim().length >= 3) {
      setIsFetchingEmp(true);
      try {
        const res = await fetch(`http://localhost:5000/api/mistakes/fetch-by-id/${upperId}`);
        const data = await res.json();
        if (data.success) {
          setFormData(prev => ({ 
            ...prev, 
            employee_name: data.name, 
            project: data.project || '',
            employee_position: data.designation || prev.employee_position
          }));
        } else {
          setFormData(prev => ({ ...prev, employee_name: 'EMPLOYEE NOT FOUND' }));
        }
      } catch (err) { console.error("Lookup failed"); } 
      finally { setIsFetchingEmp(false); }
    } else {
      setFormData(prev => ({ ...prev, employee_name: '', project: '' }));
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.item) return;
    const m = deleteConfirm.item;
    const savedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
    const queryParams = new URLSearchParams({
        userRole: userRole,
        admin_id: savedUser.employee_id || 'Unknown',
        admin_name: savedUser.name || 'Admin',
        emp_name: m.employee_name,
        mistake_type: m.mistake_type
    }).toString();

    try {
      const res = await fetch(`http://localhost:5000/api/mistakes/${m.id}?${queryParams}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        triggerToast("Log deleted successfully");
        fetchMistakes();
      } else {
        triggerToast(data.message, 'error');
      }
    } catch (error) { triggerToast("Server connection failed", 'error'); }
    finally { setDeleteConfirm({ show: false, item: null }); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.employee_name === 'EMPLOYEE NOT FOUND' || !formData.employee_name) {
        return triggerToast("Please enter a valid Employee ID", 'error');
    }

    const savedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
    const url = editingId ? `http://localhost:5000/api/mistakes/${editingId}` : 'http://localhost:5000/api/mistakes/add';
    
    const payload = {
        ...formData,
        userRole: userRole,
        admin_id: savedUser.employee_id || 'Unknown',
        admin_name: savedUser.name || 'Admin'
    };

    try {
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        setShowModal(false);
        resetForm();
        fetchMistakes();
        triggerToast(editingId ? "Log updated successfully" : "New mistake logged");
      } else {
        triggerToast(result.message || result.error, 'error');
      }
    } catch (error) { triggerToast("Server connection failed", 'error'); }
  };

  const resetForm = () => {
    setFormData({
      employeeid: '', employee_name: '', project: '', employee_position: '',
      date: new Date().toISOString().split('T')[0], shift: '', mistake_type: '', amount: 0, count: 1,
    });
    setEditingId(null);
  };

  if (isEmployee) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 h-screen">
        <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">The Mistake Logs page is not available for your role.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 h-screen overflow-auto relative">
      
      {/* REALISTIC TOAST */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${
        toast.show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'
      }`}>
        <div className={`${toast.type === 'success' ? 'bg-gray-900 border-gray-700' : 'bg-red-600 border-red-500'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} className="text-green-400" /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold tracking-tight">{toast.message}</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Performance</span> / <span className="text-red-600 font-medium">Mistake Logs</span>
          </div>
          {isViewOnly && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold uppercase">View Only</span>}
      </div>

      <div className="p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            {canModify && (
                <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-red-100 active:scale-95 transition-all">
                    <Plus className="w-5 h-5"/> Log New Mistake
                </button>
            )}
            
            <div className="relative w-full md:w-96">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Search Employee ID..." className="pl-12 pr-4 py-3 border border-gray-200 rounded-xl w-full outline-none focus:border-red-500 bg-white font-medium shadow-sm transition-all" onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Position</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Penalty / Count</th>
                  {(canModify || canDelete) && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-red-500 w-8 h-8" /></td></tr>
                ) : mistakes.filter(m => m.employeeid?.toLowerCase().includes(searchQuery.toLowerCase())).map((m) => (
                    <tr key={m.id} className="hover:bg-red-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase">{m.employeeid}</span>
                          <div className="font-bold text-gray-900">{m.employee_name}</div>
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-tighter">{m.project}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-700">{m.employee_position}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-medium">{m.shift} Shift</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-white text-red-600 px-2 py-0.5 rounded text-[10px] font-black border border-red-200 uppercase inline-block mb-1 shadow-sm">{m.mistake_type}</span>
                        <div className="text-[10px] text-gray-400 font-medium uppercase italic">{m.date}</div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">
                        {m.amount > 0 ? (
                          <span className="text-red-600 bg-red-50 px-2 py-1 rounded-lg">MYR {m.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        ) : (
                          <span className={`${m.count === 0 ? 'text-gray-400 bg-gray-100' : 'text-blue-600 bg-blue-50'} px-2 py-1 rounded-lg`}>{m.count} Case(s)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-1">
                          {canModify && <button onClick={() => {
                            setEditingId(m.id);
                            setFormData({...m});
                            setShowModal(true);
                          }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 className="w-4 h-4"/></button>}
                          {canDelete && <button onClick={() => setDeleteConfirm({ show: true, item: m })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button>}
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center animate-in zoom-in duration-200">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-600 w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic tracking-tight">Confirm Delete</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Are you sure you want to delete the log for <span className="font-bold text-gray-900">{deleteConfirm.item?.employee_name}</span>? This action is permanent.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm({ show: false, item: null })} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-100">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="bg-red-600 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tight">{editingId ? 'Edit Mistake Log' : 'New Mistake Entry'}</h2>
                <p className="text-red-100 text-xs font-medium mt-1">Please ensure all details are accurate before saving.</p>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Hash className="w-3 h-3"/> Employee ID</label>
                <input type="text" required placeholder="E.g. EMP001" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-red-500 font-bold transition-all uppercase" value={formData.employeeid} onChange={(e) => handleIdLookup(e.target.value)} />
                {isFetchingEmp && <Loader2 className="absolute right-2 top-8 w-4 h-4 animate-spin text-red-500" />}
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><User className="w-3 h-3"/> Full Name</label>
                <input 
                  type="text" 
                  readOnly 
                  className={`w-full border-b-2 p-2 bg-gray-50 italic font-medium transition-colors ${formData.employee_name === 'EMPLOYEE NOT FOUND' ? 'text-red-500 border-red-200' : 'text-gray-400 border-gray-50'}`} 
                  value={isFetchingEmp ? 'Searching...' : (formData.employee_name || 'Auto-filling...')} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Briefcase className="w-3 h-3"/> Position Code</label>
                <select required className="w-full border-b-2 border-gray-100 py-2 outline-none focus:border-red-500 bg-transparent font-medium" value={formData.employee_position} onChange={(e) => setFormData({...formData, employee_position: e.target.value})}>
                    <option value="">Select Code</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Clock className="w-3 h-3"/> Shift</label>
                <select required className="w-full border-b-2 border-gray-100 py-2 outline-none focus:border-red-500 bg-transparent font-medium" value={formData.shift} onChange={(e) => setFormData({...formData, shift: e.target.value})}>
                    <option value="">Select Shift</option>
                    {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Calendar className="w-3 h-3"/> Date of Incident</label>
                <input type="date" required className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-red-500 font-medium" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Mistake Category</label>
                <select 
                  required 
                  className="w-full border-b-2 border-gray-100 py-2 outline-none focus:border-red-500 bg-transparent font-black text-red-600 uppercase" 
                  value={formData.mistake_type} 
                  onChange={(e) => {
                    const selected = e.target.value;
                    const newCount = ZERO_COUNT_MISTAKES.includes(selected) ? 0 : 1;
                    setFormData({...formData, mistake_type: selected, amount: 0, count: newCount});
                  }}
                >
                  <option value="">Choose Category...</option>
                  {MISTAKE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {MONEY_MISTAKES.includes(formData.mistake_type) ? (
                <div className="col-span-2 bg-red-50 p-5 rounded-2xl border border-red-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black text-red-600 uppercase block">Penalty Amount (MYR)</label>
                    {ZERO_COUNT_MISTAKES.includes(formData.mistake_type) && <span className="text-[9px] font-bold text-white bg-red-400 px-2 py-0.5 rounded italic">0 Count Mistake</span>}
                  </div>
                  <input type="number" step="0.01" className="bg-transparent border-b-2 border-red-200 w-full text-3xl font-black text-red-700 outline-none" value={formData.amount} onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})} />
                </div>
              ) : (
                <div className={`col-span-2 p-5 rounded-2xl border transition-all duration-300 ${ZERO_COUNT_MISTAKES.includes(formData.mistake_type) ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-100'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <label className={`text-[10px] font-black uppercase block ${ZERO_COUNT_MISTAKES.includes(formData.mistake_type) ? 'text-gray-400' : 'text-blue-600'}`}>Number of Cases</label>
                    {ZERO_COUNT_MISTAKES.includes(formData.mistake_type) && <span className="text-[9px] font-bold text-gray-500 italic uppercase tracking-tighter">System Locked</span>}
                  </div>
                  <input 
                    type="number" 
                    disabled={ZERO_COUNT_MISTAKES.includes(formData.mistake_type)}
                    className={`bg-transparent border-b-2 w-full text-3xl font-black outline-none transition-all ${ZERO_COUNT_MISTAKES.includes(formData.mistake_type) ? 'border-gray-200 text-gray-300' : 'border-blue-200 text-blue-700'}`} 
                    value={formData.count} 
                    onChange={(e) => setFormData({...formData, count: parseInt(e.target.value)})}
                  />
                </div>
              )}

              <div className="col-span-2 flex justify-end gap-4 mt-8">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Cancel</button>
                <button 
                  type="submit" 
                  disabled={!formData.employee_name || formData.employee_name === 'EMPLOYEE NOT FOUND' || isFetchingEmp} 
                  className={`px-10 py-4 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all ${(!formData.employee_name || formData.employee_name === 'EMPLOYEE NOT FOUND' || isFetchingEmp) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black active:scale-95'}`}
                >
                    {editingId ? 'Update Record' : 'Save Mistake Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}