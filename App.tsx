
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { supabase } from './services/supabaseClient';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import GuestDashboard from './pages/GuestDashboard';
import BookingFlow from './pages/BookingFlow';
import PaymentResult from './pages/PaymentResult';
import AuthModal from './components/AuthModal';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'admin' | 'guest' | 'booking' | 'payment-success' | 'payment-fail'>('landing');
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const [pendingBooking, setPendingBooking] = useState<{
    listingId: string;
    checkIn: string;
    checkOut: string;
  } | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000));
        
        const result = await Promise.race([sessionPromise, timeout]) as any;
        const session = result?.data?.session;

        if (session) {
          handleSession(session).finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      } catch (e: any) {
        console.warn("Session init delayed or failed:", e?.message);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        handleSession(session);
      } else {
        setCurrentUser(null);
        if (view !== 'landing') setView('landing');
      }
    });

    initialize();
    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session: any) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile?.is_suspended) {
        alert("Your account has been suspended. Please contact administration.");
        await supabase.auth.signOut();
        return;
      }

      const isFirstTime = profile?.has_logged_in_before === false;

      const user: User = {
        uid: String(session.user.id),
        email: String(session.user.email || ''),
        role: (profile?.role as UserRole) || UserRole.GUEST,
        fullName: String(profile?.full_name || session.user.user_metadata?.full_name || 'Valued Guest'),
        isFirstLogin: isFirstTime,
        isSuspended: profile?.is_suspended || false
      };
      
      setCurrentUser(user);

      // If it was the first time, update the flag in background
      if (isFirstTime) {
        await supabase
          .from('profiles')
          .update({ has_logged_in_before: true })
          .eq('id', session.user.id);
      }
      
      if (user.role === UserRole.ADMIN && view === 'landing') {
        setView('admin');
      } else if (pendingBooking && (view === 'landing' || isAuthModalOpen)) {
        setView('booking');
        setPendingBooking(null);
      }
    } catch (e: any) {
      console.error("Profile fetch error:", e?.message);
      setCurrentUser({
        uid: String(session.user.id),
        email: String(session.user.email || ''),
        role: UserRole.GUEST,
        fullName: 'Valued Guest',
        isFirstLogin: false,
        isSuspended: false
      });
    }
  };

  const openAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleMainAction = () => {
    if (!currentUser) {
      openAuth('login');
    } else if (currentUser.role === UserRole.ADMIN) {
      setView('admin');
    } else {
      setView('guest');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setView('landing');
  };

  const startBooking = (listingId: string, dates: { checkIn: string, checkOut: string }) => {
    if (!currentUser) {
      setPendingBooking({ listingId, ...dates });
      openAuth('signup');
    } else {
      setPendingBooking({ listingId, ...dates });
      setView('booking');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white flex-col space-y-4">
        <div className="w-10 h-10 border-2 border-nook-100 border-t-nook-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold text-nook-600 uppercase tracking-widest animate-pulse">Establishing Connection</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {view === 'landing' && (
        <LandingPage 
          user={currentUser}
          onBook={startBooking} 
          onLogin={handleMainAction}
          onGuestPortal={() => currentUser ? setView('guest') : openAuth('login')}
        />
      )}

      {view === 'admin' && currentUser?.role === UserRole.ADMIN && (
        <AdminDashboard onLogout={logout} />
      )}

      {view === 'guest' && currentUser && (
        <GuestDashboard 
          user={currentUser} 
          onLogout={logout} 
          onHome={() => setView('landing')} 
          onAdmin={() => setView('admin')}
        />
      )}

      {view === 'booking' && pendingBooking && currentUser && (
        <BookingFlow 
          user={currentUser} 
          bookingData={pendingBooking} 
          onComplete={(success) => {
            setView(success ? 'payment-success' : 'payment-fail');
            setPendingBooking(null);
          }}
          onCancel={() => {
            setView('landing');
            setPendingBooking(null);
          }}
        />
      )}

      {view === 'payment-success' && (
        <PaymentResult success={true} onContinue={() => setView('guest')} />
      )}

      {view === 'payment-fail' && (
        <PaymentResult success={false} onContinue={() => setView('landing')} />
      )}

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {}} 
        initialMode={authMode}
      />
    </div>
  );
};

export default App;
