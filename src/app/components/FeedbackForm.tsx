import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCcw, MessageSquare, Lightbulb, HelpCircle, CheckCircle2 } from 'lucide-react';

type Category = 'Comments' | 'Suggestions' | 'Questions';

interface FeedbackFormProps {
  userRole?: string;
  userData?: {
    name: string;
    employee_id: string;
  };
}

export function FeedbackForm({ userRole = 'Employees', userData }: FeedbackFormProps) {
  const isSuperAdmin = userRole.toUpperCase().trim() === 'SUPER ADMIN';
  const API_BASE = 'http://localhost:5000/api/feedback';

  // --- States ---
  const [category, setCategory] = useState<Category>('Comments');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  // --- Actions: Admin ---
  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/all`);
      const data = await res.json();
      setFeedbacks(data);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchFeedbacks();
  }, [isSuperAdmin]);

  const handleMarkAsRead = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/mark-as-read/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) await fetchFeedbacks();
    } catch (err) {
      console.error("Update failed.");
    }
  };

  // --- Actions: Employee ---
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: userData?.employee_id,
          employee_name: userData?.name,
          category,
          description
        }),
      });

      if (res.ok) {
        setDescription('');
        // Show modern toast instead of browser alert
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error("Submission error");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // --- VIEW: SUPER ADMIN ---
  if (isSuperAdmin) {
    return (
      <div className="p-8 bg-white min-h-screen">
        <div className="mb-10 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Feedback Inbox</h2>
            <p className="text-sm text-gray-400 mt-1">Manage and respond to team feedback.</p>
          </div>
          <button onClick={fetchFeedbacks} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all active:scale-95 shadow-lg">
            <RefreshCcw size={14} /> REFRESH
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Category</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/2">Message</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {feedbacks.map((f) => (
                  <tr key={f.id} className={`${f.status === 'read' ? 'bg-gray-50/50 opacity-60' : 'bg-white hover:bg-gray-50/30 transition-colors'}`}>
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-gray-900">{f.employee_name}</div>
                      <div className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">{f.employee_id}</div>
                    </td>
                    <td className="px-8 py-5 text-center">{renderCategoryBadge(f.category)}</td>
                    <td className="px-8 py-5 text-sm text-gray-600 italic leading-relaxed whitespace-pre-wrap">"{f.description}"</td>
                    <td className="px-8 py-5 text-center">
                      {f.status === 'read' ? (
                        <span className="inline-block text-[10px] font-black text-green-600 tracking-widest bg-green-50 px-4 py-2 rounded-lg border border-green-100 cursor-default select-none">
                          READ
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleMarkAsRead(f.id)}
                          className="text-[10px] font-black text-red-600 tracking-widest bg-red-50 px-4 py-2 rounded-lg border border-red-100 hover:bg-red-600 hover:text-white transition-all cursor-pointer active:scale-95"
                        >
                          NOT READ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // --- VIEW: EMPLOYEE ---
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* REALISTIC TOAST NOTIFICATION */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 transform ${
        showToast ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'
      }`}>
        <div className="bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-gray-700">
          <div className="bg-green-500 p-1 rounded-full">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold">Feedback Submitted!</span>
            <span className="text-[10px] text-gray-400">Thank you for your valuable input.</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-xl p-12 border border-white">
        <h2 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Feedback</h2>
        <p className="text-gray-400 text-sm mb-10 font-medium">Choose a category and share your thoughts.</p>
        
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
                {type === 'Comments' && <MessageSquare size={18}/>}
                {type === 'Suggestions' && <Lightbulb size={18}/>}
                {type === 'Questions' && <HelpCircle size={18}/>}
                <span className="mt-1">{type}</span>
              </button>
            ))}
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what's on your mind..."
            rows={5}
            className="w-full bg-gray-50 border-none rounded-3xl p-8 text-sm outline-none focus:ring-4 focus:ring-blue-50 resize-none transition-all placeholder:text-gray-300"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSubmitting ? 'bg-gray-400 text-white' : 'bg-gray-900 text-white hover:bg-blue-600'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 size={16} className="animate-spin" />
                SENDING...
              </div>
            ) : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}