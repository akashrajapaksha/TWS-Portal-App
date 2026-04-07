import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, Check, Calendar, BarChart3, Loader2, User, Clock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

// --- Types ---
interface LeaveApplication {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  apply_date: string;
}

const API_BASE_URL = 'http://localhost:5000/api/leaves';

export function Leaves() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState({ annual: 0, casual: 0 });

  // --- UI Feedback States ---
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void; 
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const [formData, setFormData] = useState({
    leaveType: 'Medical', 
    fromDate: '',
    toDate: '',
    totalDays: 0,
    reason: '',
  });

  const availableLeaveTypes = useMemo(() => {
    const types = [];
    if (leaveBalance.annual > 0) types.push('Annual');
    if (leaveBalance.casual > 0) types.push('Casual');
    types.push('Medical');
    types.push('No Pay');
    return types;
  }, [leaveBalance]);

  const fetchData = useCallback(async (currentUser: any) => {
    setLoading(true);
    try {
      const isPrivileged = ['Super Admin', 'ER'].includes(currentUser.role);
      setIsAdmin(isPrivileged);

      const endpoint = isPrivileged ? '/all' : `/my-leaves/${currentUser.id}`;
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'x-user-role': currentUser.role }
      });
      const data = await res.json();
      if (data.success) setApplications(data.leaves);

      const balanceRes = await fetch(`${API_BASE_URL}/balance/${currentUser.id}`);
      const balanceData = await balanceRes.json();
      if (balanceData.success) {
        setLeaveBalance({
          annual: balanceData.annual,
          casual: balanceData.casual
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('tws_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      fetchData(parsed);
    }
  }, [fetchData]);

  useEffect(() => {
    if (!availableLeaveTypes.includes(formData.leaveType)) {
      setFormData(prev => ({ ...prev, leaveType: availableLeaveTypes[0] || 'Medical' }));
    }
  }, [availableLeaveTypes, formData.leaveType]);

  const handleDateChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    if (newFormData.fromDate && newFormData.toDate) {
      const start = new Date(newFormData.fromDate);
      const end = new Date(newFormData.toDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      newFormData.totalDays = diff > 0 ? diff : 0;
    }
    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/apply`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role 
        },
        body: JSON.stringify({
          employee_id: user.id,
          employee_name: user.name,
          leave_type: formData.leaveType,
          start_date: formData.fromDate,
          end_date: formData.toDate,
          number_of_days: formData.totalDays,
          reason: formData.reason,
          user_id: user.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchData(user);
        showToast("Application submitted successfully!");
      } else {
        showToast(data.message, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = (id: string, status: string, leaveType: string) => {
    setConfirmModal({
      isOpen: true,
      title: `${status} Application`,
      message: `Are you sure you want to ${status.toLowerCase()} this leave request? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/approve/${id}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-role': user.role 
            },
            body: JSON.stringify({ 
              status, 
              admin_id: user.id, 
              admin_name: user.name, 
              leave_type: leaveType 
            })
          });
          const data = await res.json();
          if (data.success) {
            fetchData(user);
            showToast(`Request ${status} successfully.`);
          } else {
            showToast(data.message, 'error');
          }
        } catch (err) {
          showToast("Failed to update status", 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const isBalanceExceeded = (formData.leaveType === 'Annual' && formData.totalDays > leaveBalance.annual) || 
                            (formData.leaveType === 'Casual' && formData.totalDays > leaveBalance.casual);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
      <p className="font-black italic text-gray-400">LOADING DATA...</p>
    </div>
  );

  return (
    <div className="flex-1 bg-gray-50 min-h-screen p-4 md:p-10 font-sans">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
          <div className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] shadow-2xl border-2 ${
            notification.type === 'success' ? 'bg-white border-emerald-500 text-emerald-600' : 'bg-white border-red-500 text-red-600'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl">
            <AlertCircle className="w-12 h-12 text-blue-600 mb-6" />
            <h3 className="text-2xl font-black text-gray-900 uppercase italic leading-none">{confirmModal.title}</h3>
            <p className="text-gray-400 text-xs font-bold mt-4 uppercase tracking-tight leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-4 mt-10">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm} 
                className="flex-1 py-4 text-[10px] font-black uppercase text-white bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-gray-900 uppercase">Leave Management</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-md uppercase">{user?.role}</span>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">{user?.name}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="bg-black text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95 uppercase tracking-tighter italic"
          >
            <Plus size={20} strokeWidth={4} /> New Request
          </button>
        </header>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden group">
            <Calendar className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform" size={140} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Annual Rem.</p>
            <h3 className="text-6xl font-black italic tracking-tighter text-blue-600">{leaveBalance.annual}</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden group">
            <Clock className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform" size={140} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Casual Rem.</p>
            <h3 className="text-6xl font-black italic tracking-tighter text-amber-500">{leaveBalance.casual}</h3>
          </div>
          <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <ShieldCheck className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform text-white" size={140} />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Recent Status</p>
            <h3 className="text-4xl font-black italic tracking-tighter text-white uppercase">{applications[0]?.status || 'NO DATA'}</h3>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest">
                  <th className="px-10 py-6">Employee</th>
                  <th className="px-10 py-6">Type & Duration</th>
                  <th className="px-10 py-6 text-center">Status</th>
                  {isAdmin && <th className="px-10 py-6 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-blue-50/10 transition-colors">
                    <td className="px-10 py-6 font-black text-gray-900 uppercase tracking-tighter text-lg">{app.employee_name}</td>
                    <td className="px-10 py-6">
                      <div className={`font-black uppercase tracking-tighter text-sm ${['Medical', 'No Pay'].includes(app.leave_type) ? 'text-red-500' : 'text-blue-600'}`}>{app.leave_type} Leave</div>
                      <div className="text-xs font-bold text-gray-400 italic">{app.number_of_days} Days ({app.start_date} - {app.end_date})</div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <span className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${
                        app.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' :
                        app.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>{app.status}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-10 py-6">
                        <div className="flex justify-center gap-2">
                          {app.status === 'Pending' ? (
                            <>
                              <button onClick={() => updateStatus(app.id, 'Approved', app.leave_type)} className="p-2 bg-green-500 text-white rounded-xl hover:scale-110 transition-all shadow-md shadow-green-100"><Check size={18} strokeWidth={4} /></button>
                              <button onClick={() => updateStatus(app.id, 'Rejected', app.leave_type)} className="p-2 bg-red-500 text-white rounded-xl hover:scale-110 transition-all shadow-md shadow-red-100"><X size={18} strokeWidth={4} /></button>
                            </>
                          ) : <span className="text-[10px] font-bold text-gray-300 italic uppercase">Processed</span>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Request Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl p-10 relative">
            <header className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black italic tracking-tighter uppercase">Apply Leave</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
            </header>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Select Type</label>
                <select 
                  className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] font-bold focus:border-blue-600 outline-none transition-all" 
                  value={formData.leaveType} 
                  onChange={e => setFormData({...formData, leaveType: e.target.value})}
                >
                  {availableLeaveTypes.map(t => <option key={t} value={t}>{t} Leave</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="date" required className="p-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] font-bold focus:border-blue-600 outline-none" onChange={e => handleDateChange('fromDate', e.target.value)} />
                <input type="date" required className="p-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] font-bold focus:border-blue-600 outline-none" onChange={e => handleDateChange('toDate', e.target.value)} />
              </div>

              <textarea placeholder="Reason for leave..." required className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] h-28 font-medium focus:border-blue-600 outline-none resize-none" onChange={e => setFormData({...formData, reason: e.target.value})} />

              {isBalanceExceeded && (
                <div className="bg-red-50 p-4 rounded-2xl flex items-center gap-3 border border-red-100 text-red-600">
                  <AlertCircle size={20} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Balance Exceeded! Choose Medical or No Pay.</p>
                </div>
              )}

              <div className="bg-black p-8 rounded-[2rem] flex justify-between items-center text-white">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Days</p>
                  <p className="text-5xl font-black italic tracking-tighter">{formData.totalDays} DAYS</p>
                </div>
                <BarChart3 size={40} className="text-blue-500 opacity-40" />
              </div>

              <button 
                type="submit" 
                disabled={submitting || formData.totalDays <= 0 || isBalanceExceeded} 
                className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-lg hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 transition-all flex justify-center items-center shadow-xl shadow-blue-100"
              >
                {submitting ? <Loader2 className="animate-spin" /> : "SUBMIT APPLICATION"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}