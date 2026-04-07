import { useState } from 'react';
import { 
  LayoutDashboard, 
  Building2,
  ChevronRight,
  ChevronDown,
  LogOut,
  Users,
  ChartBar,
  Calendar,
  FileText,
  MessageSquarePlus,
  AlertCircle,
  BarChart3 // Added for Analyzing icon
} from 'lucide-react';

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
  onLogout?: () => void; 
  isCollapsed?: boolean;
  employeeName?: string;
  employeeDesignation?: string; 
  employeeInitials?: string;
}

interface SubMenuItem {
  id: string;
  label: string;
  visible: boolean;
}

interface MenuItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  visible: boolean;
  subItems?: SubMenuItem[];
}

export function Sidebar({ 
  activeItem = 'dashboard', 
  onItemClick, 
  onLogout, 
  isCollapsed = false,
  employeeName = "Admin TWS",
  employeeDesignation = "Employees", 
  employeeInitials = ""
}: SidebarProps) {
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['performance']);

  // --- ROLE LOGIC ---
  const userRole = employeeDesignation?.toUpperCase().trim();
  
  const isSuperAdmin = userRole === 'SUPER ADMIN';
  const isSupervisor = userRole === 'SUPERVISORS'; 
  const isLD = userRole === 'LD';
  
  const isAuthority = [
    'SUPER ADMIN', 'ADMIN', 'SUPERVISORS', 'ER', 'TSP', 'LD'
  ].includes(userRole || '');

  const canSeeOrganization = isAuthority && !isSupervisor && !isLD;
  const canAccessLogs = isSuperAdmin;
  const canSeeAnalyzing = isSuperAdmin; // Control visibility for Analyzing
  const canSeeFeedback = true;

  const menuItems: MenuItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', visible: true },
    { 
      id: 'organization', 
      icon: Building2, 
      label: 'Organization',
      visible: canSeeOrganization, 
      subItems: [
        { id: 'departments', label: 'Departments', visible: true },
        { id: 'projects', label: 'Projects', visible: true },
        { id: 'employees', label: 'Employees', visible: true },
      ]
    },
    { 
      id: 'performance', 
      icon: ChartBar, 
      label: 'Performance',
      visible: true, 
      subItems: [
        { id: 'add-order', label: 'Add Order', visible: isAuthority }, 
        { id: 'add-mistakes', label: 'Add Mistakes', visible: isAuthority }, 
        { id: 'bonus-calculation', label: 'Bonus Calculation', visible: true }, 
        { id: 'reports', label: 'Reports', visible: isAuthority }, 
        { id: 'ir', label: 'IR (Incident Report)', visible: true }, 
        { id: 'warning-letter', label: 'Warning Letter', visible: true }, 
      ]
    },
    { 
      id: 'attendance', 
      icon: Calendar, 
      label: 'Attendance',
      visible: true, 
      subItems: [
        { id: 'leaves', label: 'Leaves', visible: true },
      ]
    },
    { id: 'feedback', icon: MessageSquarePlus, label: 'Feedback Form', visible: canSeeFeedback },
    { 
      id: 'logs', 
      icon: FileText, 
      label: 'Logs',
      visible: canAccessLogs, 
      subItems: [
        { id: 'login-logs', label: 'Login Logs', visible: true },
        { id: 'leave-logs', label: 'Leave Logs', visible: true },
        { id: 'other-logs', label: 'Other Logs', visible: true },
      ]
    },
    // ✅ ADDED: Analyzing Menu Item
    { 
      id: 'analyzing', 
      icon: BarChart3, 
      label: 'Analyzing', 
      visible: canSeeAnalyzing 
    },
  ];

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleItemClick = (itemId: string, hasSubItems: boolean) => {
    if (hasSubItems) {
      toggleExpand(itemId);
    } else {
      onItemClick?.(itemId);
    }
  };

  return (
    <>
      <aside className={`w-[280px] bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-300 ${isCollapsed ? 'hidden' : 'block'}`}>
        
        {/* User Profile Section */}
        <div className="p-6">
          <div className="bg-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-200/50">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-inner italic">
              {employeeInitials || <Users className="w-5 h-5" />}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-gray-900 text-sm truncate leading-tight uppercase italic" title={employeeName}>
                  {employeeName}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-indigo-500 font-black mt-0.5">
                  {employeeDesignation}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            if (!item.visible) return null;

            const Icon = item.icon;
            const isActive = activeItem === item.id;
            const isExpanded = expandedItems.includes(item.id);
            const visibleSubItems = item.subItems?.filter(sub => sub.visible) || [];
            const hasSubItems = visibleSubItems.length > 0;
            
            return (
              <div key={item.id} className="mb-1">
                <button
                  onClick={() => handleItemClick(item.id, hasSubItems)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : ''}`} />
                    <span className={`text-[11px] uppercase tracking-wider font-bold ${isActive ? 'text-indigo-700' : ''}`}>{item.label}</span>
                  </div>
                  {hasSubItems && (
                    isExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />
                  )}
                </button>

                {hasSubItems && isExpanded && (
                  <div className="ml-9 mt-1 space-y-1 border-l-2 border-gray-100">
                    {visibleSubItems.map((subItem) => {
                      const isSubActive = activeItem === subItem.id;
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => onItemClick?.(subItem.id)}
                          className={`w-full text-left px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all duration-200 ${
                            isSubActive
                              ? 'text-indigo-600 bg-indigo-50/50'
                              : 'text-gray-400 hover:text-gray-900 hover:translate-x-1'
                          }`}
                        >
                          {subItem.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-rose-500 hover:bg-rose-50 font-bold text-[11px] uppercase tracking-widest"
          >
            <LogOut className="w-5 h-5" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* CUSTOM LOGOUT MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 uppercase italic">Logout</h3>
            <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-tight">Are you sure you want to end your active session?</p>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                className="flex-1 py-3 text-xs font-bold uppercase text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
              >
                Stay
              </button>
              <button 
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout?.();
                }} 
                className="flex-1 py-3 text-xs font-bold uppercase bg-rose-600 text-white hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}