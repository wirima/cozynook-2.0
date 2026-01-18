
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ArrowRight, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { BookingStatus } from '../types';

interface PaymentResultProps {
  success?: boolean; // Legacy/Manual prop
  bookingId?: string; // New: Verification prop
  onContinue: () => void;
}

const PaymentResult: React.FC<PaymentResultProps> = ({ success: manualSuccess, bookingId, onContinue }) => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>(
    bookingId ? 'verifying' : (manualSuccess ? 'success' : 'failed')
  );

  useEffect(() => {
    if (!bookingId) return;

    let retries = 0;
    const MAX_RETRIES = 10; // 20 seconds total (interval 2s)

    // 1. Initial Check Function
    const checkStatus = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .single();
      
      if (data) {
        if (data.status === BookingStatus.CONFIRMED) {
          setStatus('success');
          return true; // Stop polling
        } else if (data.status === BookingStatus.CANCELLED) {
          setStatus('failed');
          return true; // Stop polling
        }
      }
      return false; // Keep polling
    };

    // 2. Poll Logic (Fallback for Realtime)
    const interval = setInterval(async () => {
      if (retries >= MAX_RETRIES) {
        clearInterval(interval);
        // If we timed out but didn't explicitly fail, we might want to tell the user to check their email
        // For now, we leave it as verifying or set a specific "timeout" message.
      }
      const done = await checkStatus();
      if (done) clearInterval(interval);
      retries++;
    }, 2000);

    // 3. Realtime Subscription (Primary)
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === BookingStatus.CONFIRMED) {
            setStatus('success');
            clearInterval(interval);
          } else if (newStatus === BookingStatus.CANCELLED) {
            setStatus('failed');
            clearInterval(interval);
          }
        }
      )
      .subscribe();

    // Check immediately on mount
    checkStatus();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] p-12 text-center border border-slate-50 relative overflow-hidden">
        
        {status === 'verifying' && (
          <div className="animate-in fade-in zoom-in duration-500">
             <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-nook-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-nook-600">
                   <ShieldCheck size={32} className="animate-pulse" />
                </div>
             </div>
             <h1 className="text-3xl font-serif text-nook-900 mb-4 tracking-tight">Verifying Secure Payment</h1>
             <p className="text-slate-400 mb-8 leading-relaxed text-sm max-w-xs mx-auto">
               We are waiting for the encrypted confirmation from PayChangu. This ensures your booking is legitimate.
             </p>
             <div className="flex justify-center space-x-2">
                <span className="w-2 h-2 bg-nook-600 rounded-full animate-bounce delay-0"></span>
                <span className="w-2 h-2 bg-nook-600 rounded-full animate-bounce delay-100"></span>
                <span className="w-2 h-2 bg-nook-600 rounded-full animate-bounce delay-200"></span>
             </div>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-nook-50 text-nook-600 rounded-full flex items-center justify-center mx-auto mb-8 border border-nook-100 shadow-sm">
              <CheckCircle size={48} />
            </div>
            <h1 className="text-4xl font-serif text-nook-900 mb-4 tracking-tight">Stay Confirmed!</h1>
            <p className="text-slate-500 mb-12 leading-relaxed text-sm">
              Your payment was verified successfully. The Cozy Nook awaits your arrival. A confirmation has been sent to your dashboard.
            </p>
            <button 
              onClick={onContinue}
              className="w-full py-4 bg-nook-900 text-white rounded-2xl font-bold hover:bg-nook-800 transition flex items-center justify-center space-x-2 shadow-xl shadow-nook-900/20"
            >
              <span>View My Bookings</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-red-50 text-brand-red rounded-full flex items-center justify-center mx-auto mb-8 border border-brand-red/10 shadow-sm">
              <XCircle size={48} />
            </div>
            <h1 className="text-4xl font-serif text-nook-900 mb-4 tracking-tight">Payment Unsuccessful</h1>
            <p className="text-slate-500 mb-12 leading-relaxed text-sm">
              The gateway reported an issue with the transaction. No funds were captured, and the booking remains pending.
            </p>
            <button 
              onClick={onContinue}
              className="w-full py-4 bg-brand-red text-white rounded-2xl font-bold hover:bg-red-700 transition shadow-xl shadow-brand-red/10 flex items-center justify-center space-x-2"
            >
              <RefreshCw size={18} />
              <span>Try Again</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;
