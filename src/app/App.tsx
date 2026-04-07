import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { DashboardContent } from './components/DashboardContent';
import { Departments } from './components/Departments';
import { Projects } from './components/Projects'; 
import { Employees } from './components/Employees';
import { AddOrder } from './components/AddOrder';
import { AddMistakes } from './components/AddMistakes';
import { BonusCalculation } from './components/BonusCalculation';
import { Reports } from './components/Reports';
import { Leaves } from './components/Leaves';
import { LoginLogs } from './components/LoginLogs';
import { LeaveLogs } from './components/LeaveLogs';
import { OtherLogs } from './components/OtherLogs';
import { Login } from './components/Login'; 
import { IncidentReports } from './components/IncidentReports';
import { WarningLetters } from './components/WarningLetters';
import { FeedbackForm } from './components/FeedbackForm';
import { Analyzing } from './components/Analyzing';
import { Loader2 } from 'lucide-react';

// --- FESTIVAL ANIMATION COMPONENT ---
const NewYearAnimation = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show around April 11th - April 16th, 2026
    const now = new Date();
    const isMarch = now.getMonth() === 2; // 0-indexed, 3 is April
    const isToday = now.getDate() >= 17 && now.getDate() <= 16;
    if (isMarch && isToday) setShow(true);
  }, []);

  if (!show) return null;

  const items = Array.from({ length: 12 });
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {items.map((_, i) => (
        <div 
          key={i} 
          className="absolute text-2xl animate-fall"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 6}s`,
            top: '-50px'
          }}
        >
          {i % 2 === 0 ? '🌸' : '🍃'}
        </div>
      ))}
    </div>
  );
};

interface UserData {
  id: string;
  name: string;
  role: string;          
  initials: string;
  employee_id: string;
}

export default function App() {
  const [activeMenuItem, setActiveMenuItem] = useState(() => {
    return sessionStorage.getItem('tws_active_menu') || 
           localStorage.getItem('tws_active_menu') || 
           'dashboard';
  });

  const [userData, setUserData] = useState<UserData | null>(() => {
    const saved = sessionStorage.getItem('tws_user') || localStorage.getItem('tws_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          id: parsed.id,
          name: parsed.name,
          role: parsed.role,
          initials: parsed.initials,
          employee_id: parsed.employee_id
        };
      } catch (err) {
        console.error("Session parse error", err);
        return null;
      }
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(!!userData);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 768);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMenuItemClick = (itemId: string) => {
    setActiveMenuItem(itemId);
    sessionStorage.setItem('tws_active_menu', itemId);
    localStorage.setItem('tws_active_menu', itemId);
    
    if (window.innerWidth < 768) {
      setIsSidebarCollapsed(true);
    }
  };

  const handleMenuToggle = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const handleLoginSuccess = () => {
    const savedUser = sessionStorage.getItem('tws_user') || localStorage.getItem('tws_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUserData({
        id: parsedUser.id,
        name: parsedUser.name,
        role: parsedUser.role,
        initials: parsedUser.initials,
        employee_id: parsedUser.employee_id
      });
      setIsAuthenticated(true);
      setActiveMenuItem('dashboard');
      sessionStorage.setItem('tws_active_menu', 'dashboard');
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    if (userData) {
      try {
        await fetch('http://localhost:5000/api/logs/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_id: userData.employee_id }),
        });
      } catch (err) {
        console.error("Logout log failed:", err);
      }
    }
    sessionStorage.clear();
    localStorage.removeItem('tws_user');
    localStorage.removeItem('tws_active_menu');
    setUserData(null);
    setIsAuthenticated(false);
    setActiveMenuItem('dashboard');
    setIsLoggingOut(false);
  };

  const renderContent = () => {
    const role = userData?.role || 'Employees';
    const isLogPage = ['login-logs', 'leave-logs', 'other-logs', 'analyzing'].includes(activeMenuItem);
    const hasLogAccess = ['Super Admin', 'ER'].includes(role);

    if (isLogPage && !hasLogAccess) {
      return <DashboardContent employeeName={userData?.name} employeeId={userData?.employee_id} employeeInitials={userData?.initials} userRole={role} />;
    }

    switch (activeMenuItem) {
      case 'dashboard': return <DashboardContent employeeName={userData?.name} employeeId={userData?.employee_id} employeeInitials={userData?.initials} userRole={role} />;
      case 'departments': return <Departments />;
      case 'projects': return <Projects />;
      case 'employees': return <Employees />;
      case 'add-order': return <AddOrder />;
      case 'add-mistakes': return <AddMistakes />;
      case 'bonus-calculation': return <BonusCalculation />; 
      case 'reports': return <Reports />;
      case 'ir': return <IncidentReports />;
      case 'warning-letter': return <WarningLetters />;
      case 'leaves': return <Leaves />;
      case 'login-logs': return <LoginLogs />;
      case 'leave-logs': return <LeaveLogs />;
      case 'other-logs': return <OtherLogs />;
      case 'analyzing': return <Analyzing />; 
      case 'feedback': return <FeedbackForm userRole={role} userData={userData ? { name: userData.name, employee_id: userData.employee_id } : undefined} />;
      default: return <DashboardContent employeeName={userData?.name} userRole={role} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isSuperAdmin = userData?.role === 'Super Admin';
  const isFeedbackPage = activeMenuItem === 'feedback';
  const isEmployeeFeedbackView = isFeedbackPage && !isSuperAdmin;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-gray-50 font-sans antialiased overflow-hidden">
      
      {/* 1. Festive Animation Overlay */}
      <NewYearAnimation />

      {isLoggingOut && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[200] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-900">Terminating Session...</p>
          </div>
        </div>
      )}

      <TopNav onMenuClick={handleMenuToggle} isSidebarCollapsed={isSidebarCollapsed} onLogout={handleLogout} />
      
      <div className="flex flex-1 overflow-hidden relative">
        
        {!isSidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}

        <div className={`
          fixed md:relative z-40 h-full transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-[280px]'}
        `}>
          <Sidebar 
            activeItem={activeMenuItem} 
            onItemClick={handleMenuItemClick}
            onLogout={handleLogout}
            isCollapsed={isSidebarCollapsed}
            employeeName={userData?.name}
            employeeDesignation={userData?.role} 
            employeeInitials={userData?.initials}
          />
        </div>
        
        <main className={`flex-1 flex flex-col min-w-0 overflow-hidden relative transition-colors duration-300 ${isEmployeeFeedbackView ? 'bg-gray-50' : 'bg-white'}`}>
          <div className="flex-1 overflow-y-auto scrolling-touch p-2 md:p-0">
            {renderContent()}
          </div>
          
          <footer className="h-10 border-t flex items-center justify-center pointer-events-none select-none bg-white border-gray-100 px-4">
             <p className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-gray-400 text-center">
                INTERNAL SYSTEM DEVELOPED BY IT DEPARTMENT SRI LANKA 2026
             </p>
          </footer>
        </main>
      </div>
    </div>
  );
}