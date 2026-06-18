import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, Check, Calendar, Loader2, Clock, ShieldCheck, AlertCircle, CheckCircle2, Search, Users, ArrowRight, FileText, Paperclip } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// --- Types ---
interface LeaveApplication {
  id: number; 
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  reason: string;
  status: string; 
  apply_date: string;
  reject_reason?: string; 
  project_name?: string; 
  attachment_url?: string;
}

interface AuditData {
  success: boolean;
  employeeBalances: {
    annual_allocated: number;
    casual_allocated: number;
    annual_remaining: number;
    casual_remaining: number;
    total_approved_historical: number;
  };
  dateAnalytics: {
    target_date: string;
    other_employees_approved_count: number;
  };
}

const BASE_SERVER_URL = 'https://ambassador-michigan-mandate-penalty.trycloudflare.com';
const API_BASE_URL = `${BASE_SERVER_URL}/api/leaves`;

export function Leaves() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState({ annual: 0, casual: 0 });
  const [socket, setSocket] = useState<Socket | null>(null);

  // --- Medical Document Specific States ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // --- Admin Insights Subsystem States ---
  const [lookupId, setLookupId] = useState('');
  const [searchingAudit, setSearchingAudit] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditData | null>(null);
  
  const [matrixDate, setMatrixDate] = useState('');
  const [checkingMatrix, setCheckingMatrix] = useState(false);
  const [conflictingStaff, setConflictingStaff] = useState<number>(0);

  // --- UI Feedback States ---
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // --- Administrative Override Deductions Setup State ---
  const [adminDeductionSelection, setAdminDeductionSelection] = useState<'NONE' | 'CASUAL' | 'NO PAY'>('NONE');

  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    isMedicalForwardRoute: boolean; 
    onConfirm: (deductionType?: string) => void; 
  }>({
    isOpen: false,
    title: '',
    message: '',
    isMedicalForwardRoute: false,
    onConfirm: () => {},
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const [formData, setFormData] = useState({
    leaveType: 'Annual', 
    fromDate: '',
    toDate: '',
    totalDays: 0,
    reason: '',
  });

  const leaveOptions = ['Annual', 'Casual', 'Medical', 'No Pay'];

  const fetchData = useCallback(async (currentUser: any) => {
    try {
      const empId = currentUser?.employee_id;
      const userRole = currentUser?.role || '';
      if (!empId) return;

      const isPrivileged = ['SUPER ADMIN', 'ER', 'ADMIN', 'SUPERVISORS'].includes(userRole.trim().toUpperCase());
      setIsAdmin(isPrivileged);

      const endpoint = isPrivileged ? '/dashboard-list' : `/my-leaves/${empId}`;
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 
          'X-User-Role': userRole,
          'x-employee-id': String(empId) 
        }
      });
      const data = await res.json();
      if (data.success) setApplications(data.leaves || []);

      const balanceRes = await fetch(`${API_BASE_URL}/balance/${empId}`);
      const balanceData = await balanceRes.json();
      if (balanceData.success) {
        setLeaveBalance({
          annual: Number(balanceData.annual ?? 0),
          casual: Number(balanceData.casual ?? 0)
        });
      }
    } catch (error) {
      console.error('Fetch engine sync error:', error);
      showToast("Error retrieving database sync pipelines", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('tws_user');
    if (!storedUser) return;
    
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    fetchData(parsedUser);

    const socketInstance = io(BASE_SERVER_URL);
    setSocket(socketInstance);

    socketInstance.emit('register_user', {
      employee_id: parsedUser.employee_id,
      role: parsedUser.role
    });

    socketInstance.on('new_leave_notification', (data: { message: string }) => {
      showToast(data.message, 'success');
      fetchData(parsedUser); 
    });

    socketInstance.on('leave_status_changed', (data: { message: string }) => {
      showToast(data.message, 'success');
      fetchData(parsedUser); 
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [fetchData]);

  const executeAnalyticsLookup = async (targetId: string, targetDate: string) => {
    if (!targetId || !targetDate) return;
    setSearchingAudit(true);
    setCheckingMatrix(true);
    try {
      const res = await fetch(`${API_BASE_URL}/metrics-lookup?target_employee_id=${targetId.trim()}&search_date=${targetDate}`, {
        headers: { 'X-User-Role': user?.role || '' }
      });
      const data = await res.json();
      if (data.success) {
        setAuditResults(data);
        setConflictingStaff(data.dateAnalytics.other_employees_approved_count);
      } else {
        showToast(data.message || "Target operational matrix context anomaly", "error");
      }
    } catch (err) {
      showToast("Operational lookup connection pipeline failure", "error");
    } finally {
      setSearchingAudit(false);
      setCheckingMatrix(false);
    }
  };

  const handleManualAuditSearch = () => {
    if (!lookupId.trim()) return;
    const defaultDate = matrixDate || new Date().toISOString().split('T')[0];
    if (!matrixDate) setMatrixDate(defaultDate);
    executeAnalyticsLookup(lookupId, defaultDate);
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        showToast("Unsupported file syntax. Please upload a PDF or JPG image.", "error");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.leaveType === 'Medical' && !selectedFile) {
      showToast("Medical applications require PDF or JPG validation documentation.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('employee_id', user?.employee_id);
      payload.append('employee_name', user?.name || '');
      payload.append('leave_type', formData.leaveType);
      payload.append('start_date', formData.fromDate);
      payload.append('end_date', formData.toDate);
      payload.append('number_of_days', String(formData.totalDays));
      payload.append('reason', formData.reason);
      payload.append('user_id', user?.id || '');
      payload.append('project_name', user?.project || 'GENERAL');
      
      if (selectedFile) {
        payload.append('document', selectedFile);
      }

      const res = await fetch(`${API_BASE_URL}/apply`, {
        method: 'POST',
        headers: { 
          'X-User-Role': user?.role || '' 
        },
        body: payload
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchData(user);
        showToast(data.message || "Application and files forwarded into workflow!");
        setFormData({ leaveType: 'Annual', fromDate: '', toDate: '', totalDays: 0, reason: '' }); 
        setSelectedFile(null);
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast("Failed to post record allocation rules", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const processWorkflowAction = (id: number, actionType: 'APPROVE' | 'REJECT' | 'PASS_TO_ER', leaveType: string) => {
    let trackingComment = '';
    const normLeaveType = leaveType.toLowerCase().trim();
    const isMedicalOrNoPay = normLeaveType === 'medical' || normLeaveType === 'no pay';

    if (actionType === 'REJECT') {
      const inputPrompt = prompt("Enter a mandatory reason description for rejecting this request:");
      if (inputPrompt === null) return; 
      if (!inputPrompt.trim()) {
        showToast("You must provide a rejection reason comment.", "error");
        return;
      }
      trackingComment = inputPrompt.trim();
    }

    let dynamicModalMsg = `Are you sure you want to trigger APPROVE execution for this record? This action cannot be reverted.`;
    if (actionType === 'REJECT') dynamicModalMsg = `Confirm absolute rejection for application context with explanation text: "${trackingComment}"?`;
    if (actionType === 'PASS_TO_ER') dynamicModalMsg = `Select the classification mapping before routing this request to the ER processing queue.`;

    setAdminDeductionSelection(isMedicalOrNoPay && actionType === 'PASS_TO_ER' ? 'CASUAL' : 'NONE');

    setConfirmModal({
      isOpen: true,
      title: actionType === 'PASS_TO_ER' ? 'Route to ER Processing' : `${actionType.replace('_', ' ')} Execution`,
      message: dynamicModalMsg,
      isMedicalForwardRoute: isMedicalOrNoPay && actionType === 'PASS_TO_ER',
      onConfirm: async (chosenDeduction = 'NONE') => {
        try {
          const res = await fetch(`${API_BASE_URL}/process-action/${id}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'X-User-Role': user?.role || '' 
            },
            body: JSON.stringify({ 
              action_type: actionType, 
              approver_id: String(user?.employee_id || '').trim(), 
              approver_name: user?.name || '', 
              leave_type: leaveType.trim(),
              comment: trackingComment,
              deduct_from: chosenDeduction 
            })
          });
          const data = await res.json();
          if (data.success) {
            fetchData(user);
            showToast(`Workflow successfully routed.`);
          } else {
            showToast(data.message, 'error');
          }
        } catch (err) {
          showToast("Failed to write state evaluation metrics to server", 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const isBalanceExceeded = useMemo(() => {
    const selectedType = formData.leaveType.trim().toUpperCase();
    if (selectedType === 'ANNUAL' && formData.totalDays > leaveBalance.annual) return true;
    if (selectedType === 'CASUAL' && formData.totalDays > leaveBalance.casual) return true;
    return false;
  }, [formData.leaveType, formData.totalDays, leaveBalance]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
      <p className="font-black italic text-gray-400">CONNECTING REAL-TIME LOGISTICS...</p>
    </div>
  );

  return (
    <div className="flex-1 bg-gray-50 min-h-screen p-4 md:p-10 font-sans">
      
      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 max-w-md w-full px-4">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] shadow-2xl border-2 bg-white ${
            notification.type === 'success' ? 'border-emerald-500 text-emerald-600' : 'border-red-500 text-red-600'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-[11px] font-black uppercase tracking-wider leading-tight">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Action Trigger Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl">
            <AlertCircle className="w-12 h-12 text-blue-600 mb-6" />
            <h3 className="text-2xl font-black text-gray-900 uppercase italic leading-none">{confirmModal.title}</h3>
            <p className="text-gray-400 text-xs font-bold mt-4 uppercase tracking-tight leading-relaxed">
              {confirmModal.message}
            </p>

            {confirmModal.isMedicalForwardRoute && (
              <div className="mt-6 p-5 bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in duration-300">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                  Classify Leave Allocation Target Type:
                </label>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 cursor-pointer group text-xs font-bold uppercase tracking-tight text-gray-700">
                    <input 
                      type="radio" 
                      name="deduction_override" 
                      value="CASUAL" 
                      checked={adminDeductionSelection === 'CASUAL'}
                      onChange={() => setAdminDeductionSelection('CASUAL')}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-500 border-gray-300" 
                    />
                    <span className="group-hover:text-amber-500 transition-colors">Classify as Casual Leave</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group text-xs font-bold uppercase tracking-tight text-gray-700">
                    <input 
                      type="radio" 
                      name="deduction_override" 
                      value="NO PAY" 
                      checked={adminDeductionSelection === 'NO PAY'}
                      onChange={() => setAdminDeductionSelection('NO PAY')}
                      className="w-4 h-4 text-red-500 focus:ring-red-500 border-gray-300" 
                    />
                    <span className="group-hover:text-red-500 transition-colors">Classify as Unpaid No-Pay Leave Row</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-10">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => confirmModal.onConfirm(adminDeductionSelection)} 
                className="flex-1 py-4 text-[10px] font-black uppercase text-white bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
              >
                Confirm Route Action
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-gray-900 uppercase">Leave Pipeline</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-md uppercase">{user?.role}</span>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">{user?.name} ({user?.employee_id})</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="bg-black text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95 uppercase tracking-tighter italic"
          >
            <Plus size={20} strokeWidth={4} /> New Application
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden group">
            <Calendar className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform" size={140} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">My Annual Rem.</p>
            <h3 className="text-6xl font-black italic tracking-tighter text-blue-600">{leaveBalance.annual}</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden group">
            <Clock className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform" size={140} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">My Casual Rem.</p>
            <h3 className="text-6xl font-black italic tracking-tighter text-amber-500">{leaveBalance.casual}</h3>
          </div>
          <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <ShieldCheck className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform text-white" size={140} />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Target Stream Feed</p>
            <h3 className="text-xl font-black italic text-white uppercase tracking-tighter mt-4 truncate">
              {applications.length > 0 ? `${applications.length} Active Records` : 'No Pending Actions'}
            </h3>
          </div>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-10 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Search size={12} strokeWidth={3} className="text-blue-600" /> Consolidated Employee Balance Matrix
                </p>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="ENTER TARGET EMPLOYEE ID (e.g., 1022)" 
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualAuditSearch()}
                    className="flex-1 px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold focus:border-blue-600 outline-none uppercase text-xs transition-all"
                  />
                  <button 
                    onClick={handleManualAuditSearch}
                    disabled={searchingAudit}
                    className="px-6 bg-black text-white text-[10px] font-black uppercase rounded-2xl tracking-wider hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center min-w-[100px]"
                  >
                    {searchingAudit ? <Loader2 className="animate-spin w-4 h-4" /> : 'Analyze'}
                  </button>
                </div>
              </div>

              {auditResults ? (
                <div className="mt-6 pt-6 border-t border-gray-50 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50/40 p-3 rounded-xl">
                      <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider block">Annual Rem.</span>
                      <span className="text-sm font-black text-blue-600">{auditResults.employeeBalances.annual_remaining} / {auditResults.employeeBalances.annual_allocated}</span>
                    </div>
                    <div className="bg-amber-50/40 p-3 rounded-xl">
                      <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider block">Casual Rem.</span>
                      <span className="text-sm font-black text-amber-500">{auditResults.employeeBalances.casual_remaining} / {auditResults.employeeBalances.casual_allocated}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider block">Historical Approved</span>
                      <span className="text-sm font-black text-gray-900">{auditResults.employeeBalances.total_approved_historical} Days</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] font-bold text-gray-300 uppercase italic mt-6">Awaiting pipeline verification index lookup...</p>
              )}
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Users size={12} strokeWidth={3} className="text-amber-500" /> Concurrent Operational Coverage Matrix
                </p>
                <input 
                  type="date" 
                  value={matrixDate}
                  onChange={(e) => {
                    setMatrixDate(e.target.value);
                    if(lookupId.trim()) executeAnalyticsLookup(lookupId, e.target.value);
                  }}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold focus:border-blue-600 outline-none text-xs text-gray-700 transition-all"
                />
              </div>

              <div className="mt-6 flex-1 flex flex-col justify-center">
                {checkingMatrix ? (
                  <div className="flex items-center justify-center gap-2 text-gray-400 text-[10px] font-black uppercase">
                    <Loader2 className="animate-spin w-4 h-4" /> Fetching coverage data...
                  </div>
                ) : matrixDate ? (
                  <div className={`border p-4 rounded-2xl text-center transition-all ${
                    conflictingStaff > 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50/50 border-emerald-100 text-emerald-600'
                  }`}>
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      {conflictingStaff > 0 ? `⚠️ Roster Impact Context: ${conflictingStaff} Staff Out` : '✅ 100% Core Coverage Guaranteed'}
                    </p>
                    <p className="text-[9px] font-bold opacity-80 uppercase mt-0.5">
                      {conflictingStaff > 0 ? 'Concurrent approved absences detected on this date' : 'No staff overlaps discovered along this calendar grid line'}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-gray-300 uppercase italic">Select date block vectors to calculate resource capacity.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 font-black text-[11px] text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-6 w-[100px]">Emp ID</th>
                  <th className="px-8 py-6 min-w-[160px]">Emp Name</th>
                  <th className="px-8 py-6 w-[140px]">Type</th>
                  <th className="px-8 py-6 min-w-[220px]">Duration</th>
                  <th className="px-8 py-6 w-[140px]">Project</th>
                  <th className="px-8 py-6 text-center w-[160px]">Current Status</th>
                  {isAdmin && <th className="px-8 py-6 text-center w-[200px]">Workflow Trigger Actions</th>}
                  <th className="px-8 py-6 min-w-[200px]">Comments / Docs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {applications.map((app) => {
                  const isCurrentMedicalOrNoPay = ['medical', 'no pay'].includes(app.leave_type.toLowerCase().trim());
                  const currentUserRole = user?.role?.toUpperCase();

                  return (
                    <tr key={app.id} className="hover:bg-blue-50/10 transition-colors align-middle text-sm font-bold text-gray-600">
                      <td className="px-8 py-6 font-mono text-gray-400 uppercase">{app.employee_id}</td>
                      <td className="px-8 py-6 font-black text-gray-900 uppercase text-base">{app.employee_name}</td>
                      
                      <td className="px-8 py-6">
                        <span className={`font-black uppercase text-xs ${
                          ['Medical', 'No Pay'].includes(app.leave_type) ? 'text-red-500' : 'text-blue-600'
                        }`}>{app.leave_type}</span>
                      </td>

                      <td className="px-8 py-6 font-semibold text-gray-500">
                        <span className="text-gray-900 font-extrabold">{app.number_of_days} Days</span>
                        <span className="block text-xs text-gray-400 italic mt-0.5">
                          ({new Date(app.start_date).toLocaleDateString()} - {new Date(app.end_date).toLocaleDateString()})
                        </span>
                      </td>

                      <td className="px-8 py-6">
                        <span className="font-extrabold text-xs uppercase text-blue-600">
                          {app.project_name?.toUpperCase() || 'GENERAL'}
                        </span>
                      </td>

                      <td className="px-8 py-6 text-center">
                        <span className={`inline-block px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${
                          app.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' :
                          app.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>{app.status.replace('_', ' ')}</span>
                      </td>

                      {isAdmin && (
                        <td className="px-8 py-6 text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            {!['Approved', 'Rejected'].includes(app.status) ? (
                              <>
                                <button 
                                  onClick={() => {
                                    setLookupId(app.employee_id);
                                    setMatrixDate(app.start_date);
                                    executeAnalyticsLookup(app.employee_id, app.start_date);
                                    showToast(`Analyzing schedule metrics for ${app.employee_name}...`);
                                  }} 
                                  title="Inspect Availability"
                                  className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-blue-600 hover:scale-110 transition-all shadow-md"
                                >
                                  <Search size={14} strokeWidth={3} />
                                </button>

                                {currentUserRole === 'ADMIN' && isCurrentMedicalOrNoPay ? (
                                  <button 
                                    onClick={() => processWorkflowAction(app.id, 'PASS_TO_ER', app.leave_type)}
                                    title="Route Options to ER Processing Layer"
                                    className="p-1.5 bg-amber-500 text-white rounded-lg hover:scale-110 transition-all shadow-md flex items-center gap-1 px-2.5"
                                  >
                                    <span className="text-[9px] font-black uppercase tracking-tight">ER Route</span>
                                    <ArrowRight size={12} strokeWidth={4} />
                                  </button>
                                ) : (
                                  <>
                                    {currentUserRole === 'ADMIN' && app.status === 'Pending_Admin' && (
                                      <button 
                                        onClick={() => processWorkflowAction(app.id, 'PASS_TO_ER', app.leave_type)}
                                        title="Forward to ER Routing Layer"
                                        className="p-1.5 bg-amber-500 text-white rounded-lg hover:scale-110 transition-all shadow-md flex items-center"
                                      >
                                        <ArrowRight size={14} strokeWidth={4} />
                                      </button>
                                    )}

                                    {currentUserRole !== 'ADMIN' && (
                                      <button 
                                        onClick={() => processWorkflowAction(app.id, 'APPROVE', app.leave_type)} 
                                        title="Approve Application"
                                        className="p-1.5 bg-green-500 text-white rounded-lg hover:scale-110 transition-all shadow-md"
                                      >
                                        <Check size={14} strokeWidth={4} />
                                      </button>
                                    )}
                                  </>
                                )}

                                <button 
                                  onClick={() => processWorkflowAction(app.id, 'REJECT', app.leave_type)}
                                  title="Reject Application"
                                  className="p-1.5 bg-red-500 text-white rounded-lg hover:scale-110 transition-all shadow-md"
                                >
                                  <X size={14} strokeWidth={4} />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider italic flex items-center gap-1 justify-center">
                                <ShieldCheck size={12} /> Closed
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      <td className="px-8 py-6 max-w-xs truncate">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs text-gray-700 font-bold">{app.reason || 'No statement provided.'}</p>
                          {app.reject_reason && (
                            <p className="text-[10px] text-red-500 font-extrabold uppercase">
                              Rejection Node Note: {app.reject_reason}
                            </p>
                          )}
                          {app.attachment_url && (
                            <a 
                              href={`${BASE_SERVER_URL}${app.attachment_url}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-blue-600 hover:underline text-[10px] uppercase font-black flex items-center gap-1 mt-1"
                            >
                              <Paperclip size={10} strokeWidth={3} /> View Attached File Docs
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Leave Application Input Modal Form */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-8 md:p-12 max-w-lg w-full shadow-2xl relative my-8 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <X size={18} strokeWidth={3} />
            </button>
            
            <h2 className="text-3xl font-black italic tracking-tighter uppercase text-gray-900 mb-8">Create Leave Order</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Leave Category</label>
                <select 
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent font-bold text-xs uppercase rounded-2xl focus:border-blue-600 outline-none transition-all text-gray-700"
                >
                  {leaveOptions.map(opt => <option key={opt} value={opt}>{opt} Allocation</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">From Date</label>
                  <input 
                    type="date" 
                    value={formData.fromDate}
                    onChange={(e) => handleDateChange('fromDate', e.target.value)}
                    required
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent font-bold text-xs text-gray-700 rounded-2xl focus:border-blue-600 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">To Date</label>
                  <input 
                    type="date" 
                    value={formData.toDate}
                    onChange={(e) => handleDateChange('toDate', e.target.value)}
                    required
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent font-bold text-xs text-gray-700 rounded-2xl focus:border-blue-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Continuous Window</span>
                <span className={`text-xl font-black italic ${isBalanceExceeded ? 'text-red-500' : 'text-blue-600'}`}>
                  {formData.totalDays} Days Calculated
                </span>
              </div>

              {isBalanceExceeded && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                  <AlertCircle size={14} className="flex-shrink-0" /> Target timeframe bounds exceed current personal balance counters
                </div>
              )}

              {formData.leaveType === 'Medical' && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Upload Validation Docs (PDF/JPG required)
                  </label>
                  <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-blue-500 transition-colors">
                    <input 
                      type="file" 
                      accept=".pdf, .jpg, .jpeg, .png"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-1">
                      <FileText className="w-6 h-6 text-gray-400" />
                      <span className="text-[11px] font-bold text-gray-500 truncate max-w-xs">
                        {selectedFile ? selectedFile.name : 'Select or drop validation file here'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Justification Statement</label>
                <textarea 
                  rows={3}
                  placeholder="PROVIDE OPERATIONAL COGNIZANT CONTEXT DETAILS..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent font-bold text-xs rounded-2xl focus:border-blue-600 outline-none transition-all uppercase text-gray-700"
                />
              </div>

              <button 
                type="submit"
                disabled={submitting || isBalanceExceeded}
                className="w-full bg-black text-white font-black uppercase italic tracking-tight text-sm py-5 rounded-2xl shadow-xl hover:bg-blue-600 disabled:bg-gray-100 disabled:text-gray-300 disabled:scale-100 active:scale-98 transition-all flex justify-center items-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Dispatch Assignment To Pipeline'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}