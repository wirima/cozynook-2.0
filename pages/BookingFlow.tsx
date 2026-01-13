
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDatabase';
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
  const [showSimulationOption, setShowSimulationOption] = useState(false);
  
  // Contact & Card States
  const [phone, setPhone] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: user.fullName,
    type: 'visa'
  });

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

  const handleSimulatedPayment = async () => {
    setPaymentStep('processing');
    try {
      const total = calculateTotal();
      await db.createBooking({
        userId: user.uid,
        listingId: listing!.id,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        status: BookingStatus.CONFIRMED,
        totalAmount: total,
        guestCount: 2,
      });
      setTimeout(() => onComplete(true), 1500);
    } catch (err) {
      onComplete(false);
    }
  };

  const handlePay = async () => {
    // 1. Basic validation
    if (!phone || phone.length < 8) {
      setErrorMessage("Please enter a valid phone number to continue.");
      return;
    }

    if (paymentMethod === 'card') {
      const cleanNum = cardDetails.number.replace(/\s/g, '');
      if (cleanNum.length < 16) {
        setErrorMessage("Please enter a valid 16-digit card number.");
        return;
      }
      if (!cardDetails.expiry.includes('/') || cardDetails.expiry.length < 5) {
        setErrorMessage("Please enter a valid expiration date (MM/YY).");
        return;
      }
      if (cardDetails.cvv.length < 3) {
        setErrorMessage("Please enter a valid CVV code.");
        return;
      }
      if (!cardDetails.name) {
        setErrorMessage("Please enter the full cardholder name.");
        return;
      }
    }

    setPaymentStep('processing');
    setErrorMessage(null);
    setShowSimulationOption(false);
    
    try {
      if (!listing || !isAvailable) {
        throw new Error("Availability expired. This property has been booked by another guest.");
      }

      const total = calculateTotal();
      
      // 2. Create PENDING booking record
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

      // 3. Invoke PayChangu Gateway
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
        if (invokeError.message?.includes('Failed to send') || invokeError.name === 'FetchError') {
          setShowSimulationOption(true);
          throw new Error("Payment service unavailable (Simulation mode suggested).");
        }
        throw new Error(invokeError.message || "Payment gateway handshake failed.");
      }
      
      const checkoutUrl = data?.checkout_url || data?.data?.checkout_url;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setShowSimulationOption(true);
        throw new Error("Payment link generation failed. Verification mode enabled.");
      }
    } catch (err: any) {
      console.error("Booking Logic Error:", err);
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
          <p className="text-white/80 font-light mb-12 text-lg">Secure your dates with a single payment. Welcome to luxury hospitality.</p>

          <div className="bg-white/10 border border-white/20 rounded-[40px] p-10 backdrop-blur-xl shadow-2xl">
            <div className="flex justify-between items-start mb-10 pb-6 border-b border-white/10">
               <div>
                  <div className="text-xl font-bold text-white mb-1">{listing.name}</div>
                  <div className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">{listing.type}</div>
               </div>
               <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-400">${listing.price}</div>
                  <div className="text-[9px] text-white/30 uppercase font-black tracking-widest">Nightly</div>
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

            {tier.discount > 0 && (
              <div className="flex justify-between items-center bg-emerald-400/10 p-5 rounded-2xl border border-emerald-400/20 mb-10">
                <div className="flex items-center space-x-3">
                  <Zap size={16} className="text-emerald-400 fill-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{tier.name} Bonus</span>
                </div>
                <span className="text-emerald-400 font-bold">-{tier.discount * 100}%</span>
              </div>
            )}

            <div className="flex justify-between items-center text-4xl font-serif text-white border-t border-white/10 pt-8">
              <span className="text-sm font-sans font-bold text-white/40 uppercase tracking-[0.2em]">Payable</span>
              <span className="font-bold tracking-tight">${calculateTotal()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-widest text-white/30 mt-12 z-10">
          <ShieldCheck size={18} className="text-emerald-500" />
          <span>PayChangu Encrypted Checkout</span>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex-1 bg-white p-8 md:p-24 flex items-center justify-center">
        <div className="max-w-md w-full">
          {errorMessage && (
            <div className="mb-10 p-6 bg-red-50 border border-red-100 text-brand-red text-xs rounded-[24px] flex items-start space-x-4 animate-in fade-in slide-in-from-top-4">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="font-black uppercase tracking-widest text-[10px]">Checkout Issue</div>
                  <div className="font-medium leading-relaxed">{errorMessage}</div>
                </div>
                {showSimulationOption && (
                  <button 
                    onClick={handleSimulatedPayment}
                    className="flex items-center space-x-2 text-nook-700 font-bold bg-nook-50 px-4 py-2 rounded-xl hover:bg-nook-100 transition shadow-sm border border-nook-100"
                  >
                    <PlayCircle size={14} />
                    <span>Run Test Simulation</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {paymentStep === 'summary' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center">
                <div className="w-24 h-24 bg-nook-50 rounded-[32px] flex items-center justify-center mx-auto mb-10 text-nook-600 border border-nook-100 shadow-xl shadow-nook-900/5 rotate-3">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-4xl font-serif text-nook-900 mb-4 tracking-tight">Stay Locked In</h3>
                <p className="text-slate-500 text-base font-medium leading-relaxed">Your selection has been validated. Provide your contact details to complete the payment.</p>
              </div>
              
              <button 
                onClick={() => setPaymentStep('method')}
                className="w-full py-6 bg-nook-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-nook-800 transition-all flex items-center justify-center space-x-4 shadow-2xl shadow-nook-900/30 group"
              >
                <span>Continue to Checkout</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {paymentStep === 'method' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto max-h-[75vh] pr-2 custom-scrollbar">
              <div className="text-center">
                <h3 className="text-3xl font-serif text-nook-900 mb-2 tracking-tight">Contact Information</h3>
                <p className="text-slate-400 text-sm font-medium">Required for transaction verification and stay alerts.</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] ml-2">Mobile Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+265 99 123 4567"
                    className="w-full pl-16 pr-6 py-6 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-[28px] text-lg font-bold text-nook-900 outline-none transition-all placeholder:text-slate-200"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`p-6 rounded-[24px] border-2 transition-all flex flex-col items-center space-y-3 group ${paymentMethod === 'card' ? 'border-nook-600 bg-nook-50' : 'border-slate-50 hover:border-slate-100 bg-slate-50/30'}`}
                >
                  <CreditCard size={24} className={paymentMethod === 'card' ? 'text-nook-600' : 'text-slate-300 group-hover:text-slate-400'} />
                  <span className={`text-[12px] font-black uppercase tracking-widest transition-colors ${paymentMethod === 'card' ? 'text-nook-900' : 'text-slate-500'}`}>Bank Card</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('mobile_money')}
                  className={`p-6 rounded-[24px] border-2 transition-all flex flex-col items-center space-y-3 group ${paymentMethod === 'mobile_money' ? 'border-nook-600 bg-nook-50' : 'border-slate-50 hover:border-slate-100 bg-slate-50/30'}`}
                >
                  <Smartphone size={24} className={paymentMethod === 'mobile_money' ? 'text-nook-600' : 'text-slate-300 group-hover:text-slate-400'} />
                  <span className={`text-[12px] font-black uppercase tracking-widest transition-colors ${paymentMethod === 'mobile_money' ? 'text-nook-900' : 'text-slate-500'}`}>Mobile Money</span>
                </button>
              </div>

              {/* Bank Card Verification Stage */}
              {paymentMethod === 'card' && (
                <div className="space-y-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center space-x-2 mb-4">
                    <ShieldCheck size={16} className="text-nook-600" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-nook-600">Secure Verification Stage</span>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                       <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest ml-1">Card Type Selection</label>
                       <div className="flex space-x-3">
                         {['visa', 'mastercard'].map(type => (
                           <button 
                            key={type}
                            type="button"
                            onClick={() => setCardDetails({...cardDetails, type})}
                            className={`flex-1 py-4 border-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${cardDetails.type === type ? 'border-nook-600 bg-nook-50 text-nook-900' : 'border-slate-50 text-slate-300 bg-slate-50/50 hover:border-slate-100'}`}
                           >
                             {type}
                           </button>
                         ))}
                       </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest ml-1">Card Number</label>
                      <div className="relative">
                        <CardIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          type="text"
                          maxLength={19}
                          value={cardDetails.number}
                          onChange={(e) => setCardDetails({...cardDetails, number: e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim()})}
                          placeholder="0000 0000 0000 0000"
                          className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-2xl text-base font-bold text-nook-900 outline-none transition-all placeholder:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest ml-1">Expiration Date</label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            type="text"
                            placeholder="MM/YY"
                            maxLength={5}
                            value={cardDetails.expiry}
                            onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                                setCardDetails({...cardDetails, expiry: val});
                            }}
                            className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-2xl text-base font-bold text-nook-900 outline-none transition-all placeholder:text-slate-200"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest ml-1">CVV Security Code</label>
                        <div className="relative">
                          <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            type="password"
                            placeholder="123"
                            maxLength={4}
                            value={cardDetails.cvv}
                            onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                            className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-2xl text-base font-bold text-nook-900 outline-none transition-all placeholder:text-slate-200"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest ml-1">Full Name on Card</label>
                      <div className="relative">
                        <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          type="text"
                          value={cardDetails.name}
                          onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                          placeholder="AS IT APPEARS ON CARD"
                          className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-2xl text-base font-bold text-nook-900 outline-none transition-all uppercase placeholder:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Money Info Stage */}
              {paymentMethod === 'mobile_money' && (
                <div className="p-8 bg-nook-50 border border-nook-100 rounded-[32px] animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center space-x-3 mb-4">
                    <Smartphone size={24} className="text-nook-600" />
                    <span className="text-sm font-black uppercase tracking-widest text-nook-900">Mobile Money Auth</span>
                  </div>
                  <p className="text-[12px] font-medium text-slate-500 leading-relaxed">
                    Upon clicking pay, you will receive a prompt on your phone <span className="text-nook-900 font-bold">{phone || 'provided above'}</span>. Enter your PIN to authorize the transaction.
                  </p>
                </div>
              )}

              <button 
                onClick={handlePay}
                className="w-full py-6 bg-nook-900 text-white rounded-[28px] font-black uppercase tracking-[0.2em] text-[12px] hover:bg-nook-800 transition-all shadow-2xl shadow-nook-900/40 flex items-center justify-center space-x-4 sticky bottom-0"
              >
                <Zap size={18} className="fill-current" />
                <span>Pay ${calculateTotal()} Securely</span>
              </button>
            </div>
          )}

          {paymentStep === 'processing' && (
            <div className="text-center space-y-12 animate-in fade-in zoom-in duration-700">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 border-[6px] border-nook-50 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-nook-900 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="animate-pulse text-nook-600" size={32} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-serif text-nook-900 tracking-tight">Initiating Gateway</h3>
                <p className="text-slate-400 text-base font-medium leading-relaxed max-w-[280px] mx-auto">Connecting you to our secure payment environment. Do not close this window.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default BookingFlow;
