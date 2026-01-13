
import React from 'react';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

interface PaymentResultProps {
  success: boolean;
  onContinue: () => void;
}

const PaymentResult: React.FC<PaymentResultProps> = ({ success, onContinue }) => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] p-12 text-center border border-slate-50">
        {success ? (
          <>
            <div className="w-20 h-20 bg-nook-50 text-nook-600 rounded-full flex items-center justify-center mx-auto mb-8 border border-nook-100 shadow-sm">
              <CheckCircle size={48} />
            </div>
            <h1 className="text-4xl font-serif text-nook-900 mb-4 tracking-tight">Stay Confirmed!</h1>
            <p className="text-slate-500 mb-12 leading-relaxed text-sm">
              Your payment was successful and your luxury stay at The Cozy Nook is now officially booked. A confirmation email has been sent to your inbox.
            </p>
            <button 
              onClick={onContinue}
              className="w-full py-4 bg-nook-900 text-white rounded-2xl font-bold hover:bg-nook-800 transition flex items-center justify-center space-x-2 shadow-xl shadow-nook-900/20"
            >
              <span>View My Bookings</span>
              <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-50 text-brand-red rounded-full flex items-center justify-center mx-auto mb-8 border border-brand-red/10 shadow-sm">
              <XCircle size={48} />
            </div>
            <h1 className="text-4xl font-serif text-nook-900 mb-4 tracking-tight">Payment Failed</h1>
            <p className="text-slate-500 mb-12 leading-relaxed text-sm">
              We encountered an issue while processing your transaction. This could be due to insufficient funds or a gateway timeout. Please try again or use another payment method.
            </p>
            <button 
              onClick={onContinue}
              className="w-full py-4 bg-brand-red text-white rounded-2xl font-bold hover:bg-red-700 transition shadow-xl shadow-brand-red/10"
            >
              Return to Selection
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;
