
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDatabase';
import { User, Listing, BookingStatus, Booking } from '../types';
import { ShieldCheck, ArrowRight, CreditCard, Smartphone, CheckCircle2, ChevronLeft, Zap } from 'lucide-react';
import { calculateTier } from '../services/tierService';

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
    
    // Simulate API Call to Paychangu
    setTimeout(async () => {
      if (listing && isAvailable) {
        const total = calculateTotal();
        await db.createBooking({
          userId: user.uid,
          listingId: listing.id,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          status: BookingStatus.CONFIRMED,
          totalAmount: total,
          guestCount: 2,
        });
        onComplete(true);
      } else {
        onComplete(false);
      }
    }, 2500);
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
          <h1 className="text-4xl font-serif mb-4 leading-tight">Secure your stay</h1>
          <p className="text-white/80 font-light mb-12">Confirm your stay details and finalize the payment to secure your booking.</p>

          <div className="bg-white/10 border border-white/20 rounded-3xl p-8 backdrop-blur-md">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6">Stay Summary</h2>
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-medium">{listing.name}</div>
                  <div className="text-xs text-white/60">Luxury {listing.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl">${listing.price}</div>
                  <div className="text-[10px] text-white/50">Per Night</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/10">
                <div>
                  <div className="text-[10px] uppercase font-bold text-white/50 mb-1 tracking-wider">Check In</div>
                  <div className="text-sm font-medium">{bookingData.checkIn}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-white/50 mb-1 tracking-wider">Check Out</div>
                  <div className="text-sm font-medium">{bookingData.checkOut}</div>
                </div>
              </div>

              {tier.discount > 0 && (
                <div className="flex justify-between items-center text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-400/10 p-3 rounded-xl border border-emerald-400/20">
                  <div className="flex items-center space-x-2">
                    <Zap size={12} />
                    <span>{tier.name} Benefit ({(tier.discount * 100)}% Off)</span>
                  </div>
                  <span>-${Math.floor(((calculateTotal() / (1 - tier.discount)) * tier.discount))}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-2xl font-bold">
                <span>Total Due</span>
                <span>${calculateTotal()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-white/40 mt-12">
          <ShieldCheck size={16} />
          <span>Encrypted payment powered by Paychangu</span>
        </div>
      </div>

      {/* Right side: Payment Actions */}
      <div className="flex-1 bg-white p-8 md:p-24 flex items-center justify-center">
        <div className="max-w-md w-full">
          {paymentStep === 'summary' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <div className="w-16 h-16 bg-nook-50 rounded-full flex items-center justify-center mx-auto mb-6 text-nook-600 border border-nook-100 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-serif text-nook-900 mb-2">Availability Confirmed</h3>
                <p className="text-slate-500 text-sm">Your selected dates are available. Would you like to proceed to payment?</p>
              </div>
              
              <button 
                onClick={() => setPaymentStep('method')}
                className="w-full py-4 bg-nook-900 text-white rounded-2xl font-bold hover:bg-nook-800 transition flex items-center justify-center space-x-2 shadow-xl shadow-nook-900/10"
              >
                <span>Continue to Payment</span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {paymentStep === 'method' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-2xl font-serif text-nook-900 text-center mb-8">Select Payment Method</h3>
              
              <div className="space-y-4">
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-6 rounded-2xl border-2 transition text-left flex items-center space-x-4 ${paymentMethod === 'card' ? 'border-nook-900 bg-nook-50/50' : 'border-slate-100 hover:border-nook-200'}`}
                >
                  <div className={`p-3 rounded-xl ${paymentMethod === 'card' ? 'bg-nook-900 text-white shadow-lg shadow-nook-900/20' : 'bg-slate-50 text-slate-400'}`}>
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-nook-900">Credit or Debit Card</div>
                    <div className="text-xs text-slate-400">Visa, Mastercard supported</div>
                  </div>
                </button>

                <button 
                  onClick={() => setPaymentMethod('mobile_money')}
                  className={`w-full p-6 rounded-2xl border-2 transition text-left flex items-center space-x-4 ${paymentMethod === 'mobile_money' ? 'border-nook-900 bg-nook-50/50' : 'border-slate-100 hover:border-nook-200'}`}
                >
                  <div className={`p-3 rounded-xl ${paymentMethod === 'mobile_money' ? 'bg-nook-900 text-white shadow-lg shadow-nook-900/20' : 'bg-slate-50 text-slate-400'}`}>
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-nook-900">Mobile Money</div>
                    <div className="text-xs text-slate-400">Airtel Money, TNM Mpamba</div>
                  </div>
                </button>
              </div>

              <div className="pt-8">
                <button 
                  onClick={handlePay}
                  className="w-full py-4 bg-nook-900 text-white rounded-2xl font-bold hover:bg-nook-800 transition shadow-2xl shadow-nook-900/20"
                >
                  Pay ${calculateTotal()} Securely
                </button>
                <p className="text-center text-[10px] text-slate-300 mt-6 uppercase tracking-[0.2em] font-bold">
                  Encryption Secured by Paychangu
                </p>
              </div>
            </div>
          )}

          {paymentStep === 'processing' && (
            <div className="text-center space-y-8 animate-in fade-in duration-500">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-nook-50 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-nook-900 rounded-full border-t-transparent animate-spin shadow-inner"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-serif text-nook-900">Contacting Gateway...</h3>
                <p className="text-slate-400 text-sm">Please do not close this window while we authorize your transaction.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFlow;
