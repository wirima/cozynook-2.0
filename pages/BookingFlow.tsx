import React, { useState, useEffect } from 'react';
import { db } from '../services/mainDatabase';
import { User, Listing, BookingStatus, Booking, UserRole } from '../types';
import { ShieldCheck, ArrowRight, CheckCircle2, ChevronLeft, Zap, Loader2, AlertCircle, Phone, Calendar as CalendarIcon, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { calculateTier } from '../services/tierService';
import { supabase } from '../services/supabaseClient';

interface BookingFlowProps {
  user: User | null; // User can now be null (guest mode)
  bookingData: { listingId: string; checkIn: string; checkOut: string };
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}

const BookingFlow: React.FC<BookingFlowProps> = ({ user, bookingData, onComplete, onCancel }) => {
  const [listing, setListing] = useState<Listing | null>(null);

  // Mutable Date State
  const [checkInDate, setCheckInDate] = useState(bookingData.checkIn);
  const [checkOutDate, setCheckOutDate] = useState(bookingData.checkOut);

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const [paymentStep, setPaymentStep] = useState<'summary' | 'method' | 'processing'>('summary');
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Currency Logic
  const [currency, setCurrency] = useState<'USD' | 'MWK'>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(1750);

  // Contact State
  const [phone, setPhone] = useState('');

  // Guest Authentication State (For inline signup)
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [isGuestLoginMode, setIsGuestLoginMode] = useState(false); // Toggle between Signup/Login for guests
  const [showPassword, setShowPassword] = useState(false);

  // 1. Initial Data Load
  useEffect(() => {
    const init = async () => {
      const [allListings, allBookings, rate] = await Promise.all([
        db.getListings(),
        db.getBookings(),
        db.getExchangeRate()
      ]);

      // Only filter bookings if user is logged in to calculate tier
      if (user) {
        const filteredBookings = allBookings.filter(b => b.userId === user.uid);
        setUserBookings(filteredBookings);
      } else {
        setUserBookings([]);
      }

      setExchangeRate(rate);

      const match = allListings.find(l => l.id === bookingData.listingId);
      if (match) {
        setListing(match);
      }
    };
    init();
  }, [bookingData.listingId, user?.uid]);

  // 2. Availability Re-check on Date Change
  useEffect(() => {
    const check = async () => {
      if (!listing) return;
      setIsCheckingAvailability(true);
      setIsAvailable(null); // Reset while checking
      try {
        const avail = await db.checkAvailability(listing.id, checkInDate, checkOutDate);
        setIsAvailable(avail);
      } catch (e) {
        console.error("Availability check failed", e);
        setIsAvailable(false);
      } finally {
        setIsCheckingAvailability(false);
      }
    };

    // Debounce slightly to avoid spamming DB on rapid typing
    const timeout = setTimeout(check, 500);
    return () => clearTimeout(timeout);
  }, [listing, checkInDate, checkOutDate]);

  const tier = calculateTier(userBookings);

  const calculateTotalUSD = () => {
    if (!listing) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) return 0;

    const subtotal = nights * listing.price;
    const discountAmount = subtotal * tier.discount;
    const finalAmount = subtotal - discountAmount;

    // Return at least $1 to avoid showing $0 for valid bookings
    return Math.max(1, Math.round(finalAmount));
  };

  const getDisplayAmount = () => {
    const totalUSD = calculateTotalUSD();
    if (currency === 'USD') return totalUSD;
    return Math.ceil(totalUSD * exchangeRate);
  };

  const handleCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setCheckInDate(newDate);

    if (new Date(newDate) >= new Date(checkOutDate)) {
      const nextDay = new Date(newDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setCheckOutDate(nextDay.toISOString().split('T')[0]);
    }
  };

  const handleCheckOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (new Date(newDate) <= new Date(checkInDate)) return;
    setCheckOutDate(newDate);
  };

  const handlePay = async () => {
    setErrorMessage(null);

    // --- Validation ---
    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      setErrorMessage("Invalid dates selected. Check-out must be after check-in.");
      return;
    }
    if (isAvailable === false) {
      setErrorMessage("The selected dates are no longer available.");
      return;
    }
    if (!phone || phone.length < 8) {
      setErrorMessage("Please enter a valid phone number to continue.");
      return;
    }

    // Guest Auth Validation
    if (!user) {
      if (!guestEmail || !guestPassword) {
        setErrorMessage("Please complete all sign-in fields.");
        return;
      }
      if (!isGuestLoginMode && !guestName) {
        setErrorMessage("Please enter your full name.");
        return;
      }
    }

    setPaymentStep('processing');

    try {
      if (!listing) throw new Error("Listing data missing.");

      // --- 1. Inline Authentication (If Guest) ---
      let activeUserId = user?.uid;
      let activeUserEmail = user?.email;
      let activeUserName = user?.fullName;

      if (!activeUserId) {
        if (isGuestLoginMode) {
          // LOG IN EXISTING USER
          const { data, error } = await supabase.auth.signInWithPassword({
            email: guestEmail,
            password: guestPassword
          });
          if (error) throw error;
          if (!data.user) throw new Error("Login failed.");

          activeUserId = data.user.id;
          activeUserEmail = data.user.email || guestEmail;

          // Fetch name from profile
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', activeUserId).single();
          activeUserName = profile?.full_name || 'Guest';

        } else {
          // SIGN UP NEW USER
          const { data, error } = await supabase.auth.signUp({
            email: guestEmail,
            password: guestPassword,
            options: { data: { full_name: guestName } }
          });
          if (error) throw error;
          if (!data.user) throw new Error("Signup failed.");

          activeUserId = data.user.id;
          activeUserEmail = guestEmail;
          activeUserName = guestName;

          // Manually create profile ensuring it exists before booking
          const { error: profileError } = await supabase.from('profiles').insert({
            id: activeUserId,
            full_name: guestName,
            role: UserRole.GUEST,
            email: guestEmail
          });
          if (profileError) console.error("Profile creation warning:", profileError);
        }
      }

      // --- 2. Final Availability Check ---
      const finalCheck = await db.checkAvailability(listing.id, checkInDate, checkOutDate);
      if (!finalCheck) {
        throw new Error("Availability expired. This property has been booked by another guest.");
      }

      const totalUSD = calculateTotalUSD();
      const chargeAmount = currency === 'MWK' ? Math.ceil(totalUSD * exchangeRate) : totalUSD;

      // --- 3. Create Booking ---
      const booking = await db.createBooking({
        userId: activeUserId!,
        listingId: listing.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        status: BookingStatus.PENDING,
        totalAmount: totalUSD,
        guestCount: 2,
      });

      const [firstName, ...rest] = (activeUserName || 'Guest').split(' ');
      const lastName = rest.join(' ') || 'User';

      console.log(`Invoking PayChangu Checkout (${currency})...`);

      // --- 4. Invoke Payment Gateway ---
      const { data, error: invokeError } = await supabase.functions.invoke('paychangu-checkout', {
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZmxxeXlodG10cXhoc3phdHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTkzMzcsImV4cCI6MjA4Mzc5NTMzN30.15OMq6lC6Pkd3qUYEK14dXgKsnjczS2QCB4UIaZP_-s`,
        },
        body: {
          amount: chargeAmount,
          currency: currency,
          email: activeUserEmail,
          phone: phone,
          first_name: firstName,
          last_name: lastName,
          booking_id: booking.id
        }
      });

      if (invokeError) {
        console.error("Supabase Invoke Error:", invokeError);
        throw new Error("Failed to connect to payment gateway. Please disable AdBlockers and try again.");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const checkoutUrl = data?.checkout_url || data?.data?.checkout_url;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("Payment provider did not return a valid checkout URL.");
      }
    } catch (err: any) {
      console.error("Checkout Flow Error:", err);
      setErrorMessage(err.message || "An unexpected error occurred.");
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

        <div className="mt-12 md:mt-0 z-10 w-full">
          <h1 className="text-4xl font-serif mb-4 leading-tight tracking-tight text-emerald-50">Confirm Reservation</h1>
          <p className="text-white/80 font-light mb-12 text-lg">Secure your dates via PayChangu's official platform.</p>

          <div className="bg-white/10 border border-white/20 rounded-[40px] p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {isCheckingAvailability && (
              <div className="absolute top-0 right-0 p-4">
                <Loader2 size={16} className="animate-spin text-white/50" />
              </div>
            )}

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
              <div className="relative group">
                <div className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-widest flex items-center space-x-1">
                  <CalendarIcon size={10} /> <span>Check In</span>
                </div>
                <input
                  type="date"
                  value={checkInDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={handleCheckInChange}
                  className="bg-transparent text-white/90 font-bold w-full outline-none border-b border-white/20 focus:border-white transition-colors pb-1 cursor-pointer [color-scheme:dark]"
                />
              </div>
              <div className="relative group">
                <div className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-widest flex items-center space-x-1">
                  <CalendarIcon size={10} /> <span>Check Out</span>
                </div>
                <input
                  type="date"
                  value={checkOutDate}
                  min={checkInDate}
                  onChange={handleCheckOutChange}
                  className="bg-transparent text-white/90 font-bold w-full outline-none border-b border-white/20 focus:border-white transition-colors pb-1 cursor-pointer [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-4xl font-serif text-white border-t border-white/10 pt-8">
              <span className="text-sm font-sans font-bold text-white/40 uppercase tracking-[0.2em]">Total</span>
              <div className="flex flex-col items-end">
                <div className="flex items-baseline space-x-2">
                  <span className="text-lg font-bold text-emerald-400 opacity-80">{currency === 'USD' ? '$' : 'MK'}</span>
                  <span className={`font-bold tracking-tight transition-opacity ${isCheckingAvailability ? 'opacity-50' : 'opacity-100'}`}>
                    {getDisplayAmount().toLocaleString()}
                  </span>
                </div>
                {isAvailable === false && !isCheckingAvailability && (
                  <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest bg-red-500/20 px-2 py-1 rounded mt-1">Dates Unavailable</span>
                )}
                {currency === 'MWK' && (
                  <span className="text-[9px] text-white/40 font-bold mt-1 tracking-widest uppercase">
                    Rate: 1 USD = {exchangeRate} MWK
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-widest text-white/30 mt-12 z-10">
          <ShieldCheck size={18} className="text-emerald-500" />
          <span>PayChangu Secure External Checkout</span>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex-1 bg-white p-8 md:p-24 flex items-center justify-center overflow-y-auto">
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
                <p className="text-slate-500 text-base font-medium leading-relaxed">
                  {user
                    ? `Welcome back, ${user.fullName.split(' ')[0]}. Ready to secure your booking.`
                    : "Ready to secure your booking via our partner, PayChangu."
                  }
                </p>
              </div>

              {/* Currency Toggle */}
              <div className="bg-slate-50 p-2 rounded-full flex border border-slate-100 shadow-inner">
                <button
                  onClick={() => setCurrency('USD')}
                  className={`flex-1 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${currency === 'USD' ? 'bg-white text-nook-900 shadow-md transform scale-100' : 'text-slate-400 hover:text-nook-900'}`}
                >
                  USD Payment
                </button>
                <button
                  onClick={() => setCurrency('MWK')}
                  className={`flex-1 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${currency === 'MWK' ? 'bg-white text-nook-900 shadow-md transform scale-100' : 'text-slate-400 hover:text-nook-900'}`}
                >
                  Local MWK
                </button>
              </div>

              <button
                onClick={() => setPaymentStep('method')}
                disabled={isAvailable === false}
                className={`w-full py-6 rounded-[24px] font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center space-x-4 shadow-2xl group ${isAvailable === false
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-nook-900 text-white hover:bg-nook-800'
                  }`}
              >
                <span>{isAvailable === false ? 'Select Different Dates' : `Proceed to ${user ? 'Checkout' : 'Guest Details'}`}</span>
                {isAvailable !== false && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          )}

          {paymentStep === 'method' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="text-center">
                <h3 className="text-3xl font-serif text-nook-900 mb-2 tracking-tight">
                  {user ? 'Final Details' : (isGuestLoginMode ? 'Member Login' : 'Guest Registration')}
                </h3>
                <p className="text-slate-400 text-sm font-medium">
                  {user
                    ? 'Confirm your contact info for the payment gateway.'
                    : (isGuestLoginMode
                      ? 'Log in to access your member tier discounts.'
                      : 'Create a profile to secure your reservation and track your stay.')
                  }
                </p>
              </div>

              <div className="space-y-5">
                {/* --- Guest Auth Fields (Only if not logged in) --- */}
                {!user && (
                  <div className="space-y-4 p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm">

                    {!isGuestLoginMode && (
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] ml-2">Full Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-[24px] text-sm font-bold text-nook-900 outline-none transition-all"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] ml-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-[24px] text-sm font-bold text-nook-900 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] ml-2">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={guestPassword}
                          onChange={(e) => setGuestPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-[24px] text-sm font-bold text-nook-900 outline-none transition-all"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-nook-600"><Eye size={18} /></button>
                      </div>
                    </div>

                    <div className="pt-2 text-center">
                      <button
                        onClick={() => { setIsGuestLoginMode(!isGuestLoginMode); setErrorMessage(null); }}
                        className="text-[10px] uppercase font-bold tracking-widest text-nook-600 hover:text-nook-800 transition-colors"
                      >
                        {isGuestLoginMode ? "Need an account? Sign Up" : "Already have an account? Log In"}
                      </button>
                    </div>
                  </div>
                )}

                {/* --- Phone Number (Always Required) --- */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] ml-2">Mobile Payment Number</label>
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
              </div>

              <div className="p-5 bg-slate-50 rounded-[28px] text-center border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Total Charge</span>
                <div className="text-2xl font-black text-nook-900">
                  {currency === 'USD' ? '$' : 'MK'} {getDisplayAmount().toLocaleString()}
                </div>
              </div>

              <button
                onClick={handlePay}
                className="w-full py-6 bg-nook-900 text-white rounded-[28px] font-black uppercase tracking-[0.2em] text-[12px] hover:bg-nook-800 transition-all shadow-2xl flex items-center justify-center space-x-4"
              >
                <Zap size={18} className="fill-current" />
                <span>{user ? 'Redirect to Payment' : (isGuestLoginMode ? 'Login & Pay' : 'Sign Up & Pay')}</span>
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
                <h3 className="text-3xl font-serif text-nook-900 tracking-tight">
                  {user ? 'Connecting Gateway' : 'Creating Profile'}
                </h3>
                <p className="text-slate-400 text-base font-medium leading-relaxed max-w-[280px] mx-auto">
                  {user ? "You will be redirected to PayChangu's secure platform in a moment." : "Securing your account and initiating payment..."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFlow;