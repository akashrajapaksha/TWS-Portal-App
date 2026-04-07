import { useState } from 'react';
import { Menu, X, LogOut, AlertCircle } from 'lucide-react';

interface TopNavProps {
  onMenuClick?: () => void;
  isSidebarCollapsed?: boolean;
  onLogout?: () => void;
}

export function TopNav({ onMenuClick, isSidebarCollapsed = false, onLogout }: TopNavProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirmLogout = () => {
    setShowConfirm(false);
    onLogout?.();
  };

  return (
    <>
      <header className="h-16 bg-slate-700 flex items-center justify-between px-6 shadow-md relative z-40">
        {/* Left side - Logo and Portal Name */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label="Toggle Menu"
          >
            {isSidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <span className="text-slate-700 font-bold text-lg">T</span>
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-white text-lg md:text-xl font-semibold tracking-wide leading-none">
                TWS Portal
              </div>
              {/* NEW YEAR GREETINGS */}
              {/* <div className="text-[9px] md:text-[11px] text-yellow-400 font-medium flex gap-2 mt-1">
                <span>සුබ අලුත් අවුරුද්දක් වේවා!</span>
                <span className="opacity-50">|</span>
                <span>இனிய புத்தாண்டு நல்வாழ்த்துக்கள்!</span>
              </div> */}
            </div>
          </div>
        </div>

        {/* Right side - User Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 bg-slate-600 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* --- CUSTOM LOGOUT CONFIRMATION MODAL --- */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-50 p-3 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Logout</h3>
            </div>
            
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to logout? Any unsaved changes may be lost.
            </p>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-sm transition-colors"
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