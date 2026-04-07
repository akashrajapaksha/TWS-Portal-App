import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, X, Loader2, Eye, EyeOff, Home, UserPlus, CheckCircle2, AlertCircle, Info } from 'lucide-react';

/** --- CONSTANTS & TYPES --- **/
const ROLE_RANK: Record<string, number> = {
  'Super Admin': 7, 'Supervisors': 6, 'ER': 5, 'Admin': 4, 'TPS': 3, 'LD': 2, 'Employees': 1
};

const DESIGNATIONS = [
  'Data Entry Associates',
  'IT Support Executives',
  'ER',
  'Admin Assistant'
];

interface Employee {
  id: string; employee_id: string; name: string; initials: string; phone_number: string;
  email: string; department: string; project: string; designation: string;
  status: string; role: string; gender: string; dob: string;
  date_of_joining: string; address: string; annual_leave: number; casual_leave: number;
}

interface DropdownItem { id: string | number; name: string; }

export function Employees() {
  // State Management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<DropdownItem[]>([]);
  const [projects, setProjects] = useState<DropdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Replacement for browser alerts
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Employee | null>(null);

  // Auth Context
  const savedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
  const currentUserRole = savedUser.role || 'Employees';
  const isAuthorized = !['LD', 'Employees'].includes(currentUserRole);
  const canAddOrUpdate = ['Super Admin', 'Supervisors', 'ER', 'Admin'].includes(currentUserRole);
  const canDelete = ['Super Admin', 'Supervisors', 'ER'].includes(currentUserRole);

  const [formData, setFormData] = useState({
    employee_id: '', name: '', initials: '', phone_number: '', email: '',
    department: '', project: '', designation: '', status: 'Probation',
    gender: 'Male', dob: '', date_of_joining: '', address: '',
    role: 'Employees', password: '', annual_leave: 0, casual_leave: 0,
  });

  // Notification Timer
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  /** --- API ACTIONS --- **/
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {

      const authHeaders = { 'x-user-role': currentUserRole };


      const [empRes, depRes, projRes] = await Promise.all([
        fetch('http://localhost:5000/api/employees', { headers: authHeaders }),
        fetch('http://localhost:5000/api/departments', { headers: authHeaders }), // Added header here
        fetch('http://localhost:5000/api/projects', { headers: authHeaders })
      ]);

      const [emps, deps, projs] = await Promise.all([empRes.json(), depRes.json(), projRes.json()]);

      if (emps.success) setEmployees(emps.employees);
      setDepartments(Array.isArray(deps) ? deps : deps.departments || deps.data || []);
      setProjects(Array.isArray(projs) ? projs : projs.projects || projs.data || []);
    } catch (err) {
      console.error("Critical Data Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserRole]);

  useEffect(() => {
    if (isAuthorized) fetchData();
  }, [isAuthorized, fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `http://localhost:5000/api/employees/${editingId}` : 'http://localhost:5000/api/employees/add';

    const payload: any = { 
        ...formData, 
        admin_id: savedUser.employee_id,
        admin_name: savedUser.name || 'Admin' 
    };

    if (payload.password) payload.password = payload.password.trim();
    if (editingId && (!formData.password || formData.password.trim() === '')) {
        delete payload.password;
    }

    try {
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': currentUserRole },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setShowModal(false);
        setNotification({ message: editingId ? "Employee updated successfully" : "Employee created successfully", type: 'success' });
        fetchData();
        resetForm();
      } else {
        setNotification({ message: result.message || "Operation failed", type: 'error' });
      }
    } catch (err) {
      setNotification({ message: "Network error occurred", type: 'error' });
    }
  };

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await fetch(`http://localhost:5000/api/employees/${deleteConfirm.id}?admin_id=${savedUser.employee_id}&admin_name=${savedUser.name}&emp_name=${deleteConfirm.name}`, {
        method: 'DELETE', headers: { 'x-user-role': currentUserRole }
      });
      setNotification({ message: "Employee deleted", type: 'info' });
      fetchData();
    } catch (err) { 
        setNotification({ message: "Delete failed", type: 'error' });
    } finally {
        setDeleteConfirm(null);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '', name: '', initials: '', phone_number: '', email: '',
      department: '', project: '', designation: '', status: 'Probation',
      gender: 'Male', dob: '', date_of_joining: '', address: '',
      role: 'Employees', password: '', annual_leave: 0, casual_leave: 0,
    });
    setEditingId(null);
    setShowPassword(false);
  };

  if (!isAuthorized) return <div className="p-20 text-center font-bold text-red-500">403 - Unauthorized Access</div>;

  return (
    <div className="flex-1 bg-[#f8fafc] h-screen overflow-auto font-sans relative">
      
      {/* CUSTOM NOTIFICATION OVERLAY */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-6 py-3 rounded-xl shadow-xl border bg-white ${
            notification.type === 'success' ? 'border-emerald-100 text-emerald-600' :
            notification.type === 'error' ? 'border-rose-100 text-rose-600' : 'border-slate-100 text-slate-600'
          }`}>
            {notification.type === 'success' && <CheckCircle2 size={16} />}
            {notification.type === 'error' && <AlertCircle size={16} />}
            {notification.type === 'info' && <Info size={16} />}
            <span className="text-xs font-bold uppercase tracking-wider">{notification.message}</span>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 scale-in">
            <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Confirm Delete</h3>
            <p className="text-slate-500 text-sm mt-2">Are you sure you want to permanently delete <b>{deleteConfirm.name}</b>?</p>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 text-sm font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
              <button onClick={handleConfirmedDelete} className="flex-1 py-3 text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-xl shadow-lg transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b px-8 py-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <Home className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400">/ Organization /</span>
          <span className="font-bold text-gray-800">Employees</span>
        </div>
        {canAddOrUpdate && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </header>

      <main className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="relative group">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl w-80 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-24 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
              <p className="animate-pulse">Loading employee database...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.filter(e => e.name?.toLowerCase().includes(searchQuery.toLowerCase()) || e.employee_id.toLowerCase().includes(searchQuery.toLowerCase())).map((emp) => (
                    <tr key={emp.id} className="hover:bg-indigo-50/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {emp.initials || emp.name.charAt(0)}
                          </div>
                          <div><p className="font-semibold text-gray-900">{emp.name}</p></div>
                        </div>
                      </td>
                      <td><p className="text-xs text-gray-500">{emp.employee_id}</p></td>
                      <td><p className="text-xs text-gray-500">{emp.email}</p></td>
                      <td className="px-6 py-4"><p className="text-sm text-gray-700 font-medium">{emp.department || 'No Dept'}</p></td>
                      <td className="px-6 py-4"><p className="text-[11px] text-indigo-500 font-bold uppercase tracking-tight">{emp.project || 'General'}</p></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => { 
                                setEditingId(emp.id); 
                                setFormData({ ...emp, password: '' }); 
                                setShowModal(true); 
                            }} 
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button onClick={() => setDeleteConfirm(emp)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col scale-in">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {editingId ? <Pencil className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />}
                {editingId ? 'Edit Employee Profile' : 'Register New Employee'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
              <div className="md:col-span-3 flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest border-b pb-2 mb-2">
                <span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Core Identity
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">EMPLOYEE ID *</label>
                <input required className="form-input-custom" value={formData.employee_id} onChange={e => setFormData({ ...formData, employee_id: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">FULL NAME *</label>
                <input required className="form-input-custom" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">INITIALS</label>
                <input className="form-input-custom" value={formData.initials} onChange={e => setFormData({ ...formData, initials: e.target.value })} />
              </div>

              <div className="md:col-span-3 flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest border-b pb-2 mb-2 mt-4">
                <span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Organizational Placement
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">DEPARTMENT</label>
                <select className="form-input-custom" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}>
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">PROJECT</label>
                <select className="form-input-custom" value={formData.project} onChange={e => setFormData({ ...formData, project: e.target.value })}>
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">DESIGNATION</label>
                <select 
                  className="form-input-custom" 
                  value={formData.designation} 
                  onChange={e => setFormData({ ...formData, designation: e.target.value })}
                >
                  <option value="">Choose Position</option>
                  {DESIGNATIONS.map(des => (
                    <option key={des} value={des}>{des}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest border-b pb-2 mb-2 mt-4">
                <span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Security & Access
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">ACCESS ROLE *</label>
                <select 
                   required 
                   className="form-input-custom disabled:bg-gray-50 disabled:cursor-not-allowed" 
                   value={formData.role} 
                   onChange={e => setFormData({ ...formData, role: e.target.value })}
                   disabled={currentUserRole !== 'Super Admin' && currentUserRole !== 'Admin'}
                >
                  {Object.keys(ROLE_RANK).filter(r => {
                    if (currentUserRole === 'Super Admin') return true;
                    if (currentUserRole === 'Admin') return r === 'Employees';
                    return false;
                  }).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">EMAIL ADDRESS *</label>
                <input required type="email" className="form-input-custom" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-gray-500 ml-1">
                    {editingId ? "RESET PASSWORD (LEAVE BLANK TO KEEP)" : "INITIAL PASSWORD *"}
                </label>
                <input 
                    required={!editingId} 
                    type={showPassword ? "text" : "password"} 
                    placeholder={editingId ? "Leave blank to keep current" : "Set initial password"}
                    className="form-input-custom pr-10" 
                    value={formData.password} 
                    onChange={e => setFormData({ ...formData, password: e.target.value })} 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 text-gray-400">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="md:col-span-3 flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest border-b pb-2 mb-2 mt-4">
                <span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Leave Allocation
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">ANNUAL LEAVE (DAYS)</label>
                <input type="number" className="form-input-custom" value={formData.annual_leave} onChange={e => setFormData({ ...formData, annual_leave: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">CASUAL LEAVE (DAYS)</label>
                <input type="number" className="form-input-custom" value={formData.casual_leave} onChange={e => setFormData({ ...formData, casual_leave: Number(e.target.value) })} />
              </div>

              <div className="md:col-span-3 flex justify-end gap-3 pt-6 border-t mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-10 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">
                  {editingId ? 'Update Employee' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .form-input-custom { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; outline: none; background-color: #ffffff; transition: all 0.2s; font-size: 0.875rem; }
        .form-input-custom:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
        .scale-in { animation: scaleIn 0.2s ease-out; }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}