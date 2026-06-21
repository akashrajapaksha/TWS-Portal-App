import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCcw, MessageSquare, Lightbulb, HelpCircle, CheckCircle2 } from 'lucide-react';

type Category = 'Comments' | 'Suggestions' | 'Questions';

interface FeedbackFormProps {
  userRole?: string;
  userData?: {
    id?: number;          // Internal database row identifier
    user_id?: number;     // Alternate fallback identifier
    name: string;
    employee_id: string;  // Institutional text ID format (e.g., '1006')
  };
}

export function FeedbackForm({ userRole = 'Employees', userData }: FeedbackFormProps) {
  // Evaluates roles contextually matching the structural setup across operational views
  const isPrivilegedAdmin = ['SUPER ADMIN', 'ER', 'ADMIN', 'SUPERVISORS'].includes(userRole.toUpperCase().trim());
  const API_BASE = 'http://localhost:5000/api/feedback';

  // --- States ---
  const [category, setCategory] = useState<Category>('Comments');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  // --- Helpers ---
  const renderCategoryBadge = (cat: string) => {
    const cleanCat = (cat || 'Comments').trim();
    const styles: Record<string, string> = {
      Questions: "bg-blue-100 text-blue-700 border-blue-200",
      Suggestions: "bg-amber-100 text-amber-700 border-amber-200",
      Comments: "bg-gray-100 text-gray-700 border-gray-200"
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${styles[cleanCat] || styles.Comments}`}>
        {cleanCat}
      </span>
    );
  };

  // --- Actions: Admin ---
  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/all`);
      const data = await res.json();
      
      // Handles both direct array fallback formats or standard object response payloads
      if (Array.isArray(data)) {
        setFeedbacks(data);
      } else if (data && Array.isArray(data.feedback)) {
        setFeedbacks(data.feedback);
      } else {
        setFeedbacks([]);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    if (isPrivilegedAdmin) {
      fetchFeedbacks();
    }
  }, [isPrivilegedAdmin, fetchFeedbacks]);

  const handleMarkAsRead = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/mark-as-read/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        await fetchFeedbacks();
      }
    } catch (err) {
      console.error("Update failed.");
    }
  };

  // --- Actions: Employee ---
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    // 1. Log to inspect object keys if the backend ever returns identity faults
    console.log("🔍 Current userData payload structure:", userData);

    // 2. Multi-tiered extraction to resolve correct user tracking primary keys
    const dbRecordId = userData?.id || 
                       userData?.user_id || 
                       (userData as any)?.employee_database_id || 
                       userData?.employee_id; 

    if (!dbRecordId) {
      console.error("❌ Authentication Error: No valid identifier found in props.");
      alert("Session issue: Could not verify your identity. Please log out and log back in.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: dbRecordId,
          employee_name: userData?.name || 'Unknown Employee',
          category,
          description
        }),
      });

      if (res.ok) {
        setDescription('');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        const errorData = await res.json();
        console.error("Submission failed on backend:", errorData.error);
      }
    } catch (err) {
      console.error("Submission network error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- VIEW: PRIVILEGED MANAGEMENT ---
  if (isPrivilegedAdmin) {
    return (
      <div className="p-8 bg-white min-h-screen font-sans">
        <div className="mb-10 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black italic text-gray-900 uppercase tracking-tighter">Feedback Inbox</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Manage and resolve incoming organizational submissions.</p>
          </div>
          <button onClick={fetchFeedbacks} className="flex items-center gap-2 px-6 py-3.5 bg-black text-white rounded-xl text-xs font-black italic tracking-tighter hover:bg-blue-600 transition-all active:scale-95 shadow-xl uppercase">
            <RefreshCcw size={14} strokeWidth={3} /> REFRESH DATA
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Employee</th>
                    <th className="px-8 py-5 text-center">Category</th>
                    <th className="px-8 py-5 w-1/2">Message</th>
                    <th className="px-8 py-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {feedbacks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-xs font-bold text-gray-300 uppercase tracking-widest italic">
                        No feedback entries currently log-mapped.
                      </td>
                    </tr>
                  ) : (
                    feedbacks.map((f) => (
                      <tr key={f.id} className={`${f.status === 'read' ? 'bg-gray-50/50 opacity-50' : 'bg-white hover:bg-blue-50/10 transition-colors'}`}>
                        <td className="px-8 py-5">
                          <div className="text-sm font-black text-gray-900 uppercase tracking-tighter">
                            {f.employee_name || 'Unknown'} 
                          </div>
                          <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">
                            ID: {f.employee_id}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">{renderCategoryBadge(f.category)}</td>
                        <td className="px-8 py-5 text-sm text-gray-600 italic leading-relaxed whitespace-pre-wrap">"{f.description}"</td>
                        <td className="px-8 py-5 text-center">
                          {f.status === 'read' ? (
                            <span className="inline-block text-[9px] font-black text-green-600 tracking-widest bg-green-50 px-4 py-2 rounded-xl border-2 border-green-100 cursor-default select-none uppercase">
                              READ
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleMarkAsRead(f.id)}
                              className="text-[9px] font-black text-red-600 tracking-widest bg-red-50 px-4 py-2 rounded-xl border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all cursor-pointer active:scale-95 uppercase"
                            >
                              NOT READ
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VIEW: STANDARD SUBMISSION ENTRY ---
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* REALISTIC TOAST NOTIFICATION */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 transform ${
        showToast ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'
      }`}>
        <div className="bg-gray-900 text-white px-8 py-5 rounded-[1.5rem] shadow-2xl flex items-center gap-4 border border-gray-800">
          <div className="bg-green-500 p-1 rounded-full">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider">Feedback Submitted!</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">Thank you for your valuable input.</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl p-12 border border-gray-100">
        <h2 className="text-4xl font-black italic text-gray-900 mb-1 uppercase tracking-tighter">Feedback</h2>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-10">Choose a category and share your thoughts.</p>
        
        <form onSubmit={handleSubmitFeedback} className="space-y-8">
          <div className="grid grid-cols-3 gap-3">
            {(['Comments', 'Suggestions', 'Questions'] as Category[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCategory(type)}
                className={`flex flex-col items-center gap-2 py-6 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${
                  category === type 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.02]' 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                }`}
              >
                {type === 'Comments' && <MessageSquare size={18} />}
                {type === 'Suggestions' && <Lightbulb size={18} />}
                {type === 'Questions' && <HelpCircle size={18} />}
                <span className="mt-1">{type}</span>
              </button>
            ))}
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what's on your mind..."
            rows={5}
            className="w-full bg-gray-50 border-none rounded-3xl p-8 text-sm outline-none focus:ring-4 focus:ring-blue-50/50 resize-none transition-all placeholder:text-gray-300 font-medium"
          />

          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className={`w-full py-6 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] italic transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
              isSubmitting ? 'bg-gray-400 text-white shadow-none' : 'bg-black text-white hover:bg-blue-600 shadow-blue-50'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 size={16} className="animate-spin" />
                SENDING PIPELINE...
              </div>
            ) : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}