import React, { useState, useEffect } from 'react';
import { LogIn, Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft, CheckCircle2, Smartphone, ShieldAlert } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: password.trim() }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setTempUser(result.user);
        if (result.require2FA) setShow2FA(true);
        else if (result.user.is_first_login) setMustChangePassword(true);
        else {
          localStorage.setItem('tws_user', JSON.stringify(result.user));
          onLoginSuccess();
        }
      } else {
        setError(result.message || 'Access Denied: Invalid Credentials');
      }
    } catch (err) {
      setError('System Error: Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: tempUser.employee_id, token: otpToken.trim() }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        // REDESIGNED MESSAGE: Identity Verified - (Role) - (Name)
        const userRole = result.user.role || 'Personnel';
        const userName = result.user.name || result.user.full_name || 'User';
        setSuccessMsg(`Identity Verified - ${userRole} - ${userName}`);

        if (result.user.is_first_login) {
          setTempUser(result.user);
          setMustChangePassword(true);
          setShow2FA(false);
        } else {
          localStorage.setItem('tws_user', JSON.stringify(result.user));
          // Increased timeout to 1.5s so user can read their details
          setTimeout(() => onLoginSuccess(), 1500);
        }
      } else {
        setError(result.message || "Invalid Security Code.");
      }
    } catch (err) {
      setError("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employee_id: tempUser.employee_id, 
          currentPassword: password, 
          newPassword: newPassword.trim() 
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setSuccessMsg("Credentials Secured!");
        localStorage.setItem('tws_user', JSON.stringify({ ...tempUser, is_first_login: false }));
        setTimeout(() => onLoginSuccess(), 1000);
      } else {
        setError(result.message || 'Failed to update credentials.');
      }
    } catch (err) {
      setError('Connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 relative overflow-hidden font-sans text-gray-900">
      
      {/* Success Notification */}
      {successMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 px-8 py-4 rounded-2xl shadow-2xl border border-emerald-100 bg-white text-emerald-600 whitespace-nowrap">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-[0.1em]">{successMsg}</span>
          </div>
        </div>
      )}

      {/* Aesthetic Background */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-gray-100">
          
          <div className="text-center mb-10">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-lg mb-6 text-white transition-all duration-500 ${show2FA ? 'bg-blue-600' : mustChangePassword ? 'bg-orange-500' : 'bg-indigo-600'}`}>
              {show2FA ? <Smartphone className="w-10 h-10" /> : mustChangePassword ? <ShieldCheck className="w-10 h-10" /> : <LogIn className="w-10 h-10" />}
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-800">
              {show2FA ? 'Identity Verification' : mustChangePassword ? 'Update Security' : 'TWS Portal Access'}
            </h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
              {show2FA ? 'Verification required' : mustChangePassword ? 'Personalize your key' : 'Authorized Personnel Only'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-start gap-3 text-red-700 animate-shake">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-tight">{error}</p>
            </div>
          )}

          {/* SCREEN 1: LOGIN FORM */}
          {!show2FA && !mustChangePassword && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-2 ml-1 uppercase tracking-widest">Email</label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  disabled={isLoading} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="login-input px-5"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-2 ml-1 uppercase tracking-widest">Password</label>
                <div className="relative group flex items-center">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    disabled={isLoading} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="login-input pl-5 pr-12"
                    autoComplete="current-password"
                  />
                  <button 
                    type="button" 
                    tabIndex={-1} 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 text-gray-400 hover:text-indigo-600 z-20"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button disabled={isLoading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase py-4 rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 tracking-[0.2em]">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
              </button>
            </form>
          )}

          {/* SCREEN 2: OTP VERIFICATION */}
          {show2FA && (
            <form onSubmit={handleOtpVerify} className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl text-center">
                    <p className="text-[11px] font-black text-blue-700 uppercase mb-1">Authorization Required</p>
                    <p className="text-[10px] text-blue-500 font-bold leading-relaxed">Please contact the Admin for your code.</p>
                </div>
                <div>
                    <label className="block text-center text-[10px] font-black text-gray-500 mb-3 uppercase tracking-widest">Security Code</label>
                    <input type="text" maxLength={6} required autoFocus value={otpToken} onChange={(e) => setOtpToken(e.target.value.replace(/\D/g,''))} className="login-input text-center text-3xl font-mono tracking-[0.5em] py-5 border-blue-200" />
                </div>
                <div className="flex flex-col gap-3">
                    <button disabled={isLoading} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase py-4 rounded-2xl shadow-md active:scale-95 flex items-center justify-center gap-2 tracking-[0.2em]">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Access'}
                    </button>
                    <button type="button" onClick={() => setShow2FA(false)} className="w-full text-[10px] font-bold text-gray-400 uppercase flex items-center justify-center gap-1 hover:text-gray-600">
                        <ArrowLeft className="w-3 h-3" /> Back to Login
                    </button>
                </div>
            </form>
          )}

          {/* SCREEN 3: PASSWORD CHANGE */}
          {mustChangePassword && (
            <form onSubmit={handleForceChange} className="space-y-5">
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl mb-4 text-center">
                  <p className="text-[10px] font-black text-orange-700 uppercase">First Time Login</p>
                  <p className="text-[9px] text-orange-600 font-bold mt-1">Please update your password to continue.</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">New Password</label>
                <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="login-input px-5" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Confirm New Password</label>
                <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="login-input px-5" />
              </div>
              <button disabled={isLoading} type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black uppercase py-4 rounded-2xl shadow-md active:scale-95 flex items-center justify-center gap-2 tracking-[0.2em]">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure & Proceed'}
              </button>
            </form>
          )}

          <p className="mt-10 text-center text-[9px] font-bold text-gray-300 uppercase tracking-[0.25em] leading-loose">
            INTERNAL SYSTEM DEVELOPED BY IT DEPARTMENT SRI LANKA {new Date().getFullYear()}
          </p>
        </div>
      </div>

      <style>{`
        .login-input { width: 100%; padding: 1rem; background-color: #fcfcfd; border: 1.5px solid #f1f1f4; border-radius: 1rem; outline: none; transition: all 0.2s; font-size: 13px; font-weight: 700; color: #1a1a1a; position: relative; z-index: 5;}
        .login-input:focus { border-color: #4f46e5; background-color: white; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.04); }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(20px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #fcfcfd inset !important;
          -webkit-text-fill-color: #1a1a1a !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}