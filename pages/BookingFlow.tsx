import React, { useState, useEffect } from 'react';
import { db } from '../services/mainDatabase';
import { User, Listing, BookingStatus, Booking } from '../types';
import { ShieldCheck, ArrowRight, CreditCard, Smartphone, CheckCircle2, ChevronLeft, Zap, Loader2, AlertCircle, PlayCircle, Phone, Lock, Calendar as CalendarIcon, User as UserIcon, CreditCard as CardIcon } from 'lucide-react';
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
  
  // Contact State
  const [phone, setPhone] = useState('');

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
    if (!phone || phone.length < 8) {
      setErrorMessage("Please enter a valid phone number to continue.");
      return;
    }

    if (new Date(bookingData.checkIn) >= new Date(bookingData.checkOut)) {
        setErrorMessage("Invalid dates selected. Check-out must be after check-in.");
        return;
    }

    setPaymentStep('processing');
    setErrorMessage(null);
    
    try {
      if (!listing || !isAvailable) {
        throw new Error("Availability expired. This property has been booked by another guest.");
      }

      const total = calculateTotal();
      
      // 1. Create PENDING booking record in Supabase
      const booking = await db.createBooking({
        userId: user.uid,
        listingId: listing.id,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        status: BookingStatus.PENDING,
        totalAmount: total,
        guestCount: 2,
      });

      const [firstName, ...rest] = user.fullName.split(' ');
      const lastName = rest.join(' ') || 'Guest';

      console.log("Invoking PayChangu Checkout Function...");

      // 2. Invoke PayChangu Edge Function to get hosted checkout URL
      const { data, error: invokeError } = await supabase.functions.invoke('paychangu-checkout', {
        body: {
          amount: total,
          email: user.email,
          phone: phone,
          first_name: firstName,
          last_name: lastName,
          booking_id: booking.id,
          currency: 'MWK'
        }
      });

      if (invokeError) {
        console.error("Supabase Invoke Error:", invokeError);
        
        // Detailed error diagnostics
        let msg = "Failed to connect to payment gateway.";
        if (invokeError.message) {
            if (invokeError.message.includes('404')) {
                msg = "System Error: Payment function not found (404). Please ensure 'paychangu-checkout' is deployed.";
            } else if (invokeError.message.includes('500')) {
                msg = "System Error: Payment function crashed (500). Please check Supabase Edge Function logs.";
            } else if (invokeError.message.includes('Failed to fetch')) {
                msg = "Connection Error: Unable to reach Supabase. Please check your internet connection.";
            } else {
                msg = `Gateway Error: ${invokeError.message}`;
            }
        }
        throw new Error(msg);
      }

      if (data?.error) {
        console.error("PayChangu API Error:", data.error);
        throw new Error(data.error);
      }
      
      const checkoutUrl = data?.checkout_url || data?.data?.checkout_url;

      if (checkoutUrl) {
        // 3. SECURE REDIRECT: Send user to PayChangu's hosted platform
        window.location.href = checkoutUrl;
      } else {
        console.error("Invalid Response Data:", data);
        throw new Error("Payment provider did not return a valid checkout URL.");
      }
    } catch (err: any) {
      console.error("Checkout Flow Error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during checkout.");
      setPaymentStep('method');
    }
  };

  if (!listing) return (
    <div className="min-h-screen flex items-center justify-center bg-white flex-col space-y-4">
      <div className="w-10 h-10 border-2 border-nook-100 border-t-nook-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-nook-600 uppercase tracking-widest animate-pulse">Syncing Stay Data</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Sidebar: Summary & Branding */}
      <div className="md:w-2/5 bg-nook-900 text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        
        <button onClick={onCancel} className="text-white/60 hover:text-white flex items-center space-x-2 text-sm transition self-start group z-10">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> <span>Abort & return</span>
        </button>

        <div className="mt-12 md:mt-0 z-10">
          <h1 className="text-4xl font-serif mb-4 leading-tight tracking-tight text-emerald-50">Confirm Reservation</h1>
          <p className="text-white/80 font-light mb-12 text-lg">Secure your dates via PayChangu's official platform.</p>

          <div className="bg-white/10 border border-white/20 rounded-[40px] p-10 backdrop-blur-xl shadow-2xl">
            <div className="flex justify-between items-start mb-10 pb-6 border-b border-white/10">
               <div>
                  <div className="text-xl font-bold text-white mb-1">{listing.name}</div>
                  <div className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">{listing.type}</div>
               </div>
               <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-400">${listing.price}</div>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div>
                <div className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-widest">Check In</div>
                <div className="text-base font-bold text-white/90">{new Date(bookingData.checkIn).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-widest">Check Out</div>
                <div className="text-base font-bold text-white/90">{new Date(bookingData.checkOut).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="flex justify-between items-center text-4xl font-serif text-white border-t border-white/10 pt-8">
              <span className="text-sm font-sans font-bold text-white/40 uppercase tracking-[0.2em]">Total</span>
              <span className="font-bold tracking-tight">${calculateTotal()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-widest text-white/30 mt-12 z-10">
          <ShieldCheck size={18} className="text-emerald-500" />
          <span>PayChangu Secure External Checkout</span>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex-1 bg-white p-8 md:p-24 flex items-center justify-center">
        <div className="max-w-md w-full">
          {errorMessage && (
            <div className="mb-10 p-6 bg-red-50 border border-red-100 text-brand-red text-xs rounded-[24px] flex items-start space-x-4 animate-in fade-in">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {paymentStep === 'summary' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="text-center">
                <div className="w-24 h-24 bg-nook-50 rounded-[32px] flex items-center justify-center mx-auto mb-10 text-nook-600 border border-nook-100 shadow-xl shadow-nook-900/5 rotate-3">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-4xl font-serif text-nook-900 mb-4 tracking-tight">Stay Validated</h3>
                <p className="text-slate-500 text-base font-medium leading-relaxed">Ready to secure your booking via our partner, PayChangu.</p>
              </div>
              
              <button 
                onClick={() => setPaymentStep('method')}
                className="w-full py-6 bg-nook-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-nook-800 transition-all flex items-center justify-center space-x-4 shadow-2xl group"
              >
                <span>Proceed to PayChangu</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {paymentStep === 'method' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="text-center">
                <h3 className="text-3xl font-serif text-nook-900 mb-2 tracking-tight">One Last Step</h3>
                <p className="text-slate-400 text-sm font-medium">Provide your contact phone for the payment gateway prompt.</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] ml-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+265..."
                    className="w-full pl-16 pr-6 py-6 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-[28px] text-lg font-bold text-nook-900 outline-none transition-all"
                  />
                </div>
              </div>

              <button 
                onClick={handlePay}
                className="w-full py-6 bg-nook-900 text-white rounded-[28px] font-black uppercase tracking-[0.2em] text-[12px] hover:bg-nook-800 transition-all shadow-2xl flex items-center justify-center space-x-4"
              >
                <Zap size={18} className="fill-current" />
                <span>Redirect to Secure Payment</span>
              </button>
            </div>
          )}

          {paymentStep === 'processing' && (
            <div className="text-center space-y-12 animate-in fade-in">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 border-[6px] border-nook-50 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-nook-900 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="animate-pulse text-nook-600" size={32} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-serif text-nook-900 tracking-tight">Connecting Gateway</h3>
                <p className="text-slate-400 text-base font-medium leading-relaxed max-w-[280px] mx-auto">You will be redirected to PayChangu's secure platform in a moment.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFlow;