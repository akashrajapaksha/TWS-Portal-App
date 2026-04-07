import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Pencil, Trash2, Loader2, X, Home, 
  Building2, ShieldAlert, ChevronRight, Briefcase,
  AlertCircle, CheckCircle2, Info
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  employees_count: number;
  status: 'Active' | 'Inactive';
  created_date: string;
}

export function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  
  // Custom Alert/Notification State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  // Auto-hide notifications after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
    setUserRole(savedUser.role || '');
  }, []);

  const canViewPage = !['LD', 'Employees'].includes(userRole);
  const canCreateOrUpdate = ['Super Admin', 'Supervisors', 'ER', 'Admin'].includes(userRole);
  const canDelete = ['Super Admin', 'Supervisors', 'ER'].includes(userRole);

  const fetchDepartments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/api/departments', {
        headers: { 'x-user-role': userRole }
      });
      const data = await response.json();
      if (data.success) setDepartments(data.departments);
    } catch (error) {
      setNotification({ message: "Failed to sync registry", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (canViewPage && userRole) fetchDepartments();
  }, [fetchDepartments, canViewPage, userRole]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', status: 'Active' });
    setShowModal(true);
  };

  const handleOpenEditModal = (dept: Department) => {
    setEditingId(dept.id);
    setFormData({ name: dept.name, status: dept.status });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const savedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
    const url = editingId 
      ? `http://localhost:5000/api/departments/${editingId}` 
      : 'http://localhost:5000/api/departments/add';
    
    try {
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': userRole 
        },
        body: JSON.stringify({
          ...formData,
          employee_id: savedUser.employee_id || 'Unknown',
          employee_name: savedUser.name || 'System User'
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        setNotification({ message: editingId ? "Unit updated successfully" : "New unit registered", type: 'success' });
        fetchDepartments();
      } else {
        setNotification({ message: data.message, type: 'error' });
      }
    } catch {
      setNotification({ message: "Connection lost. Retry later.", type: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    const savedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
    const queryParams = new URLSearchParams({
      employee_id: savedUser.employee_id || 'Unknown',
      employee_name: savedUser.name || 'System User',
      dept_name: deleteConfirm.name
    }).toString();

    try {
      const response = await fetch(`http://localhost:5000/api/departments/${deleteConfirm.id}?${queryParams}`, { 
        method: 'DELETE',
        headers: { 'x-user-role': userRole }
      });
      const data = await response.json();
      if (data.success) {
        setNotification({ message: "Department permanently removed", type: 'info' });
        fetchDepartments();
      } else {
        setNotification({ message: data.message, type: 'error' });
      }
    } catch {
      setNotification({ message: "Delete operation failed", type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (!canViewPage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] h-screen p-6">
        <div className="text-center max-w-md bg-white p-12 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="bg-rose-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Access Denied</h2>
          <p className="text-slate-400 text-sm font-medium mt-4 leading-relaxed">
            Your role <span className="text-rose-500 font-bold">({userRole})</span> does not have the clearance levels required to manage organizational units.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#F8FAFC] h-screen overflow-auto font-sans relative">
      
      {/* REALISTIC TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
            notification.type === 'success' ? 'bg-white border-emerald-100 text-emerald-600' :
            notification.type === 'error' ? 'bg-white border-rose-100 text-rose-600' : 
            'bg-slate-900 border-slate-800 text-white'
          }`}>
            {notification.type === 'success' && <CheckCircle2 size={18} />}
            {notification.type === 'error' && <AlertCircle size={18} />}
            {notification.type === 'info' && <Info size={18} />}
            <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={14}/></button>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 sticky top-0 z-30 flex justify-between items-center">
        <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-slate-400">
          <Home className="w-3.5 h-3.5" />
          <ChevronRight className="w-3 h-3" />
          <span>Organization</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-blue-600 italic">Departments</span>
        </div>
        
        {canCreateOrUpdate && (
          <button
            onClick={handleOpenAddModal}
            className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Register Unit
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-10 space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Unit Management</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] ml-1">Governance & Structural Architecture</p>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-32 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4 opacity-20" />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Synchronizing Registry...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Unit</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Status</th>
                  {(canCreateOrUpdate || canDelete) && (
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 tracking-tight text-base uppercase italic">{dept.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 italic">
                          ID: {dept.id.slice(0, 8)} • REG: {new Date(dept.created_date).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                        dept.status === 'Active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${dept.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{dept.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canCreateOrUpdate && (
                          <button onClick={() => handleOpenEditModal(dept)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil className="w-4 h-4" /></button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteConfirm(dept)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Confirm Removal</h3>
            <p className="text-slate-400 text-xs font-bold mt-2 leading-relaxed uppercase">
              Are you sure you want to delete <span className="text-slate-900 font-black italic">"{deleteConfirm.name}"</span>? This action is irreversible.
            </p>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 text-[10px] font-black uppercase bg-rose-600 text-white hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-200 transition-all">Remove Unit</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <div className="flex flex-col">
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{editingId ? 'Modify Unit' : 'Register New Unit'}</h2>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Organization Architecture</span>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Department Nomenclature</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    required
                    type="text"
                    placeholder="e.g. OPERATIONS"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:border-blue-500/20 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all uppercase"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-xl transition-all active:scale-95">
                  {editingId ? 'Save Changes' : 'Confirm Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}