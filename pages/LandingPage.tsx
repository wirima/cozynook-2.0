
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDatabase';
import { Listing, User } from '../types';
import { Shield, MapPin, Star, XCircle, Loader2 } from 'lucide-react';

interface LandingPageProps {
  user: User | null;
  onBook: (id: string, dates: { checkIn: string, checkOut: string }) => void;
  onLogin: () => void;
  onGuestPortal: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ user, onBook, onLogin, onGuestPortal }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [dates, setDates] = useState({ 
    checkIn: new Date().toISOString().split('T')[0], 
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0] 
  });

  useEffect(() => {
    db.getListings()
      .then(setListings)
      .catch(err => {
        console.error("Listing fetch failed", err);
      });
  }, []);

  useEffect(() => {
    const checkAll = async () => {
      if (listings.length === 0) return;
      setIsChecking(true);
      const map: Record<string, boolean> = {};
      try {
        // Parallelize availability checks for massive speed boost
        const checks = await Promise.all(
          listings.map(l => db.checkAvailability(l.id, dates.checkIn, dates.checkOut))
        );
        listings.forEach((listing, index) => {
          map[listing.id] = checks[index];
        });
        setAvailabilityMap(map);
      } catch (err) {
        console.error("Availability check failed", err);
      } finally {
        setIsChecking(false);
      }
    };
    checkAll();
  }, [dates, listings]);

  return (
    <div className="flex flex-col w-full bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-nook-100 px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-serif font-bold text-nook-900 tracking-tight">The Cozy Nook</div>
        <div className="space-x-8 text-sm font-medium text-nook-800 hidden md:flex items-center">
          <a href="#about" className="hover:text-nook-600 transition">About</a>
          <a href="#rooms" className="hover:text-nook-600 transition">Rooms</a>
          {user && (
            <button onClick={onGuestPortal} className="hover:text-nook-600 transition">My Bookings</button>
          )}
          <button onClick={onLogin} className="bg-nook-900 text-white px-6 py-2 rounded-full hover:bg-nook-800 transition shadow-lg shadow-nook-900/20">
            {user ? 'Dashboard' : 'Login'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center text-white pt-16">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=2070" 
            className="w-full h-full object-cover brightness-[0.4]"
            alt="Luxury Property"
          />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-serif mb-6 leading-tight animate-in fade-in slide-in-from-top-8 duration-1000">Your Private Sanctuary of Calm</h1>
          <p className="text-xl md:text-2xl font-light mb-12 opacity-90 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-4 duration-1000 delay-200">
            Discover bespoke hospitality in the heart of serenity. From intimate rooms to grand estates.
          </p>

          <div className="bg-white p-2 rounded-2xl md:rounded-full shadow-2xl flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 max-w-3xl mx-auto overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <div className="flex-1 px-6 py-3 border-b md:border-b-0 md:border-r border-nook-100 w-full text-left">
              <label className="block text-[10px] uppercase tracking-wider text-nook-500 font-bold mb-1">Check In</label>
              <input 
                type="date" 
                className="w-full bg-transparent text-nook-900 focus:outline-none cursor-pointer text-sm font-bold"
                value={dates.checkIn}
                onChange={(e) => setDates(prev => ({ ...prev, checkIn: e.target.value }))}
              />
            </div>
            <div className="flex-1 px-6 py-3 w-full text-left">
              <label className="block text-[10px] uppercase tracking-wider text-nook-500 font-bold mb-1">Check Out</label>
              <input 
                type="date" 
                className="w-full bg-transparent text-nook-900 focus:outline-none cursor-pointer text-sm font-bold"
                value={dates.checkOut}
                onChange={(e) => setDates(prev => ({ ...prev, checkOut: e.target.value }))}
              />
            </div>
            <div className="px-4 py-2 w-full md:w-auto">
              <button 
                disabled={isChecking}
                className="bg-nook-900 text-white w-full px-10 py-4 rounded-full font-bold hover:bg-nook-800 transition flex items-center justify-center space-x-2"
              >
                {isChecking ? <Loader2 className="animate-spin" size={18} /> : null}
                <span>{isChecking ? 'Checking...' : 'Update Stay'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Listing Grid */}
      <section id="rooms" className="py-24 px-6 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl font-serif text-nook-900 mb-2">Refined Accommodations</h2>
              <p className="text-slate-500">Choose the perfect space for your journey.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((listing) => {
              const isAvailable = availabilityMap[listing.id] !== false;
              return (
                <div key={listing.id} className={`group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 ${!isAvailable ? 'opacity-75' : ''}`}>
                  <div className="relative h-72 overflow-hidden">
                    <img 
                      src={listing.images[0]?.url || 'https://picsum.photos/seed/nook-default/800/600'} 
                      alt={listing.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-nook-900 shadow-sm border border-slate-100">
                      ${listing.price}<span className="text-[10px] text-slate-500 ml-1">/ NIGHT</span>
                    </div>
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-brand-red/10 backdrop-blur-[1px] flex items-center justify-center p-6 text-center">
                        <div className="bg-white p-4 rounded-2xl shadow-xl border border-brand-red">
                          <XCircle className="mx-auto text-brand-red mb-2" size={24} />
                          <div className="text-xs font-bold text-brand-red uppercase tracking-widest">Fully Booked</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-nook-600">{listing.type}</span>
                      <div className="flex items-center space-x-1 text-nook-600">
                        <Star size={10} fill="currentColor" />
                        <span className="text-[10px] font-bold">4.9</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-serif text-nook-900 mb-4">{listing.name}</h3>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-6 h-10">
                      {listing.shortSummary || listing.description}
                    </p>
                    <button 
                      onClick={() => isAvailable && onBook(listing.id, dates)}
                      disabled={!isAvailable}
                      className={`w-full py-4 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
                        isAvailable 
                          ? 'bg-nook-900 text-white hover:bg-nook-800 shadow-lg shadow-nook-900/10' 
                          : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <span>{isAvailable ? 'View Details & Book' : 'Unavailable'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 text-slate-500 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-[11px] uppercase tracking-[0.2em]">
          <div>© 2025 The Cozy Nook. All rights reserved.</div>
          <div className="mt-4 md:mt-0 space-x-8">
            <a href="#" className="hover:text-nook-600 transition">Privacy</a>
            <a href="#" className="hover:text-nook-600 transition">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
