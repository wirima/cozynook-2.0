
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDatabase';
import { User, Booking, Listing, BookingStatus, UserRole } from '../types';
import { LogOut, Home, Calendar, Clock, CreditCard, User as UserIcon, Download, ShieldCheck } from 'lucide-react';
import { calculateTier } from '../services/tierService';

interface GuestDashboardProps {
  user: User;
  onLogout: () => void;
  onHome: () => void;
  onAdmin?: () => void;
}

const GuestDashboard: React.FC<GuestDashboardProps> = ({ user, onLogout, onHome, onAdmin }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const allListings = await db.getListings();
      const allBookings = await db.getBookings();
      setListings(allListings);
      setBookings(allBookings.filter(b => b.userId === user.uid));
    };
    fetchData();
  }, [user.uid]);

  const activeBookings = bookings.filter(b => b.status === BookingStatus.CONFIRMED);
  const tier = calculateTier(bookings);
  const greeting = user.isFirstLogin ? "Welcome" : "Welcome back";

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="text-xl font-serif font-bold text-nook-900 cursor-pointer" onClick={onHome}>The Cozy Nook</div>
        <div className="flex items-center space-x-6">
          {user.role === UserRole.ADMIN && onAdmin && (
            <button 
              onClick={onAdmin}
              className="bg-nook-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-nook-800 transition shadow-lg shadow-nook-900/10"
            >
              <ShieldCheck size={14} /> <span>Admin Panel</span>
            </button>
          )}
          <button onClick={onHome} className="text-sm font-medium text-slate-500 flex items-center space-x-1 hover:text-nook-600 transition">
            <Home size={16} /> <span>Back to Site</span>
          </button>
          <div className="w-9 h-9 rounded-2xl bg-nook-50 overflow-hidden flex items-center justify-center border border-nook-100">
            <UserIcon size={20} className="text-nook-600" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12">
        <div className="mb-12 flex justify-between items-end">
          <div className="animate-in fade-in slide-in-from-left-4 duration-700">
            <h1 className="text-4xl font-serif text-nook-900 mb-2">{greeting}, {user.fullName.split(' ')[0]}</h1>
            <p className="text-slate-400 text-sm">Review your upcoming stays and managed preferences.</p>
          </div>
          <button 
            onClick={onLogout}
            className="text-xs font-bold uppercase tracking-widest text-brand-red hover:bg-red-50 px-5 py-3 rounded-xl transition-colors flex items-center space-x-2 border border-red-50"
          >
            <LogOut size={14} /> <span>Sign Out</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center space-x-2">
                <Calendar size={14} className="text-nook-600" /> <span>Confirmed Reservations</span>
              </h2>
              {activeBookings.length > 0 ? (
                <div className="space-y-6">
                  {activeBookings.map(booking => {
                    const listing = listings.find(l => l.id === booking.listingId);
                    return (
                      <div key={booking.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center space-y-4 md:space-y-0 md:space-x-8 flex-col md:flex-row group hover:border-nook-200 transition-all duration-300">
                        <div className="w-full md:w-40 h-32 rounded-3xl bg-slate-100 overflow-hidden">
                          <img src={listing?.images[0]?.url} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-nook-900 mb-1">{listing?.name}</h3>
                          <p className="text-sm text-slate-500 mb-4">{new Date(booking.checkIn).toLocaleDateString()} — {new Date(booking.checkOut).toLocaleDateString()}</p>
                          <div className="flex items-center space-x-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg">Confirmed</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Ref: {booking.id.split('-')[0]}</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end pr-4">
                          <div className="text-2xl font-bold text-nook-900 mb-3">${booking.totalAmount}</div>
                          <button className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-nook-600 transition-colors flex items-center space-x-1">
                            <Download size={12} /> <span>Get Invoice</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white p-16 rounded-[40px] text-center border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Calendar size={24} className="text-slate-200" />
                  </div>
                  <p className="text-slate-400 italic text-sm mb-6">You don't have any confirmed stays yet.</p>
                  <button onClick={onHome} className="bg-nook-900 text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-nook-800 transition">View Properties</button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-widest text-nook-900 mb-8 pb-4 border-b border-slate-50">Personal Info</h2>
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1 tracking-widest">Name</label>
                  <div className="text-nook-900 font-bold text-lg">{user.fullName}</div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1 tracking-widest">Email</label>
                  <div className="text-nook-900 font-medium text-sm">{user.email}</div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1 tracking-widest">Active Payment</label>
                  <div className="flex items-center space-x-3 text-nook-700 font-bold text-sm bg-nook-50 px-4 py-2 rounded-xl border border-nook-100">
                    <CreditCard size={14} />
                    <span>Mobile Money (Active)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-nook-600 to-nook-800 text-white p-10 rounded-[40px] shadow-2xl shadow-nook-900/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition duration-1000">
                <ShieldCheck size={120} />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white/50 mb-6">Community Rank</h2>
              <div className="text-4xl font-serif mb-3">{tier.name}</div>
              <p className="text-xs text-white/80 leading-relaxed mb-8">
                {tier.nextTierName 
                  ? <>{(tier.nextThreshold - activeBookings.length)} more escapes until you reach <span className="text-white font-bold">{tier.nextTierName}</span>.</>
                  : "You've reached the highest tier! Enjoy exclusive Platinum benefits."}
              </p>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="bg-white h-full shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all duration-1000" 
                  style={{ width: `${tier.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GuestDashboard;
