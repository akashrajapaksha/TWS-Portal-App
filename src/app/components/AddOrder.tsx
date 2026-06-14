import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Trash2, Edit2, X, Loader2, Home, 
  CheckCircle2, AlertCircle, AlertTriangle, ShieldAlert 
} from 'lucide-react';

interface Order {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_position: string;
  date: string;
  shift: string;
  order_count: number;
}

interface PerformanceEntry {
  date: string;
  shift: string;
  order_count: string;
}

// Helper to normalize dates into clean YYYY-MM-DD formats for inputs and tables
const formatDateString = (dateInput: string) => {
  if (!dateInput) return '';
  return dateInput.split('T')[0];
};

export function AddOrder() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingEmployee, setIsSearchingEmployee] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  // Notification States
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; item: Order | null }>({ show: false, item: null });

  // Employee Level Shared Metadata Form State
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeePosition, setEmployeePosition] = useState('');

  // Dynamic Multi-Date Entries List State Row-Items
  const [entries, setEntries] = useState<PerformanceEntry[]>([
    { date: new Date().toISOString().split('T')[0], shift: '', order_count: '' }
  ]);

  const positionOptions = [
    "zzz201", "zzz202", "zzz203", "zzz204", "zzz205", "zzz206", "zzz207", "zzz208", "zzz209", "zzz210", 
    "zzz211", "zzz212", "zzz213", "zzz214", "zzz215", "zzz216", "zzz217", "zzz218", "zzz219", "zzz220", 
    "www01", "www02", "www03", "www04", "www05", "www06", "www07", 
    "AAA201", "AAA202", "AAA203", "AAA204", "AAA205", 
    "KK8SL01", "KK8SL02", "KK8SL03", "KK8SL04", "KK8SL05", 
    "KKDSLD01", "KKDSLD02"
  ];

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
    setUserRole(savedUser.role || '');
  }, []);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  }, hasFullAccess = ['Super Admin', 'Supervisors', 'TSP'].includes(userRole);
  
  const isLD = userRole === 'LD';
  const canModify = hasFullAccess || isLD;
  const canDelete = hasFullAccess;
  const canViewPage = userRole !== 'Employees';

  const fetchOrders = useCallback(async () => {
    if (!userRole) return;
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:5000/api/orders', {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch (err) {
      console.error("Error fetching data:", err);
      triggerToast("Could not load performance logs", "error");
    } finally {
      setIsLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (canViewPage && userRole) fetchOrders();
  }, [fetchOrders, canViewPage, userRole]);

  // Employee Auto-Lookup Engine
  useEffect(() => {
    const lookupEmployee = async () => {
      if (employeeId.trim().length < 3 || editingId) return;
      
      setIsSearchingEmployee(true);
      try {
        const res = await fetch(`http://localhost:5000/api/orders/fetch-by-id/${employeeId}`, {
          headers: { 'x-user-role': userRole } 
        });
        const data = await res.json();
        if (data.success) {
          setEmployeeName(data.name);
          setEmployeePosition(positionOptions.includes(data.designation) ? data.designation : '');
        } else {
          setEmployeeName('EMPLOYEE NOT FOUND');
          setEmployeePosition('');
        }
      } catch (err) {
        console.error("Lookup failed", err);
      } finally {
        setIsSearchingEmployee(false);
      }
    };

    const timeoutId = setTimeout(lookupEmployee, 500);
    return () => clearTimeout(timeoutId);
  }, [employeeId, editingId, userRole]);

  // Dynamic Array Handlers for managing multiple dates
  const handleAddEntryRow = () => {
    setEntries([
      ...entries,
      { date: new Date().toISOString().split('T')[0], shift: '', order_count: '' }
    ]);
  };

  const handleRemoveEntryRow = (index: number) => {
    if (entries.length === 1) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleUpdateEntryField = (index: number, field: keyof PerformanceEntry, value: string) => {
    const updatedEntries = [...entries];
    updatedEntries[index] = {
      ...updatedEntries[index],
      [field]: value
    };
    setEntries(updatedEntries);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setEmployeeId('');
    setEmployeeName('');
    setEmployeePosition('');
    setEntries([{ date: new Date().toISOString().split('T')[0], shift: '', order_count: '' }]);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.item) return;
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${deleteConfirm.item.id}`, { 
        method: 'DELETE', 
        headers: { 'x-user-role': userRole } 
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Record deleted successfully");
        fetchOrders();
      } else {
        triggerToast(data.message, 'error');
      }
    } catch (err) {
      triggerToast("Failed to delete record", 'error');
    } finally {
      setDeleteConfirm({ show: false, item: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName || employeeName === 'EMPLOYEE NOT FOUND') {
        return triggerToast("Please enter a valid Employee ID", 'error');
    }

    const savedUser = JSON.parse(localStorage.getItem('tws_user') || '{}');
    const endpoint = editingId 
      ? `http://localhost:5000/api/orders/${editingId}` 
      : 'http://localhost:5000/api/orders/add';
    
    // Construct request structural body parameters
    const payload = editingId 
      ? {
          employee_id: employeeId,
          employee_name: employeeName,
          employee_position: employeePosition,
          project: "N/A", 
          date: entries[0].date,
          shift: entries[0].shift,
          order_count: parseInt(entries[0].order_count) || 0,
          admin_id: savedUser.employee_id || 'Unknown',
          admin_name: savedUser.name || 'System Admin'
        }
      : {
          employee_id: employeeId,
          employee_name: employeeName,
          employee_position: employeePosition,
          project: "N/A",
          entries: entries.map(ent => ({
            date: ent.date,
            shift: ent.shift,
            order_count: parseInt(ent.order_count) || 0
          })),
          admin_id: savedUser.employee_id || 'Unknown',
          admin_name: savedUser.name || 'System Admin'
        };

    try {
      const response = await fetch(endpoint, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        triggerToast(editingId ? "Ledger updated successfully" : "Performance records saved successfully");
        closeModal();
        fetchOrders();
      } else {
        triggerToast(data.message, 'error');
      }
    } catch (err) {
      triggerToast("Network error: Failed to save", 'error');
    }
  };

  if (!canViewPage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 h-screen">
        <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">You do not have permission to view performance entries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 h-screen overflow-auto relative">
      
      {/* SYSTEM TOAST */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${
        toast.show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'
      }`}>
        <div className={`${toast.type === 'success' ? 'bg-gray-900 border-gray-700' : 'bg-red-600 border-red-500'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} className="text-green-400" /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold tracking-tight">{toast.message}</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-8 py-4 mb-6 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
          <Home className="w-4 h-4" /> <span>/ Operations / <span className="text-blue-600">Performance Entry</span></span>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="flex justify-between items-center mb-8">
          {canModify && (
            <button onClick={() => { setEditingId(null); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold active:scale-95 shadow-lg shadow-blue-100 transition-all">
              <Plus className="w-5 h-5" /> Add Performance Record
            </button>
          )}
          <div className="relative">
            <input type="text" placeholder="Search ID or Name..." className="pl-12 pr-4 py-3 border border-gray-200 rounded-xl w-80 outline-none focus:border-blue-500 shadow-sm bg-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Employee Details</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Date & Shift</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Position Code</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 text-center">Order Count</th>
                {(canModify || canDelete) && <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-gray-400">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500 w-8 h-8" /></td></tr>
              ) : orders.filter(o => o.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) || o.employee_id.includes(searchQuery)).map(order => (
                <tr key={order.id} className="hover:bg-blue-50/30 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{order.employee_name}</div>
                    <div className="text-[10px] font-black text-blue-600 bg-blue-50 w-fit px-1.5 rounded border border-blue-100 mt-0.5">{order.employee_id}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{formatDateString(order.date)} <div className="text-gray-400 text-[10px] font-bold uppercase">{order.shift}</div></td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{order.employee_position}</td>
                  <td className="px-6 py-4 text-center"><span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-black text-sm">{order.order_count}</span></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      {canModify && (
                        <button onClick={() => { 
                          setEditingId(order.id); 
                          setEmployeeId(order.employee_id);
                          setEmployeeName(order.employee_name);
                          setEmployeePosition(order.employee_position);
                          setEntries([{
                            date: formatDateString(order.date),
                            shift: order.shift,
                            order_count: order.order_count.toString()
                          }]);
                          setShowModal(true); 
                        }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteConfirm({ show: true, item: order })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center animate-in zoom-in duration-200">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-600 w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic tracking-tight">Delete Record?</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Remove performance log for <span className="font-bold text-gray-900">{deleteConfirm.item?.employee_name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm({ show: false, item: null })} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-100 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-red-600 px-8 py-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black italic uppercase tracking-tighter">{editingId ? 'Edit Ledger' : 'New Performance'}</h2>
                <p className="text-red-100 text-[10px] font-medium mt-1 uppercase tracking-widest">Verify all details before saving.</p>
              </div>
              <button onClick={closeModal} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              {/* Profile Meta Frame Block Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 border-b border-gray-100">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Employee ID *</label>
                  <input required disabled={!!editingId} placeholder="E.g. EMP001" className={`w-full border-b-2 p-3 outline-none font-bold uppercase ${editingId ? 'bg-gray-50 text-gray-400 border-gray-100' : 'border-gray-100 focus:border-red-500'}`} value={employeeId} onChange={(e) => setEmployeeId(e.target.value.toUpperCase())} />
                  {isSearchingEmployee && <div className="text-[10px] text-blue-500 mt-1 flex items-center gap-1 font-bold animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> VERIFYING...</div>}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Verified Name</label>
                  <input readOnly className="w-full border-b-2 border-gray-50 p-3 bg-gray-50 text-gray-400 font-bold italic" value={employeeName || 'Auto-filled...'} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Position Code *</label>
                  <select required className="w-full border-b-2 border-gray-100 p-3 outline-none focus:border-red-500 bg-transparent font-medium" value={employeePosition} onChange={(e) => setEmployeePosition(e.target.value)}>
                    <option value="">Select Code</option>
                    {positionOptions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                  </select>
                </div>
              </div>

              {/* Dynamic Array Entries Control Area */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Performance Logging Rows</h3>
                  {!editingId && (
                    <button type="button" onClick={handleAddEntryRow} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add Another Date
                    </button>
                  )}
                </div>

                {entries.map((entry, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-gray-50/50 p-4 rounded-2xl border border-gray-100 relative group/row">
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Entry Date *</label>
                      <input type="date" required className="w-full bg-white border border-gray-200 rounded-xl p-2.5 outline-none focus:border-red-500 font-medium text-sm" value={entry.date} onChange={(e) => handleUpdateEntryField(index, 'date', e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Shift *</label>
                      <select required className="w-full bg-white border border-gray-200 rounded-xl p-2.5 outline-none focus:border-red-500 font-medium text-sm" value={entry.shift} onChange={(e) => handleUpdateEntryField(index, 'shift', e.target.value)}>
                        <option value="">Select Shift</option>
                        <option value="Morning">Morning</option>
                        <option value="Afternoon">Afternoon</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Count *</label>
                        <input type="number" required placeholder="0" className="w-full bg-white border border-gray-200 rounded-xl p-2 font-black text-red-600 focus:border-red-500 outline-none text-base" value={entry.order_count} onChange={(e) => handleUpdateEntryField(index, 'order_count', e.target.value)} />
                      </div>
                      
                      {!editingId && entries.length > 1 && (
                        <button type="button" onClick={() => handleRemoveEntryRow(index)} className="p-2.5 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors mb-0.5">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4 shrink-0 bg-white sticky bottom-0">
                <button type="button" onClick={closeModal} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Discard</button>
                <button 
                  type="submit" 
                  disabled={!employeeName || employeeName === 'EMPLOYEE NOT FOUND'} 
                  className={`flex-1 py-4 rounded-2xl font-black text-white transition-all shadow-xl ${(!employeeName || employeeName === 'EMPLOYEE NOT FOUND') ? 'bg-gray-200' : 'bg-gray-900 hover:bg-black active:scale-95'}`}
                >
                  {editingId ? 'UPDATE RECORD' : 'CONFIRM & SAVE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}