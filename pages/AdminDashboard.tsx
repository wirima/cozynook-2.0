
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDatabase';
import { Listing, Booking, BookingStatus, User, UserRole, ListingType, ListingImage, HouseRules, HostInfo, GuestExperience } from '../types';
import { 
  LayoutDashboard, BedDouble, CalendarCheck, Users, LogOut, 
  Plus, TrendingUp, CheckCircle2, XCircle, Trash2, 
  Camera, Save, X, Edit3, Image as ImageIcon,
  ChevronRight, ArrowUpRight, ShieldCheck, Zap,
  MapPin, Clock, Home, Info, User as UserIcon, Star, Check, Globe, Shield, Plane, Coffee, AlertCircle, Loader2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'bookings' | 'guests'>('overview');
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [occupancy, setOccupancy] = useState<{date: string, listingId: string}[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState<string>('');
  const [heroUploading, setHeroUploading] = useState(false);
  
  const [isEditingListing, setIsEditingListing] = useState<Listing | null>(null);
  const [isAddingListing, setIsAddingListing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshData();
  }, [activeTab]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [l, b, o, u, hero] = await Promise.all([
        db.getListings(),
        db.getBookings(),
        db.getOccupiedDates(),
        db.getAllUsers(),
        db.getHeroImage()
      ]);
      setListings(l);
      setBookings(b);
      setOccupancy(o);
      setUsers(u);
      setHeroImageUrl(hero);
    } finally {
      setLoading(false);
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setHeroUploading(true);
    try {
      const file = e.target.files[0];
      const filePath = `hero/landing-hero-${Date.now()}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage.from('listing-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(filePath);
      
      // Save to site_config
      await db.updateHeroImage(publicUrl);
      
      // Update local state and UI
      setHeroImageUrl(publicUrl);
      alert("Landing page hero image updated successfully!");
      refreshData();
    } catch (err: any) {
      console.error("Hero upload failed:", err);
      alert("Hero upload failed: " + err.message);
    } finally {
      setHeroUploading(false);
    }
  };

  const handleRoleUpdate = async (uid: string, role: UserRole) => {
    try {
      await db.updateUserRole(uid, role);
      await refreshData();
    } catch (e) {
      alert("Unauthorized or failed to update role.");
    }
  };

  const handleSuspendToggle = async (user: User) => {
    try {
      await db.suspendUser(user.uid, !user.isSuspended);
      await refreshData();
    } catch (e) {
      alert("Failed to update suspension status.");
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm("Permanently delete this user's profile and data? This cannot be undone.")) {
      try {
        await db.deleteUser(uid);
        await refreshData();
      } catch (e) {
        alert("Failed to delete user profile.");
      }
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (window.confirm("Permanent Action: Are you sure you want to remove this property?")) {
      await db.deleteListing(id);
      await refreshData();
    }
  };

  const stats = {
    revenue: bookings.reduce((acc, curr) => curr.status === BookingStatus.CONFIRMED ? acc + curr.totalAmount : acc, 0),
    activeBookings: bookings.filter(b => b.status === BookingStatus.CONFIRMED).length,
    totalGuests: users.length,
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar omitted for brevity, logic remains same */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-30">
        <div className="p-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-nook-600 rounded-lg flex items-center justify-center text-white font-serif font-bold italic">C</div>
            <h1 className="text-xl font-bold text-nook-900 font-serif">The Cozy Nook</h1>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest bg-slate-50 inline-block px-2 py-1 rounded">Admin HQ</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Control Center' },
            { id: 'listings', icon: BedDouble, label: 'Manage Units' },
            { id: 'bookings', icon: CalendarCheck, label: 'Reservation Log' },
            { id: 'guests', icon: Users, label: 'Access Control' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl text-sm font-semibold transition-all group ${
                activeTab === item.id 
                  ? 'bg-nook-900 text-white shadow-xl shadow-nook-900/20' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-nook-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon size={18} /> <span>{item.label}</span>
              </div>
              {activeTab !== item.id && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>
          ))}
        </nav>

        <div className="p-6">
          <button onClick={onLogout} className="w-full flex items-center justify-center space-x-3 px-4 py-4 rounded-2xl text-sm font-bold text-brand-red border border-red-50 hover:bg-red-50 transition-colors">
            <LogOut size={18} /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-10 py-5 flex justify-between items-center sticky top-0 z-20">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-nook-900 capitalize tracking-tight">{activeTab.replace('-', ' ')}</h2>
            <p className="text-xs text-slate-400 font-medium italic">Operational status: <span className="text-emerald-500 font-bold">Optimal</span></p>
          </div>
          <div className="flex items-center space-x-6">
            {loading && (
              <div className="flex items-center space-x-2 bg-nook-50 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-nook-600 rounded-full animate-ping"></div>
                <span className="text-[10px] font-bold text-nook-600 uppercase tracking-widest">Syncing</span>
              </div>
            )}
            <div className="flex items-center space-x-3 pl-6 border-l border-slate-100">
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900 uppercase tracking-tight">System Admin</div>
                <div className="text-[10px] text-nook-600 font-bold uppercase">Root Authority</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-nook-900 flex items-center justify-center text-white font-bold text-sm shadow-inner shadow-black/10"><ShieldCheck size={20} /></div>
            </div>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto space-y-10 pb-20">
          {activeTab === 'overview' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Net Revenue" value={`$${stats.revenue.toLocaleString()}`} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
                <StatCard label="Active Stays" value={stats.activeBookings} icon={CalendarCheck} color="bg-blue-50 text-blue-600" />
                <StatCard label="Registered" value={stats.totalGuests} icon={Users} color="bg-violet-50 text-violet-600" />
                
                <div 
                  onClick={() => setIsAddingListing(true)}
                  className="bg-nook-900 p-8 rounded-[40px] flex flex-col justify-between cursor-pointer hover:bg-nook-800 transition-all shadow-xl shadow-nook-900/20 group"
                >
                  <div className="bg-white/10 p-4 rounded-2xl self-start group-hover:scale-110 transition duration-300">
                    <Plus className="text-white" size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">Administrative</span>
                    <h3 className="text-white font-bold text-lg">Add New Listing</h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 bg-nook-50 text-nook-600 rounded-2xl"><ImageIcon size={20}/></div>
                    <h3 className="text-lg font-bold text-slate-900">Landing Customization</h3>
                  </div>
                  <div className="flex-1 flex flex-col space-y-6">
                    <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-100 border border-slate-100 group">
                      <img src={heroImageUrl || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=2070'} className="w-full h-full object-cover" alt="Current Hero" />
                      {heroUploading && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                          <Loader2 className="animate-spin text-white" size={32} />
                        </div>
                      )}
                    </div>
                    <label className="w-full py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center space-x-3 cursor-pointer hover:border-nook-600 hover:bg-nook-50 transition-all group">
                      <Camera className="text-slate-400 group-hover:text-nook-600 transition" size={18} />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-nook-900">Change Hero Image</span>
                      <input type="file" hidden accept="image/*" onChange={handleHeroUpload} />
                    </label>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><ShieldCheck size={20}/></div>
                    <h3 className="text-lg font-bold text-slate-900">System Preferences</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="p-5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                      <div className="flex items-center space-x-3">
                        <Zap size={16} className="text-nook-600" />
                        <span className="text-sm font-bold text-slate-700">Fast Bookings</span>
                      </div>
                      <div className="w-10 h-5 bg-nook-900 rounded-full relative"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div></div>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                      <div className="flex items-center space-x-3">
                        <CalendarCheck size={16} className="text-nook-600" />
                        <span className="text-sm font-bold text-slate-700">Email Notifications</span>
                      </div>
                      <div className="w-10 h-5 bg-nook-900 rounded-full relative"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Listings Status</h3>
                    <p className="text-sm text-slate-400">Real-time occupancy across all properties</p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-3xl border border-slate-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-6 text-left text-slate-500 font-bold uppercase tracking-widest">Unit Reference</th>
                        {[0,1,2,3,4,5,6].map(i => {
                          const date = new Date();
                          date.setDate(date.getDate() + i);
                          return (
                            <th key={i} className="p-6 text-center text-slate-500 font-bold min-w-[120px]">
                              {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {listings.map(l => (
                        <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-6 font-bold text-slate-900">{l.name}</td>
                          {[0,1,2,3,4,5,6].map(i => {
                            const date = new Date();
                            date.setDate(date.getDate() + i);
                            const dayStr = date.toISOString().split('T')[0];
                            const isBooked = occupancy.some(o => o.date === dayStr && o.listingId === l.id);
                            return (
                              <td key={i} className="p-6 text-center">
                                <div className={`inline-flex items-center justify-center w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                                  isBooked 
                                    ? 'bg-red-50 text-brand-red border border-red-100' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {isBooked ? 'Occupied' : 'Vacant'}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listings' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex justify-between items-end bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-3xl font-serif text-slate-900">Portfolio Catalog</h3>
                  <p className="text-sm text-slate-400 mt-2">Design and deploy your luxury units for the public market.</p>
                </div>
                <button 
                  onClick={() => setIsAddingListing(true)}
                  className="flex items-center space-x-3 bg-nook-900 text-white px-8 py-4 rounded-2xl text-sm font-bold hover:bg-nook-800 transition shadow-2xl shadow-nook-900/30"
                >
                  <Plus size={20} /> <span>Create New Record</span>
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {listings.map(listing => (
                  <div key={listing.id} className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group">
                    <div className="h-64 bg-slate-100 relative overflow-hidden">
                      <img 
                        src={listing.images[0]?.url || 'https://picsum.photos/seed/nook/800/600'} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" 
                      />
                      <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-xl px-4 py-2 rounded-2xl text-xs font-bold text-nook-900 shadow-sm border border-slate-100">
                        ${listing.price}<span className="text-[10px] text-slate-400 ml-1">/ NT</span>
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-8">
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => setIsEditingListing(listing)} 
                            className="bg-white text-nook-900 p-4 rounded-2xl hover:bg-nook-50 transition shadow-xl"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteListing(listing.id)} 
                            className="bg-brand-red text-white p-4 rounded-2xl hover:bg-red-700 transition shadow-xl"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-8">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold text-nook-600 uppercase tracking-widest bg-nook-50 px-3 py-1 rounded-lg">{listing.type}</span>
                        <div className="flex items-center space-x-1 text-slate-300">
                          <ImageIcon size={14} />
                          <span className="text-[10px] font-bold">{listing.images.length}</span>
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 mb-2">{listing.name}</h4>
                      <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{listing.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'guests' && (
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Guest Access Control</h3>
                  <p className="text-xs text-slate-400 mt-1">Manage platform authorization and account standing.</p>
                </div>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">User Identity</th>
                    <th className="px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Platform Role</th>
                    <th className="px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.uid} className={`hover:bg-slate-50/50 transition-colors ${u.isSuspended ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                      <td className="px-10 py-7">
                        <div className="flex items-center space-x-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border uppercase ${
                            u.isSuspended ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-nook-50 text-nook-700 border-nook-100'
                          }`}>
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-base">{u.fullName}</span>
                              {u.isSuspended && (
                                <span className="bg-brand-red text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center space-x-1">
                                  <AlertCircle size={8} /> <span>Suspended</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-medium">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <select 
                          value={u.role}
                          onChange={(e) => handleRoleUpdate(u.uid, e.target.value as UserRole)}
                          className={`text-xs border rounded-2xl px-5 py-3 outline-none font-bold shadow-sm transition-all ${
                            u.role === UserRole.ADMIN ? 'bg-nook-900 text-white border-nook-900' : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value={UserRole.GUEST}>Guest</option>
                          <option value={UserRole.DELEGATE}>Delegate</option>
                          <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                      </td>
                      <td className="px-10 py-7 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button 
                            onClick={() => handleSuspendToggle(u)}
                            className={`p-3 rounded-xl transition-all border ${
                              u.isSuspended 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                                : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'
                            }`}
                            title={u.isSuspended ? "Unsuspend User" : "Suspend User"}
                          >
                            {u.isSuspended ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.uid)}
                            className="p-3 bg-red-50 text-brand-red rounded-xl border border-red-100 hover:bg-red-100 transition-all"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {(isEditingListing || isAddingListing) && (
        <ListingFormModal 
          listing={isEditingListing} 
          onClose={() => { setIsEditingListing(null); setIsAddingListing(false); }} 
          onSave={async (l) => {
            await db.saveListing(l);
            await refreshData();
            setIsEditingListing(null);
            setIsAddingListing(false);
          }}
        />
      )}
    </div>
  );
};

// ... ListingFormModal components and helpers remain unchanged ...

function CheckboxItem({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center space-x-4 group text-left">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all border-2 ${checked ? 'bg-nook-900 border-nook-900 shadow-lg shadow-nook-900/20' : 'bg-white border-slate-200 group-hover:border-nook-300'}`}>
        {checked && <Check size={20} className="text-white" />}
      </div>
      <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${checked ? 'text-nook-900' : 'text-slate-400'}`}>{label}</span>
    </button>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center space-x-4 border-l-4 border-nook-600 pl-6">
      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]">{title}</h4>
    </div>
  );
}

function InputWrapper({ label, children }: { label: string, children?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-nook-200 transition-all duration-300">
      <div className={`p-4 rounded-2xl shadow-sm self-start mb-6 ${color}`}><Icon size={24} /></div>
      <div>
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1">{label}</span>
        <div className="text-3xl font-bold text-slate-900 tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function ListingFormModal({ listing, onClose, onSave }: { listing: Listing | null, onClose: () => void, onSave: (l: Listing) => Promise<void> }) {
  const [formTab, setFormTab] = useState<'basics' | 'pricing' | 'amenities' | 'host'>('basics');
  const [formData, setFormData] = useState<Listing>(listing || {
    id: `listing_${Date.now()}`,
    name: '',
    type: ListingType.ROOM,
    price: 150,
    description: '',
    shortSummary: '',
    amenities: [],
    images: [],
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    address: '',
    checkInMethod: 'Self check-in with lockbox',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    cleaningFee: 0,
    securityDeposit: 0,
    minStay: 1,
    maxStay: 28,
    houseRules: {
      smokingAllowed: false,
      petsAllowed: false,
      eventsAllowed: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      additionalNotes: ''
    },
    hostInfo: {
      displayName: 'Cozy Host',
      avatarUrl: '',
      responseTime: 'Within an hour',
      languages: ['English'],
      verified: true
    },
    guestExperience: {
      welcomeGuide: '',
      localTips: '',
      airportPickupAvailable: false,
      earlyCheckInAvailable: false
    }
  });

  const [uploading, setUploading] = useState(false);
  const [newAmenity, setNewAmenity] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const files = Array.from(e.target.files) as File[];
      const newImages: ListingImage[] = [...formData.images];
      for (const file of files) {
        const filePath = `${formData.id}/${Math.random().toString(36).substring(7)}`;
        const { error: uploadError } = await supabase.storage.from('listing-images').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(filePath);
        newImages.push({ url: publicUrl, caption: 'Interior view' });
      }
      setFormData({ ...formData, images: newImages });
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: 'basics', label: 'Basics & Location', icon: Home },
    { id: 'pricing', label: 'Pricing & Rules', icon: Clock },
    { id: 'amenities', label: 'Amenities & Media', icon: ImageIcon },
    { id: 'host', label: 'Host & Experience', icon: UserIcon },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-hidden">
      <div className="bg-white w-full max-w-6xl rounded-[50px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500 flex h-[90vh]">
        {/* Modal Sidebar */}
        <div className="w-80 bg-slate-50 border-r border-slate-100 flex flex-col">
          <div className="p-10 border-b border-slate-100">
             <div className="text-xl font-serif font-bold text-nook-900 mb-2">{listing ? 'Edit Listing' : 'New Listing'}</div>
             <p className="text-xs text-slate-400">Refine property specifications</p>
          </div>
          <div className="flex-1 p-6 space-y-2">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setFormTab(t.id as any)}
                className={`w-full flex items-center space-x-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${
                  formTab === t.id ? 'bg-nook-900 text-white shadow-xl shadow-nook-900/20' : 'text-slate-400 hover:bg-white hover:text-nook-600'
                }`}
              >
                <t.icon size={18} /> <span>{t.label}</span>
              </button>
            ))}
          </div>
          <div className="p-8 border-t border-slate-100">
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="px-12 py-8 border-b border-slate-100 flex justify-between items-center bg-white">
            <h3 className="text-2xl font-serif text-slate-900">{tabs.find(t => t.id === formTab)?.label}</h3>
            <div className="flex items-center space-x-4">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Progress</span>
              <div className="w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-nook-600 transition-all duration-700" style={{ width: `${(tabs.findIndex(t => t.id === formTab) + 1) * 25}%` }}></div>
              </div>
            </div>
          </header>

          <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="flex-1 overflow-y-auto p-12 space-y-12">
            {formTab === 'basics' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SectionTitle title="Listings" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputWrapper label="Listing Title (Publicly Displayed)">
                    <input required className="input-nook" placeholder="e.g., Summit Luxury Sanctuary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </InputWrapper>
                  <InputWrapper label="Property Classification">
                    <select className="input-nook" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as ListingType})}>
                      <option value={ListingType.HOUSE}>Entire Estate (4-Bed)</option>
                      <option value={ListingType.ROOM}>Private Luxury Room</option>
                      <option value={ListingType.APARTMENT}>Luxury Apartment</option>
                    </select>
                  </InputWrapper>
                </div>
                <InputWrapper label="Executive Summary (Tagline)">
                  <input required className="input-nook" placeholder="One sentence capturing the essence..." value={formData.shortSummary} onChange={e => setFormData({...formData, shortSummary: e.target.value})} />
                </InputWrapper>
                <div className="grid grid-cols-3 gap-6">
                   <InputWrapper label="Bedrooms"><input type="number" className="input-nook" value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: +e.target.value})} /></InputWrapper>
                   <InputWrapper label="Bathrooms"><input type="number" className="input-nook" value={formData.bathrooms} onChange={e => setFormData({...formData, bathrooms: +e.target.value})} /></InputWrapper>
                   <InputWrapper label="Max Guests"><input type="number" className="input-nook" value={formData.maxGuests} onChange={e => setFormData({...formData, maxGuests: +e.target.value})} /></InputWrapper>
                </div>
                <SectionTitle title="Address & Location" />
                <InputWrapper label="Precise Physical Address">
                  <div className="relative">
                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input required className="input-nook pl-16" placeholder="Enter full address for verification" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                </InputWrapper>
              </div>
            )}

            {formTab === 'pricing' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SectionTitle title="Rates" />
                <div className="grid grid-cols-2 gap-8">
                  <InputWrapper label="Base Nightly Rate ($)"><input type="number" required className="input-nook" value={formData.price} onChange={e => setFormData({...formData, price: +e.target.value})} /></InputWrapper>
                  <InputWrapper label="Cleaning Fee ($)"><input type="number" className="input-nook" value={formData.cleaningFee} onChange={e => setFormData({...formData, cleaningFee: +e.target.value})} /></InputWrapper>
                </div>
                <SectionTitle title="Stay Logistics" />
                <div className="grid grid-cols-2 gap-8">
                  <InputWrapper label="Check-in Method"><input className="input-nook" value={formData.checkInMethod} onChange={e => setFormData({...formData, checkInMethod: e.target.value})} /></InputWrapper>
                  <div className="grid grid-cols-2 gap-4">
                     <InputWrapper label="Check-in"><input type="time" className="input-nook" value={formData.checkInTime} onChange={e => setFormData({...formData, checkInTime: e.target.value})} /></InputWrapper>
                     <InputWrapper label="Check-out"><input type="time" className="input-nook" value={formData.checkOutTime} onChange={e => setFormData({...formData, checkOutTime: e.target.value})} /></InputWrapper>
                  </div>
                </div>
                <SectionTitle title="Protocol & Rules" />
                <div className="bg-slate-50 p-8 rounded-[40px] grid md:grid-cols-3 gap-6 border border-slate-100">
                  <CheckboxItem label="Smoking Allowed" checked={formData.houseRules.smokingAllowed} onChange={v => setFormData({...formData, houseRules: {...formData.houseRules, smokingAllowed: v}})} />
                  <CheckboxItem label="Pets Allowed" checked={formData.houseRules.petsAllowed} onChange={v => setFormData({...formData, houseRules: {...formData.houseRules, petsAllowed: v}})} />
                  <CheckboxItem label="Events Allowed" checked={formData.houseRules.eventsAllowed} onChange={v => setFormData({...formData, houseRules: {...formData.houseRules, eventsAllowed: v}})} />
                </div>
              </div>
            )}

            {formTab === 'amenities' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SectionTitle title="Visual Assets" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="flex flex-col space-y-3 bg-slate-50 p-4 rounded-[32px] border border-slate-100 group">
                      <div className="relative aspect-video rounded-2xl overflow-hidden shadow-sm">
                        <img src={img.url} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setFormData({...formData, images: formData.images.filter((_, i) => i !== idx)})} className="absolute top-2 right-2 bg-white/90 p-2 rounded-xl text-brand-red opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-white"><Trash2 size={12} /></button>
                      </div>
                      <input 
                        className="text-[10px] font-bold uppercase tracking-widest bg-white border border-slate-100 rounded-xl outline-none py-2 px-3 text-slate-700 focus:border-nook-600 transition"
                        placeholder="Add a caption..."
                        value={img.caption}
                        onChange={(e) => {
                          const newImages = [...formData.images];
                          newImages[idx].caption = e.target.value;
                          setFormData({...formData, images: newImages});
                        }}
                      />
                    </div>
                  ))}
                  <label className="aspect-video border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-nook-600 transition bg-slate-50 group">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition duration-300">
                      <Camera className="text-slate-300 group-hover:text-nook-600 transition" size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add Photo</span>
                    <input type="file" hidden multiple onChange={handleImageUpload} />
                  </label>
                </div>
                <SectionTitle title="Amenities" />
                <div className="flex flex-wrap gap-2">
                   {formData.amenities.map((a, i) => (
                     <span key={i} className="px-4 py-2 bg-nook-50 text-nook-700 text-[10px] font-bold uppercase rounded-xl border border-nook-100 flex items-center">
                       {a} <button type="button" onClick={() => setFormData({...formData, amenities: formData.amenities.filter((_, idx) => idx !== i)})} className="ml-2 hover:text-brand-red transition-colors"><X size={12} /></button>
                     </span>
                   ))}
                </div>
                <div className="flex space-x-3">
                  <input className="flex-1 input-nook" placeholder="Add custom amenity (e.g., Infinity Pool)" value={newAmenity} onChange={e => setNewAmenity(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), setNewAmenity(''), setFormData({...formData, amenities: [...formData.amenities, newAmenity]}))} />
                  <button type="button" onClick={() => (setNewAmenity(''), setFormData({...formData, amenities: [...formData.amenities, newAmenity]}))} className="bg-nook-900 text-white p-4 rounded-2xl shadow-lg shadow-nook-900/10"><Plus size={20} /></button>
                </div>
              </div>
            )}

            {formTab === 'host' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SectionTitle title="Identity & Trust" />
                <div className="grid grid-cols-2 gap-8">
                   <InputWrapper label="Host Display Name"><input className="input-nook" value={formData.hostInfo.displayName} onChange={e => setFormData({...formData, hostInfo: {...formData.hostInfo, displayName: e.target.value}})} /></InputWrapper>
                   <InputWrapper label="Response Speed"><input className="input-nook" value={formData.hostInfo.responseTime} onChange={e => setFormData({...formData, hostInfo: {...formData.hostInfo, responseTime: e.target.value}})} /></InputWrapper>
                </div>
                <SectionTitle title="Guest Experience Nodes" />
                <InputWrapper label="Welcome Guide (Shown after booking)"><textarea className="input-nook min-h-[120px]" value={formData.guestExperience.welcomeGuide} onChange={e => setFormData({...formData, guestExperience: {...formData.guestExperience, welcomeGuide: e.target.value}})} /></InputWrapper>
                <div className="grid md:grid-cols-2 gap-6 pt-6">
                   <CheckboxItem label="Airport Pickup Available" checked={formData.guestExperience.airportPickupAvailable} onChange={v => setFormData({...formData, guestExperience: {...formData.guestExperience, airportPickupAvailable: v}})} />
                   <CheckboxItem label="Early Check-in Option" checked={formData.guestExperience.earlyCheckInAvailable} onChange={v => setFormData({...formData, guestExperience: {...formData.guestExperience, earlyCheckInAvailable: v}})} />
                </div>
              </div>
            )}
          </form>

          <footer className="p-8 border-t border-slate-100 bg-slate-50/50 flex space-x-6">
             <button type="button" onClick={onClose} className="flex-1 py-5 bg-white border border-slate-200 rounded-[30px] font-bold text-slate-400 hover:bg-slate-50 transition uppercase text-xs tracking-widest">Cancel</button>
             <button type="button" onClick={() => onSave(formData)} className="flex-[2] py-5 bg-nook-900 text-white rounded-[30px] font-bold hover:bg-nook-800 transition shadow-2xl shadow-nook-900/30 uppercase text-xs tracking-widest flex items-center justify-center space-x-3">
               <Zap size={18} /> <span>Create Listing</span>
             </button>
          </footer>
        </div>
      </div>
      <style>{`
        .input-nook {
          width: 100%;
          padding: 1.25rem 1.5rem;
          background: #f8fafc;
          border: 2px solid transparent;
          border-radius: 1.5rem;
          outline: none;
          font-weight: 600;
          color: #0f172a;
          transition: all 0.2s;
        }
        .input-nook:focus {
          background: #fff;
          border-color: #17B169;
          box-shadow: 0 10px 15px -3px rgba(23, 177, 105, 0.1);
        }
        .input-nook::placeholder {
          color: #94a3b8;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;
