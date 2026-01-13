
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDatabase';
import { User, Listing, BookingStatus, Booking } from '../types';
import { ShieldCheck, ArrowRight, CreditCard, Smartphone, CheckCircle2, ChevronLeft, Zap, Loader2, AlertCircle } from 'lucide-react';
import { calculateTier } from '../services/tierService';
import { supabase } from '../services/supabaseClient';

interface BookingFlowProps {
  user: User;
  bookingData: { listingId: string; checkIn: string; checkOut: string };
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}

const BookingFlow: React.FC<BookingFlowProps> = ({ user, bookingData, onComplete, onCancel }) => {
  const [listing, setListing] = useState<Listing | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [paymentStep, setPaymentStep] = useState<'summary' | 'method' | 'processing'>('summary');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('card');
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const [allListings, allBookings] = await Promise.all([
        db.getListings(),
        db.getBookings()
      ]);
      
      const filteredBookings = allBookings.filter(b => b.userId === user.uid);
      setUserBookings(filteredBookings);

      const match = allListings.find(l => l.id === bookingData.listingId);
      if (match) {
        setListing(match);
        const avail = await db.checkAvailability(match.id, bookingData.checkIn, bookingData.checkOut);
        setIsAvailable(avail);
      }
    };
    init();
  }, [bookingData, user.uid]);

  const tier = calculateTier(userBookings);

  const calculateTotal = () => {
    if (!listing) return 0;
    const start = new Date(bookingData.checkIn);
    const end = new Date(bookingData.checkOut);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const subtotal = (nights > 0 ? nights : 1) * listing.price;
    const discountAmount = subtotal * tier.discount;
    return Math.floor(subtotal - discountAmount);
  };

  const handlePay = async () => {
    setPaymentStep('processing');
    setErrorMessage(null);
    
    try {
      if (!listing || !isAvailable) {
        throw new Error("The property is no longer available for your selected dates.");
      }

      const total = calculateTotal();
      
      // 1. Create a PENDING booking in the database first
      const booking = await db.createBooking({
        userId: user.uid,
        listingId: listing.id,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        status: BookingStatus.PENDING,
        totalAmount: total,
        guestCount: 2,
      });

      // 2. Prepare user info for PayChangu
      const nameParts = user.fullName.split(' ');
      const firstName = nameParts[0] || 'Guest';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      // 3. Call the Supabase Edge Function to initiate PayChangu
      const { data, error } = await supabase.functions.invoke('paychangu-checkout', {
        body: {
          amount: total,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          booking_id: booking.id,
          currency: 'MWK' // Can be configurable
        }
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw new Error("Our payment gateway is currently unreachable. Please try again later.");
      }
      
      const checkoutUrl = data?.checkout_url || data?.data?.checkout_url;

      if (checkoutUrl) {
        // Redirect to PayChangu's secure hosted checkout page
        window.location.href = checkoutUrl;
      } else {
        console.error("PayChangu response missing URL:", data);
        throw new Error("Unable to generate payment link. Please contact support.");
      }
    } catch (err: any) {
      console.error("Payment Process Error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during checkout.");
      setPaymentStep('method');
    }
  };

  if (!listing) return <div className="p-20 text-center text-nook-600 font-medium">Loading stay details...</div>;

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Left side: Property Visual & Summary */}
      <div className="md:w-2/5 bg-nook-900 text-white p-8 md:p-16 flex flex-col justify-between">
        <button onClick={onCancel} className="text-white/60 hover:text-white flex items-center space-x-2 text-sm transition self-start group">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> <span>Back to choice</span>
        </button>

        <div className="mt-12 md:mt-0">
          <h1 className="text-4xl font-serif mb-4 leading-tight tracking-tight text-emerald-50">Secure your stay</h1>
          <p className="text-white/80 font-light mb-12">Confirm your stay details and finalize the payment to secure your luxury reservation at The Cozy Nook.</p>

          <div className="bg-white/10 border border-white/20 rounded-[40px] p-10 backdrop-blur-md shadow-2xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-8 border-b border-white/5 pb-4">Stay Summary</h2>
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xl font-bold text-white">{listing.name}</div>
                  <div className="text-xs text-white/40 font-medium uppercase tracking-widest mt-1">Luxury {listing.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-2xl text-emerald-400">${listing.price}</div>
                  <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Per Night</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8 py-8 border-y border-white/5">
                <div>
                  <div className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-widest">Check In</div>
                  <div className="text-sm font-bold text-white/90">{new Date(bookingData.checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-widest">Check Out</div>
                  <div className="text-sm font-bold text-white/90">{new Date(bookingData.checkOut).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>

              {tier.discount > 0 && (
                <div className="flex justify-between items-center text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-400/10 p-4 rounded-2xl border border-emerald-400/20 shadow-sm animate-in fade-in zoom-in duration-500">
                  <div className="flex items-center space-x-3">
                    <Zap size={14} className="fill-current" />
                    <span>{tier.name} Benefit ({(tier.discount * 100)}% Off)</span>
                  </div>
                  <span className="text-sm">-${Math.floor(((calculateTotal() / (1 - tier.discount)) * tier.discount))}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-3xl font-serif text-white pt-2">
                <span className="text-lg font-sans font-medium text-white/50">Total Due</span>
                <span className="font-bold tracking-tight">${calculateTotal()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-widest text-white/30 mt-12">
          <ShieldCheck size={18} className="text-emerald-500/50" />
          <span>Encrypted payment powered by PayChangu</span>
        </div>
      </div>

      {/* Right side: Payment Actions */}
      <div className="flex-1 bg-white p-8 md:p-24 flex items-center justify-center">
        <div className="max-w-md w-full">
          {errorMessage && (
            <div className="mb-10 p-6 bg-red-50 border border-red-100 text-brand-red text-xs rounded-[24px] flex items-start space-x-4 animate-in fade-in slide-in-from-top-4">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-black uppercase tracking-widest">Transaction Blocked</div>
                <div className="font-medium leading-relaxed">{errorMessage}</div>
              </div>
            </div>
          )}

          {paymentStep === 'summary' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center">
                <div className="w-24 h-24 bg-nook-50 rounded-[32px] flex items-center justify-center mx-auto mb-10 text-nook-600 border border-nook-100 shadow-xl shadow-nook-900/5 rotate-3">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-4xl font-serif text-nook-900 mb-4 tracking-tight">Availability Locked</h3>
                <p className="text-slate-500 text-base font-medium leading-relaxed">We've verified your selected dates. Please proceed to the payment gateway to finalize your reservation.</p>
              </div>
              
              <button 
                onClick={() => setPaymentStep('method')}
                className="w-full py-6 bg-nook-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-nook-800 transition-all flex items-center justify-center space-x-4 shadow-2xl shadow-nook-900/30 group"
              >
                <span>Choose Payment Method</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {paymentStep === 'method' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center mb-4">
                <h3 className="text-3xl font-serif text-nook-900 mb-2 tracking-tight">Checkout Method</h3>
                <p className="text-slate-400 text-sm font-medium">Select your preferred secure payment gateway</p>
              </div>
              
              <div className="space-y-5">
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-8 rounded-[32px] border-2 transition-all text-left flex items-center space-x-6 relative overflow-hidden group ${paymentMethod === 'card' ? 'border-nook-900 bg-nook-50/30' : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'}`}
                >
                  <div className={`p-5 rounded-2xl transition-all duration-500 ${paymentMethod === 'card' ? 'bg-nook-900 text-white shadow-xl shadow-nook-900/30 rotate-3' : 'bg-white text-slate-300 shadow-sm'}`}>
                    <CreditCard size={28} />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-nook-900 uppercase tracking-widest text-[10px] mb-1">Global Standard</div>
                    <div className="font-bold text-slate-900 text-lg">Credit or Debit Card</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">Visa, Mastercard, Amex</div>
                  </div>
                  {paymentMethod === 'card' && <div className="absolute top-4 right-4"><CheckCircle2 size={16} className="text-nook-600" /></div>}
                </button>

                <button 
                  onClick={() => setPaymentMethod('mobile_money')}
                  className={`w-full p-8 rounded-[32px] border-2 transition-all text-left flex items-center space-x-6 relative overflow-hidden group ${paymentMethod === 'mobile_money' ? 'border-nook-900 bg-nook-50/30' : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'}`}
                >
                  <div className={`p-5 rounded-2xl transition-all duration-500 ${paymentMethod === 'mobile_money' ? 'bg-nook-900 text-white shadow-xl shadow-nook-900/30 -rotate-3' : 'bg-white text-slate-300 shadow-sm'}`}>
                    <Smartphone size={28} />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-nook-900 uppercase tracking-widest text-[10px] mb-1">Regional Payment</div>
                    <div className="font-bold text-slate-900 text-lg">Mobile Money</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">Airtel Money, TNM Mpamba</div>
                  </div>
                  {paymentMethod === 'mobile_money' && <div className="absolute top-4 right-4"><CheckCircle2 size={16} className="text-nook-600" /></div>}
                </button>
              </div>

              <div className="pt-6">
                <button 
                  onClick={handlePay}
                  className="w-full py-6 bg-nook-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-nook-800 transition-all shadow-2xl shadow-nook-900/40 flex items-center justify-center space-x-4"
                >
                  <Zap size={16} className="fill-current" />
                  <span>Secure Pay ${calculateTotal()} Now</span>
                </button>
                <div className="mt-8 flex items-center justify-center space-x-6 opacity-30 grayscale hover:grayscale-0 transition-all">
                  <img src="https://paychangu.com/assets/img/logo/logo.png" className="h-4 object-contain" alt="PayChangu" />
                </div>
              </div>
            </div>
          )}

          {paymentStep === 'processing' && (
            <div className="text-center space-y-12 animate-in fade-in zoom-in duration-700">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 border-[6px] border-nook-50 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-nook-900 rounded-full border-t-transparent animate-spin shadow-inner"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="animate-pulse text-nook-600" size={32} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-serif text-nook-900 tracking-tight">Authorizing Transaction</h3>
                <p className="text-slate-400 text-base font-medium leading-relaxed max-w-[280px] mx-auto">We are connecting you to PayChangu's secure gateway. This should only take a moment.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFlow;
