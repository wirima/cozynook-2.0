
import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: 'login' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });

        if (signUpError) throw signUpError;

        // Create profile record
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              full_name: fullName,
              role: UserRole.GUEST
            });
          if (profileError) console.error("Profile creation error:", profileError);
        }
        
        alert("Account created! Please check your email for a verification link.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-nook-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 text-slate-400 hover:text-brand-red transition-all hover:rotate-90"
        >
          <X size={24} />
        </button>

        <div className="p-10 md:p-12">
          <div className="text-center mb-10">
            <div className="text-3xl font-serif font-bold text-nook-900 mb-2">The Cozy Nook</div>
            <p className="text-slate-400 text-sm font-medium">
              {mode === 'login' ? 'Welcome back to your sanctuary' : 'Join our exclusive community'}
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 text-brand-red text-xs rounded-2xl flex items-start space-x-3 animate-in slide-in-from-top-2">
              <X size={16} className="flex-shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-slate-100 border-2 focus:border-nook-200 focus:bg-white rounded-[24px] text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border-slate-100 border-2 focus:border-nook-200 focus:bg-white rounded-[24px] text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-300 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border-slate-100 border-2 focus:border-nook-200 focus:bg-white rounded-[24px] text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-300 font-medium"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-nook-900 text-white rounded-[24px] font-bold hover:bg-nook-800 transition shadow-2xl shadow-nook-900/20 flex items-center justify-center space-x-3 disabled:opacity-70 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span className="tracking-wide uppercase text-xs">{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button 
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="text-sm text-slate-400 hover:text-nook-900 transition-colors"
            >
              {mode === 'login' ? (
                <>Don't have an account? <span className="text-nook-600 font-bold border-b-2 border-nook-100 pb-0.5 ml-1">Sign Up</span></>
              ) : (
                <>Already have an account? <span className="text-nook-600 font-bold border-b-2 border-nook-100 pb-0.5 ml-1">Sign In</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
