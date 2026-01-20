import React, { useState, useEffect } from 'react';
import { db } from '../services/mainDatabase';
import { Listing, Booking, BookingStatus, User, UserRole, ListingType, ListingImage, HouseRules, HostInfo, GuestExperience } from '../types';
import {
  LayoutDashboard, BedDouble, CalendarCheck, Users, LogOut,
  Plus, TrendingUp, CheckCircle2, Trash2,
  Camera, Save, X, Edit3, Image as ImageIcon,
  ChevronRight, ShieldCheck, Zap,
  Home, User as UserIcon, Star, Check, Database,
  Settings, ListChecks, DollarSign, FileText, Sparkles, Layers, History, ShieldAlert, Info, Loader2,
  Shield, Clock, Palette, Upload, Wand2, Monitor, Banknote, Mail, AlertTriangle, MoreHorizontal, ArrowRight
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { GoogleGenAI } from "@google/genai";

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1200';

// --- Image Compression Utility ---
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.85);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'bookings' | 'guests'>('overview');
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [heroPath, setHeroPath] = useState('');
  const [updatingHero, setUpdatingHero] = useState(false);

  // Exchange Rate State
  const [exchangeRate, setExchangeRate] = useState<number>(1750);
  const [updatingRate, setUpdatingRate] = useState(false);

  // Modals
  const [configTarget, setConfigTarget] = useState<Listing | 'new' | null>(null);
  const [userTarget, setUserTarget] = useState<User | 'new' | null>(null);

  useEffect(() => {
    refreshData();
  }, [activeTab]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [l, b, u, h, r] = await Promise.all([
        db.getListings(),
        db.getBookings(),
        db.getAllUsers(),
        db.getHeroImage(),
        db.getExchangeRate()
      ]);
      setListings(l);
      setBookings(b);
      setUsers(u);
      setHeroPath(h);
      setExchangeRate(r);
    } catch (err) {
      console.error("Critical Production Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExchangeRate = async () => {
    setUpdatingRate(true);
    try {
      await db.updateExchangeRate(exchangeRate);
      alert(`Exchange rate updated: 1 USD = ${exchangeRate} MWK`);
    } catch (err: any) {
      alert("Failed to update exchange rate: " + err.message);
    } finally {
      setUpdatingRate(false);
    }
  };

  const handleUpdateHero = async () => {
    if (!heroPath.trim()) return;
    setUpdatingHero(true);
    try {
      await db.updateHeroImage(heroPath.trim());
      alert("Landing page Hero Image successfully synchronized.");
    } catch (err: any) {
      alert("Hero Update Failed: " + err.message);
    } finally {
      setUpdatingHero(false);
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUpdatingHero(true);
    try {
      const originalFile = e.target.files[0];
      const file = await compressImage(originalFile);
      const ext = 'jpg';
      const fileName = `hero_${Date.now()}.${ext}`;
      const filePath = `site/branding/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('listing-images').upload(filePath, file, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });
      if (uploadError) throw uploadError;

      await db.updateHeroImage(filePath);
      setHeroPath(db.resolveImageUrl(filePath));
    } catch (err: any) {
      alert("Hero Image Deployment Failed: " + err.message);
    } finally {
      setUpdatingHero(false);
    }
  };

  const handleSeed = async () => {
    if (listings.length > 0 && !window.confirm("Production catalog contains data. Initialize standard Cozy Nook inventory anyway?")) return;
    setIsSeeding(true);
    try {
      await db.seedListings();
      await refreshData();
      alert("Inventory successfully deployed.");
    } catch (err: any) {
      alert("Seeding Protocol Failed: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (!window.confirm("Permanently decommission this asset? This action is irreversible.")) return;
    setLoading(true);
    try {
      await db.deleteListing(id);
      await refreshData();
    } catch (err: any) {
      alert(`Decommissioning Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("Permanently remove this user record? This cannot be undone.")) return;
    setLoading(true);
    try {
      await db.deleteUser(uid);
      await refreshData();
    } catch (err: any) {
      alert(`Deletion Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    revenue: bookings.reduce((acc, curr) => curr.status === BookingStatus.CONFIRMED ? acc + curr.totalAmount : acc, 0),
    activeBookings: bookings.filter(b => b.status === BookingStatus.CONFIRMED).length,
    totalGuests: users.length,
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-30">
        <div className="p-8 text-center border-b border-slate-50 mb-4">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-nook-900 rounded-[14px] flex items-center justify-center text-white font-serif font-bold italic shadow-xl shadow-nook-900/20 text-lg">C</div>
            <h1 className="text-xl font-bold text-nook-900 font-serif tracking-tight">The Cozy Nook</h1>
          </div>
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full inline-block mt-2">Global Controller</div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'listings', icon: BedDouble, label: 'Current Listings' },
            { id: 'bookings', icon: CalendarCheck, label: 'Reservations' },
            { id: 'guests', icon: Users, label: 'Users' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl text-sm font-bold transition-all group ${activeTab === item.id
                  ? 'bg-nook-900 text-white shadow-xl shadow-nook-900/20'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-nook-900'
                }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon size={18} /> <span>{item.label}</span>
              </div>
              {activeTab !== item.id && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-50">
          <button onClick={onLogout} className="w-full flex items-center justify-center space-x-3 px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-brand-red border border-red-50 hover:bg-red-50 transition-colors">
            <LogOut size={16} /> <span>Log Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-white">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-10 py-6 flex justify-between items-center sticky top-0 z-20">
          <div className="flex flex-col">
            <h2 className="text-2xl font-serif font-bold text-nook-900 capitalize tracking-tight">{activeTab}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Network: <span className="text-emerald-500">Encrypted Production</span></p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            {loading && <div className="animate-spin text-nook-600"><Loader2 size={20} /></div>}
            <div className="flex items-center space-x-4 pl-6 border-l border-slate-100">
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900">Root Authority</div>
                <div className="text-[9px] text-nook-600 font-black uppercase tracking-widest">Administrator</div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg"><ShieldCheck size={20} /></div>
            </div>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto space-y-12 pb-24">
          {activeTab === 'overview' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Live Revenue" value={`$${stats.revenue.toLocaleString()}`} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
                <StatCard label="Confirmed Stays" value={stats.activeBookings} icon={CalendarCheck} color="bg-blue-50 text-blue-600" />
                <StatCard label="Verified Accounts" value={stats.totalGuests} icon={Users} color="bg-violet-50 text-violet-600" />
                <div
                  onClick={() => setConfigTarget('new')}
                  className="bg-nook-900 p-8 rounded-[40px] flex flex-col justify-between cursor-pointer hover:bg-nook-800 transition-all shadow-2xl shadow-nook-900/30 group"
                >
                  <div className="bg-white/10 p-4 rounded-2xl self-start group-hover:scale-110 transition duration-500"><Plus className="text-white" size={24} /></div>
                  <h3 className="text-white font-bold text-lg tracking-tight">Add New Listing</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Branding Control */}
                <div className="bg-white p-12 rounded-[50px] border border-slate-100 shadow-sm flex flex-col space-y-8">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Palette size={24} /></div>
                    <h3 className="text-xl font-bold text-slate-900 font-serif">Sanctuary Branding</h3>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Main Hero Path or URL</label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={heroPath}
                        onChange={(e) => setHeroPath(e.target.value)}
                        placeholder="site/branding/hero.jpg"
                        className="flex-1 px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-[20px] outline-none text-sm font-medium transition-all"
                      />
                      <button
                        onClick={handleUpdateHero}
                        disabled={updatingHero}
                        className="px-6 py-4 bg-nook-900 text-white rounded-[20px] font-bold text-xs uppercase tracking-widest hover:bg-nook-800 transition-all shadow-lg disabled:opacity-50"
                      >
                        {updatingHero ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <label className="cursor-pointer flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-nook-600 hover:text-nook-800 transition">
                        <Upload size={14} />
                        <span>Upload New Hero Asset</span>
                        <input type="file" hidden accept="image/*" onChange={handleHeroUpload} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Financial Control */}
                <div className="bg-white p-12 rounded-[50px] border border-slate-100 shadow-sm flex flex-col space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-nook-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
                  <div className="flex items-center space-x-4 relative z-10">
                    <div className="p-4 bg-nook-50 text-nook-600 rounded-2xl"><Banknote size={24} /></div>
                    <h3 className="text-xl font-bold text-slate-900 font-serif">Financial Strategy</h3>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Base Exchange Rate (USD to MWK)</label>
                    <div className="flex items-center space-x-4 bg-slate-50 p-2 rounded-[24px] border-2 border-transparent focus-within:border-nook-600 focus-within:bg-white transition-all">
                      <div className="pl-6 font-bold text-slate-400 text-sm">1 USD = </div>
                      <input
                        type="number"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(Number(e.target.value))}
                        className="flex-1 py-3 bg-transparent outline-none font-bold text-nook-900 text-lg"
                      />
                      <div className="pr-6 font-bold text-slate-400 text-xs uppercase tracking-widest">MWK</div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium ml-2">Updates propagate instantly to the booking engine.</p>

                    <button
                      onClick={handleUpdateExchangeRate}
                      disabled={updatingRate}
                      className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {updatingRate ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      <span>Update Live Rate</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white p-12 rounded-[50px] border border-slate-100 shadow-sm flex items-center justify-between group col-span-1 lg:col-span-2">
                  <div className="flex items-center space-x-8">
                    <div className="p-6 bg-slate-50 text-nook-600 rounded-[32px] group-hover:bg-nook-50 transition-colors"><Database size={32} /></div>
                    <div>
                      <h3 className="text-xl font-serif font-bold text-slate-900 mb-1">Production Inventory Seed</h3>
                      <p className="text-[11px] text-slate-400 font-medium">Reset the live catalog with standard Malawian hospitality assets.</p>
                    </div>
                  </div>
                  <button
                    disabled={isSeeding}
                    onClick={handleSeed}
                    className="px-8 py-5 bg-white border-2 border-slate-100 text-nook-900 font-black uppercase tracking-widest text-[10px] rounded-[24px] hover:border-nook-600 hover:text-nook-600 transition flex items-center space-x-3 shadow-sm"
                  >
                    {isSeeding ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listings' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex justify-between items-end bg-white p-12 rounded-[50px] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">All Listings</h3>
                  <p className="text-sm text-slate-400 font-medium mt-1">Status and management of all property units.</p>
                </div>
                <button
                  onClick={() => setConfigTarget('new')}
                  className="flex items-center space-x-3 bg-slate-900 text-white px-10 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-black transition shadow-2xl shadow-slate-900/20"
                >
                  <Plus size={18} /> <span>Add New Listing</span>
                </button>
              </div>

              {listings.length === 0 ? (
                <div className="bg-white p-24 rounded-[50px] border-2 border-dashed border-slate-100 text-center flex flex-col items-center">
                  <Layers size={56} className="text-slate-100 mb-6" />
                  <p className="text-slate-400 font-medium italic mb-8">No property assets detected in the live catalog.</p>
                  <button onClick={handleSeed} className="bg-nook-900 text-white px-10 py-4 rounded-2xl font-bold shadow-xl">Initialize Deployment</button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {listings.map(listing => {
                    const activeThumb = (listing.images && listing.images.length > 0 && listing.images[0].url)
                      ? listing.images[0].url
                      : FALLBACK_IMAGE;

                    return (
                      <div key={listing.id} className="bg-white rounded-[44px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group hover:-translate-y-2">
                        <div className="h-72 bg-slate-50 relative overflow-hidden cursor-pointer" onClick={() => setConfigTarget(listing)}>
                          <img
                            src={activeThumb}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-[1500ms]"
                            alt={listing.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                            }}
                          />
                          <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-nook-900 shadow-sm border border-slate-100">
                            Listing
                          </div>
                          <div className="absolute top-6 right-6 bg-slate-900/90 backdrop-blur-md px-5 py-2.5 rounded-2xl text-[12px] font-bold text-emerald-400 shadow-xl border border-white/10">
                            ${listing.price}<span className="text-[10px] text-white/40 ml-1 font-medium">/ NT</span>
                          </div>
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center space-x-4 backdrop-blur-sm">
                            <button onClick={(e) => { e.stopPropagation(); setConfigTarget(listing); }} className="bg-white text-slate-900 p-5 rounded-[24px] hover:scale-110 transition shadow-2xl"><Edit3 size={20} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteListing(listing.id); }} className="bg-brand-red text-white p-5 rounded-[24px] hover:scale-110 transition shadow-2xl"><Trash2 size={20} /></button>
                          </div>
                        </div>
                        <div className="p-10 cursor-pointer" onClick={() => setConfigTarget(listing)}>
                          <div className="flex justify-between items-center mb-5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-nook-600 bg-nook-50 px-4 py-1.5 rounded-xl border border-nook-100">{listing.type}</span>
                            <div className="flex items-center space-x-2 text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                              <ImageIcon size={14} /> <span>{(listing.images || []).length} Images</span>
                            </div>
                          </div>
                          <h4 className="text-2xl font-serif font-bold text-slate-900 mb-3 tracking-tight">{listing.name}</h4>
                          <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed font-medium">{listing.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-white p-12 rounded-[50px] border border-slate-100 shadow-sm">
                <h3 className="text-3xl font-serif font-bold text-slate-900 tracking-tight mb-2">Reservations</h3>
                <p className="text-sm text-slate-400 font-medium">Global booking ledger.</p>
              </div>

              <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Ref ID</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Guest</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Listing</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Dates</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {bookings.map(booking => {
                      const guest = users.find(u => u.uid === booking.userId);
                      const listing = listings.find(l => l.id === booking.listingId);
                      return (
                        <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6 text-xs font-bold text-slate-500 font-mono">#{booking.id.substring(0, 6)}</td>
                          <td className="px-8 py-6">
                            <div className="font-bold text-slate-900 text-sm">{guest?.fullName || 'Unknown'}</div>
                            <div className="text-[10px] text-slate-400">{guest?.email}</div>
                          </td>
                          <td className="px-8 py-6 text-xs font-medium text-slate-600">{listing?.name || booking.listingId}</td>
                          <td className="px-8 py-6 text-xs text-slate-500">
                            {new Date(booking.checkIn).toLocaleDateString()} <ArrowRight size={10} className="inline mx-1" /> {new Date(booking.checkOut).toLocaleDateString()}
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${booking.status === BookingStatus.CONFIRMED ? 'bg-emerald-50 text-emerald-600' :
                                booking.status === BookingStatus.PENDING ? 'bg-amber-50 text-amber-600' :
                                  'bg-red-50 text-brand-red'
                              }`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right font-bold text-nook-900 text-sm">${booking.totalAmount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {bookings.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-sm italic">No records found.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'guests' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex justify-between items-end bg-white p-12 rounded-[50px] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-3xl font-serif font-bold text-slate-900 tracking-tight mb-2">User Registry</h3>
                  <p className="text-sm text-slate-400 font-medium">Manage permissions and guest profiles.</p>
                </div>
                <button
                  onClick={() => setUserTarget('new')}
                  className="flex items-center space-x-3 bg-nook-900 text-white px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-nook-800 transition shadow-lg"
                >
                  <Plus size={16} /> <span>Add User</span>
                </button>
              </div>

              <div className="grid gap-6">
                {users.map(user => (
                  <div key={user.uid} className="bg-white p-8 rounded-[32px] border border-slate-100 flex items-center justify-between hover:border-nook-100 transition-all shadow-sm">
                    <div className="flex items-center space-x-6">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 flex items-center space-x-3">
                          <span>{user.fullName}</span>
                          {user.role === UserRole.ADMIN && <ShieldCheck size={16} className="text-emerald-500" />}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-1 text-slate-400 text-xs">
                            <Mail size={12} /> <span>{user.email}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${user.isSuspended ? 'bg-red-50 text-brand-red border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                            }`}>
                            {user.isSuspended ? 'Suspended' : 'Active'}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 bg-slate-50 px-2 py-0.5 rounded">{user.role}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setUserTarget(user)}
                        className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-nook-600 hover:border-nook-200 transition"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.uid)}
                        className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-red hover:border-red-100 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Listing Config Modal */}
      {configTarget && (
        <AssetConfigModule
          target={configTarget === 'new' ? null : configTarget}
          onClose={() => setConfigTarget(null)}
          onComplete={async () => {
            await refreshData();
            setConfigTarget(null);
          }}
        />
      )}

      {/* User Config Modal */}
      {userTarget && (
        <UserConfigModule
          target={userTarget === 'new' ? null : userTarget}
          onClose={() => setUserTarget(null)}
          onComplete={async () => {
            await refreshData();
            setUserTarget(null);
          }}
        />
      )}
    </div>
  );
};

// ... Helper Components ...
function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-10 rounded-[44px] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-nook-200 transition-all duration-500 group">
      <div className={`p-5 rounded-[22px] shadow-sm self-start mb-8 group-hover:scale-110 transition-transform ${color}`}><Icon size={26} /></div>
      <div>
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">{label}</span>
        <div className="text-4xl font-serif font-bold text-slate-900 tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function ContentSection({ icon: Icon, title }: { icon: any, title: string }) {
  return (
    <div className="flex items-center space-x-6 border-l-[6px] border-nook-600 pl-8 mb-4">
      <div className="p-3 bg-nook-50 text-nook-600 rounded-[14px] shadow-sm"><Icon size={20} /></div>
      <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] font-bold">{title}</h4>
    </div>
  );
}

function InputGroup({ label, type = 'text', value, onChange, placeholder, options }: any) {
  const base = "w-full px-10 py-6 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-[32px] outline-none font-bold text-nook-900 transition-all placeholder:text-slate-200";

  return (
    <div className="space-y-4">
      <label className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] ml-3 font-bold">{label}</label>
      {type === 'textarea' ? (
        <textarea rows={5} className={`${base} resize-none leading-relaxed`} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : type === 'select' ? (
        <select className={base} value={value} onChange={e => onChange(e.target.value)}>
          {options.map((o: string) => <option key={o} value={o} className="capitalize">{o}</option>)}
        </select>
      ) : (
        <input type={type} className={base} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function OperationalToggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center space-x-5 group text-left">
      <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center transition-all border-2 ${checked ? 'bg-nook-900 border-nook-900 shadow-xl shadow-nook-900/20' : 'bg-white border-slate-200 group-hover:border-nook-300'}`}>
        {checked ? <Check size={24} className="text-white" /> : <History size={24} className="text-slate-100" />}
      </div>
      <div>
        <span className={`text-[11px] font-black uppercase tracking-widest transition-colors block font-bold ${checked ? 'text-nook-900' : 'text-slate-400'}`}>{label}</span>
        <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">{checked ? 'Authorized' : 'Restricted'}</span>
      </div>
    </button>
  );
}

// --- NEW COMPONENT: User Config Module ---
interface UserConfigModuleProps {
  target: User | null;
  onClose: () => void;
  onComplete: () => Promise<void>;
}

const UserConfigModule: React.FC<UserConfigModuleProps> = ({ target, onClose, onComplete }) => {
  const [draft, setDraft] = useState<Partial<User>>(target || {
    fullName: '',
    email: '',
    role: UserRole.GUEST,
    isSuspended: false
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (target) {
        // Update
        if (!draft.uid) throw new Error("Invalid User ID");
        await db.updateUser(draft as User);
      } else {
        // Create
        await db.createManualProfile(draft);
      }
      await onComplete();
    } catch (e: any) {
      alert("Operation failed: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 border border-white/20">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-2xl font-serif font-bold text-nook-900 mb-1">{target ? 'Edit Profile' : 'New User'}</h3>
            <p className="text-slate-400 text-sm">{target ? 'Modify existing permissions.' : 'Create a manual profile record.'}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100 transition"><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="space-y-6">
          <InputGroup
            label="Full Name"
            value={draft.fullName}
            onChange={(v: string) => setDraft({ ...draft, fullName: v })}
            placeholder="John Doe"
          />
          <InputGroup
            label="Email Address"
            value={draft.email}
            onChange={(v: string) => setDraft({ ...draft, email: v })}
            placeholder="john@example.com"
          />

          <div className="grid grid-cols-2 gap-6">
            <InputGroup
              label="System Role"
              type="select"
              options={Object.values(UserRole)}
              value={draft.role}
              onChange={(v: string) => setDraft({ ...draft, role: v as UserRole })}
            />
            <div className="pt-2">
              <label className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] ml-3 font-bold block mb-4">Account Status</label>
              <OperationalToggle
                label="Suspension"
                checked={!!draft.isSuspended}
                onChange={(v) => setDraft({ ...draft, isSuspended: v })}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 flex space-x-4">
          <button onClick={onClose} className="flex-1 py-4 bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-100 transition">Cancel</button>
          <button
            onClick={handleSave}
            disabled={isSaving || !draft.fullName}
            className="flex-[2] py-4 bg-nook-900 text-white font-bold uppercase text-[10px] tracking-widest rounded-2xl hover:bg-nook-800 transition disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-nook-900/20"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            <span>{target ? 'Update Profile' : 'Create User'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ... Helper Components (AssetConfigModule, StatCard, etc) remain unchanged ...
interface AssetConfigModuleProps {
  target: Listing | null;
  onClose: () => void;
  onComplete: () => Promise<void>;
}

const AssetConfigModule: React.FC<AssetConfigModuleProps> = ({ target, onClose, onComplete }) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'media' | 'commercials' | 'operations' | 'host'>('identity');
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const [draft, setDraft] = useState<Listing>(target || {
    id: `unit_${Date.now()}`,
    name: '',
    type: ListingType.ROOM,
    price: 150,
    description: '',
    shortSummary: '',
    amenities: ['Solar Power', 'Pure Borehole Water', 'Backup Security', 'Satellite TV'],
    images: [],
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    address: 'Green Corner, Blantyre, Malawi',
    checkInMethod: 'Concierge Greeting',
    checkInTime: '14:00',
    checkOutTime: '10:00',
    cleaningFee: 35,
    securityDeposit: 100,
    minStay: 1,
    maxStay: 28,
    houseRules: {
      smokingAllowed: false,
      petsAllowed: false,
      eventsAllowed: false,
      quietHoursStart: '21:00',
      quietHoursEnd: '07:00',
      additionalNotes: 'Welcome to our peaceful sanctuary. Please respect our eco-friendly protocols.'
    },
    hostInfo: {
      displayName: 'Cozy Nook Operations',
      avatarUrl: '',
      responseTime: 'Instant Response',
      languages: ['English', 'Chichewa'],
      verified: true
    },
    guestExperience: {
      welcomeGuide: 'Thank you for choosing The Cozy Nook. Your stay supports our local Green Initiatives.',
      localTips: 'The best fresh morning tea is served in the local square at sunrise.',
      airportPickupAvailable: true,
      earlyCheckInAvailable: true
    }
  });

  const handleAiRefineText = async (field: 'shortSummary' | 'description') => {
    if (!draft.name) {
      alert("Provide a Unit Name first to help the AI contextualize.");
      return;
    }
    setIsAiGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Act as a luxury hospitality copywriter. Generate a compelling, high-end ${field === 'shortSummary' ? 'one-sentence summary' : 'multiline description'} for a property named "${draft.name}" which is a "${draft.type}". Focus on elegance, comfort, and the Malawian sanctuary vibe. Keep it professional.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      const refinedText = response.text?.trim() || "";
      if (refinedText) {
        setDraft(prev => ({ ...prev, [field]: refinedText }));
      }
    } catch (err: any) {
      alert("AI Copywriting Failed: " + err.message);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAiGenerateImage = async () => {
    if (!draft.name) {
      alert("Identify the unit first (name) to generate a relevant photo.");
      return;
    }
    setIsAiGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `A professional, ultra-luxury high-resolution architectural photograph of a "${draft.name}" which is a ${draft.type} at an upscale Malawian resort. Cinematic lighting, minimalist modern interior with high-quality wood and stone materials. 4k, photorealistic, elegant.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
      });

      let base64Data = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Data = part.inlineData.data;
          break;
        }
      }

      if (!base64Data) throw new Error("No image data returned from AI");

      // Convert base64 to Blob for Supabase upload
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const file = new File([blob], `ai_${Date.now()}.png`, { type: 'image/png' });

      // Compress AI image too, just in case
      const compressedFile = await compressImage(file);

      // Upload to storage
      const safeDir = draft.id.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `ai-asset-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${safeDir}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('listing-images').upload(filePath, compressedFile, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });
      if (uploadError) throw uploadError;

      const newAsset: ListingImage = {
        path: filePath,
        url: db.resolveImageUrl(filePath),
        caption: `AI Generated Concept for ${draft.name}`,
        isAiGenerated: true
      };

      setDraft(prev => ({
        ...prev,
        images: [...(prev.images || []), newAsset]
      }));
    } catch (err: any) {
      alert("AI Image Generation Failed: " + err.message);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const files = Array.from(e.target.files) as File[];
      const uploadedAssets: ListingImage[] = [];
      const safeDir = draft.id.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      for (const originalFile of files) {
        // Compress and resize before uploading
        const file = await compressImage(originalFile);

        const ext = 'jpg';
        const fileName = `asset-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `${safeDir}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('listing-images').upload(filePath, file, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });
        if (uploadError) throw uploadError;

        uploadedAssets.push({
          path: filePath,
          url: db.resolveImageUrl(filePath),
          caption: '',
          isAiGenerated: false
        });
      }

      setDraft(prev => {
        const newImages = [...uploadedAssets, ...(prev.images || [])];
        return { ...prev, images: newImages };
      });
    } catch (err: any) {
      alert("Asset Deployment Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePersist = async () => {
    if (!draft.name || draft.name.length < 5) {
      alert("Deployment Aborted: A professional unit name (min 5 chars) is required.");
      setActiveTab('identity');
      return;
    }
    setIsSaving(true);
    try {
      await db.saveListing(draft);
      await onComplete();
    } catch (err: any) {
      alert("Database Synchronization Failure: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const menu = [
    { id: 'identity', label: 'Unit Identity', icon: Home, desc: 'Naming & Specs' },
    { id: 'media', label: 'Media Wall', icon: ImageIcon, desc: 'Visual Assets' },
    { id: 'commercials', label: 'Commercials', icon: DollarSign, desc: 'Pricing & Tiers' },
    { id: 'operations', label: 'Stay Protocols', icon: Shield, desc: 'Rules & Check-in' },
    { id: 'host', label: 'Host Authority', icon: UserIcon, desc: 'Profile Management' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-7xl rounded-[60px] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.4)] flex h-full max-h-[920px] overflow-hidden border border-white/20">
        <aside className="w-80 bg-[#FBFBFE] border-r border-slate-100 flex flex-col p-12">
          <div className="mb-14">
            <div className="text-[10px] text-nook-600 font-black uppercase tracking-[0.3em] mb-3">System Module</div>
            <h3 className="text-3xl font-serif text-slate-900 font-bold mb-1">{target ? 'Edit Asset' : 'New Unit'}</h3>
            <div className="h-1.5 w-12 bg-nook-900 rounded-full mt-4"></div>
          </div>

          <div className="flex-1 space-y-4">
            {menu.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center space-x-5 p-5 rounded-[28px] transition-all text-left group ${activeTab === item.id
                    ? 'bg-nook-900 text-white shadow-2xl shadow-nook-900/20 translate-x-2'
                    : 'text-slate-400 hover:bg-white hover:text-nook-900 hover:shadow-sm'
                  }`}
              >
                <div className={`p-3 rounded-2xl transition-colors ${activeTab === item.id ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-nook-50'}`}>
                  <item.icon size={20} />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider">{item.label}</div>
                  <div className={`text-[10px] opacity-60 font-bold mt-0.5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`}>{item.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-10 p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center space-x-4">
            <div className="p-2.5 bg-white text-emerald-500 rounded-xl shadow-sm"><CheckCircle2 size={16} /></div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Draft Auto-Saved</div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
          <header className="px-14 py-12 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
            <div>
              <h4 className="text-4xl font-serif text-slate-900 font-bold tracking-tight capitalize">{activeTab} Details</h4>
              <p className="text-sm text-slate-400 font-medium mt-1">Configure unit parameters for live production cataloging.</p>
            </div>
            <button
              onClick={onClose}
              className="w-14 h-14 bg-slate-50 text-slate-300 rounded-[20px] flex items-center justify-center hover:bg-red-50 hover:text-brand-red transition-all hover:rotate-90"
            >
              <X size={28} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-14 pb-14 space-y-16 custom-scrollbar">
            {activeTab === 'identity' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <ContentSection icon={Sparkles} title="Location" />
                <div className="grid md:grid-cols-2 gap-10">
                  <InputGroup label="Unit Display Name" value={draft.name} onChange={v => setDraft({ ...draft, name: v })} placeholder="The Ivory Oasis Penthouse" />
                  <InputGroup label="Asset Category" type="select" options={['house', 'room', 'apartment', 'studio']} value={draft.type} onChange={v => setDraft({ ...draft, type: v as ListingType })} />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center pr-3">
                    <label className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] ml-3 font-bold">Marketing Summary</label>
                    <button
                      onClick={() => handleAiRefineText('shortSummary')}
                      disabled={isAiGenerating}
                      className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-nook-600 hover:text-nook-800 transition disabled:opacity-50"
                    >
                      {isAiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      <span>Refine with AI</span>
                    </button>
                  </div>
                  <input className="w-full px-10 py-6 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-[32px] outline-none font-bold text-nook-900 transition-all" value={draft.shortSummary} onChange={e => setDraft({ ...draft, shortSummary: e.target.value })} placeholder="A magnificent 4-bedroom escape..." />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center pr-3">
                    <label className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] ml-3 font-bold">Extended Description</label>
                    <button
                      onClick={() => handleAiRefineText('description')}
                      disabled={isAiGenerating}
                      className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-nook-600 hover:text-nook-800 transition disabled:opacity-50"
                    >
                      {isAiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      <span>Compose with AI</span>
                    </button>
                  </div>
                  <textarea rows={5} className="w-full px-10 py-6 bg-slate-50 border-2 border-transparent focus:border-nook-600 focus:bg-white rounded-[32px] outline-none font-bold text-nook-900 transition-all resize-none leading-relaxed" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Detail the luxury elements..." />
                </div>

                <ContentSection icon={Settings} title="Architecture Specs" />
                <div className="grid grid-cols-4 gap-8">
                  <InputGroup label="Bedrooms" type="number" value={draft.bedrooms} onChange={v => setDraft({ ...draft, bedrooms: Number(v) })} />
                  <InputGroup label="Bathrooms" type="number" value={draft.bathrooms} onChange={v => setDraft({ ...draft, bathrooms: Number(v) })} />
                  <InputGroup label="Max Guests" type="number" value={draft.maxGuests} onChange={v => setDraft({ ...draft, maxGuests: Number(v) })} />
                  <InputGroup label="Min Stay" type="number" value={draft.minStay} onChange={v => setDraft({ ...draft, minStay: Number(v) })} />
                </div>

                <ContentSection icon={ListChecks} title="Amenities & Features" />
                <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 space-y-6">
                  {(!draft.amenities || draft.amenities.length === 0) && (
                    <p className="text-sm text-slate-400 italic font-medium text-center py-4">No amenities listed yet. Add features like 'WiFi', 'Pool', etc.</p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {(draft.amenities || []).map((amenity, i) => (
                      <span key={i} className="pl-4 pr-2 py-2 bg-white rounded-xl text-xs font-bold text-nook-900 shadow-sm flex items-center space-x-2 border border-slate-100 group animate-in zoom-in duration-300">
                        <span>{amenity}</span>
                        <button
                          onClick={() => {
                            const newAmenities = [...(draft.amenities || [])];
                            newAmenities.splice(i, 1);
                            setDraft({ ...draft, amenities: newAmenities });
                          }}
                          className="p-1 rounded-full text-slate-300 hover:bg-red-50 hover:text-brand-red transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Add a new feature (e.g. 'Ocean View')..."
                      className="flex-1 px-6 py-4 bg-white border-2 border-slate-100 focus:border-nook-600 rounded-[24px] outline-none text-sm font-bold text-nook-900 transition-all placeholder:text-slate-300"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget;
                          const val = input.value.trim();
                          if (val && !(draft.amenities || []).includes(val)) {
                            setDraft({ ...draft, amenities: [...(draft.amenities || []), val] });
                            input.value = '';
                          }
                        }
                      }}
                      id="amenity-input"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('amenity-input') as HTMLInputElement;
                        const val = input.value.trim();
                        if (val && !(draft.amenities || []).includes(val)) {
                          setDraft({ ...draft, amenities: [...(draft.amenities || []), val] });
                          input.value = '';
                        }
                      }}
                      className="px-6 py-4 bg-nook-900 text-white rounded-[24px] font-bold text-xs uppercase tracking-widest hover:bg-nook-800 transition shadow-lg hover:shadow-xl active:scale-95"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex justify-between items-center">
                  <ContentSection icon={ImageIcon} title="Production Asset Gallery" />
                  <button
                    onClick={handleAiGenerateImage}
                    disabled={isAiGenerating}
                    className="flex items-center space-x-3 bg-gradient-to-r from-nook-600 to-nook-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition shadow-xl shadow-nook-900/20 disabled:opacity-50"
                  >
                    {isAiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                    <span>Magic AI Generator</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {(draft.images || []).map((img, idx) => (
                    <div key={`${idx}-${img.url}`} className={`group relative aspect-video rounded-[40px] overflow-hidden bg-slate-50 border-4 transition-all duration-500 ${idx === 0 ? 'border-nook-600 ring-[12px] ring-nook-50/50 shadow-2xl' : 'border-slate-50 hover:border-nook-200'}`}>
                      <img
                        src={img.url || FALLBACK_IMAGE}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-[1500ms]"
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                        }}
                      />
                      <div className="absolute top-5 left-5 flex flex-col space-y-2">
                        {idx === 0 && <div className="bg-nook-900 text-white text-[9px] font-black uppercase tracking-[0.25em] px-4 py-2 rounded-full shadow-xl border border-white/20">Active Thumbnail</div>}
                        <div className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg border backdrop-blur-md flex items-center space-x-1.5 ${img.isAiGenerated ? 'bg-violet-600/90 text-white border-violet-400/30' : 'bg-emerald-600/90 text-white border-emerald-400/30'}`}>
                          {img.isAiGenerated ? <Sparkles size={10} /> : <Monitor size={10} />}
                          <span>{img.isAiGenerated ? 'AI Generated' : 'Manual Upload'}</span>
                        </div>
                      </div>

                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center space-x-4 backdrop-blur-sm">
                        {idx !== 0 && (
                          <button onClick={() => {
                            const reorder = [...(draft.images || [])];
                            const [move] = reorder.splice(idx, 1);
                            reorder.unshift(move);
                            setDraft(prev => ({ ...prev, images: reorder }));
                          }} className="p-4 bg-white text-nook-900 rounded-[20px] hover:scale-110 transition shadow-2xl" title="Set as Primary Thumbnail">
                            <Star size={20} className="fill-current text-nook-600" />
                          </button>
                        )}
                        <button onClick={() => setDraft(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }))} className="p-4 bg-white text-brand-red rounded-[20px] hover:scale-110 transition shadow-2xl" title="Delete Asset">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <label className={`aspect-video border-2 border-dashed rounded-[40px] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-nook-50 hover:border-nook-600 border-slate-200 group relative ${uploading ? 'opacity-50 cursor-wait bg-slate-50' : ''}`}>
                    {uploading ? (
                      <div className="flex flex-col items-center space-y-4">
                        <Loader2 className="animate-spin text-nook-600" size={40} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-nook-600">Optimizing Asset...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-5 shadow-sm border border-slate-50 group-hover:scale-110 group-hover:shadow-xl transition-all duration-500">
                          <Camera className="text-slate-200 group-hover:text-nook-600 transition" size={28} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 group-hover:text-nook-900 text-center px-4 leading-relaxed font-bold">Deploy Persistent Assets</span>
                      </>
                    )}
                    <input type="file" hidden multiple accept="image/*" onChange={handleMediaUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'commercials' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <ContentSection icon={DollarSign} title="Commercial Strategy" />
                <div className="grid md:grid-cols-2 gap-10">
                  <InputGroup label="Base Nightly Rate (USD)" type="number" value={draft.price} onChange={v => setDraft({ ...draft, price: Number(v) })} />
                  <InputGroup label="Mandatory Cleaning Fee" type="number" value={draft.cleaningFee} onChange={v => setDraft({ ...draft, cleaningFee: Number(v) })} />
                </div>
              </div>
            )}

            {activeTab === 'operations' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <ContentSection icon={ShieldAlert} title="Unit Guidelines" />
                <div className="bg-[#FBFBFE] p-12 rounded-[50px] grid md:grid-cols-3 gap-10 border border-slate-100 shadow-sm">
                  <OperationalToggle label="Smoking Protocol" checked={draft.houseRules.smokingAllowed} onChange={v => setDraft({ ...draft, houseRules: { ...draft.houseRules, smokingAllowed: v } })} />
                  <OperationalToggle label="Pet Policy" checked={draft.houseRules.petsAllowed} onChange={v => setDraft({ ...draft, houseRules: { ...draft.houseRules, petsAllowed: v } })} />
                  <OperationalToggle label="Event Authorization" checked={draft.houseRules.eventsAllowed} onChange={v => setDraft({ ...draft, houseRules: { ...draft.houseRules, eventsAllowed: v } })} />
                </div>
              </div>
            )}

            {activeTab === 'host' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <ContentSection icon={UserIcon} title="Host Attribution" />
                <InputGroup label="Sanctuary Welcome Guide" type="textarea" value={draft.guestExperience.welcomeGuide} onChange={v => setDraft({ ...draft, guestExperience: { ...draft.guestExperience, welcomeGuide: v } })} placeholder="Compose a world-class welcome message..." />
              </div>
            )}
          </div>

          <footer className="p-12 border-t border-slate-50 bg-white/80 backdrop-blur-xl flex space-x-8 sticky bottom-0 z-20">
            <button onClick={onClose} className="flex-1 py-6 bg-white border border-slate-200 text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] rounded-[30px] hover:bg-slate-50 transition shadow-sm font-bold">Discard Changes</button>
            <button
              onClick={handlePersist}
              disabled={isSaving}
              className="flex-[2] py-6 bg-nook-900 text-white font-black uppercase text-[11px] tracking-[0.3em] rounded-[30px] hover:bg-nook-800 transition shadow-[0_25px_50px_-12px_rgba(23,177,105,0.4)] flex items-center justify-center space-x-4 disabled:opacity-50 disabled:cursor-wait group font-bold"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} className="group-hover:scale-110 transition" />}
              <span>{isSaving ? 'Deploying...' : 'Save Listing'}</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;