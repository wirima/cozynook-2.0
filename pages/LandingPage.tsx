import React, { useState, useEffect } from 'react';
import { db } from '../services/mainDatabase';
import { Listing, User } from '../types';
import { Shield, MapPin, Star, XCircle, Loader2, Calendar, ChevronLeft, ChevronRight, X, Image as ImageIcon, LayoutGrid, Maximize2, ArrowDown, Search, Check, Clock, User as UserIcon, Info, ArrowRight, Zap, Coffee, Wifi } from 'lucide-react';
import { DEFAULT_HERO, FALLBACK_IMAGE } from '../constants';

interface LandingPageProps {
  user: User | null;
  onBook: (id: string, dates: { checkIn: string, checkOut: string }) => void;
  onLogin: () => void;
  onGuestPortal: () => void;
  onViewTerms: () => void;
  onViewPrivacy: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ user, onBook, onLogin, onGuestPortal, onViewTerms, onViewPrivacy }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({});
  const [heroImageUrl, setHeroImageUrl] = useState<string>(DEFAULT_HERO);

  // State for modals
  const [activeGallery, setActiveGallery] = useState<{ listing: Listing, index: number } | null>(null);
  const [expandedListing, setExpandedListing] = useState<Listing | null>(null);

  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [fetchedListings, fetchedHero] = await Promise.all([
          db.getListings(),
          db.getHeroImage()
        ]);
        setListings(fetchedListings);
        if (fetchedHero) setHeroImageUrl(fetchedHero);
      } catch (err) {
        console.error("Production synchronization failed:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const checkAll = async () => {
      if (listings.length === 0) return;
      const map: Record<string, boolean> = {};
      try {
        const checks = await Promise.all(
          listings.map(l => db.checkAvailability(l.id, dates.checkIn, dates.checkOut))
        );
        listings.forEach((listing, index) => {
          map[listing.id] = checks[index];
        });
        setAvailabilityMap(map);
      } catch (err) {
        console.error("Availability validation failed:", err);
      }
    };
    checkAll();
  }, [dates, listings]);

  const scrollToRooms = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('rooms');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckIn = e.target.value;
    if (!newCheckIn) return;

    setDates(prev => {
      const inDate = new Date(newCheckIn);
      const outDate = new Date(prev.checkOut);

      if (inDate >= outDate) {
        const nextDay = new Date(inDate);
        nextDay.setDate(nextDay.getDate() + 1);
        return {
          checkIn: newCheckIn,
          checkOut: nextDay.toISOString().split('T')[0]
        };
      }
      return { ...prev, checkIn: newCheckIn };
    });
  };

  const handleCheckOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckOut = e.target.value;
    if (!newCheckOut) return;

    setDates(prev => {
      const inDate = new Date(prev.checkIn);
      const outDate = new Date(newCheckOut);

      if (outDate <= inDate) {
        const prevDay = new Date(outDate);
        prevDay.setDate(prevDay.getDate() - 1);
        return {
          checkIn: prevDay.toISOString().split('T')[0],
          checkOut: newCheckOut
        };
      }
      return { ...prev, checkOut: newCheckOut };
    });
  };

  return (
    <div className="flex flex-col w-full bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-nook-100 px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-serif font-bold text-nook-900 tracking-tight">The Cozy Nook</div>
        <div className="space-x-8 text-sm font-medium text-nook-800 hidden md:flex items-center">
          {user && (
            <button onClick={onGuestPortal} className="hover:text-nook-600 transition">Guest Portal</button>
          )}
          <button onClick={onLogin} className="bg-nook-900 text-white px-6 py-2 rounded-full hover:bg-nook-800 transition shadow-lg shadow-nook-900/20">
            {user ? 'Dashboard' : 'Sign In'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center text-white pt-16">
        <div className="absolute inset-0">
          <img
            src={heroImageUrl || DEFAULT_HERO}
            key={heroImageUrl}
            className="w-full h-full object-cover brightness-[0.65]"
            alt="Hero"
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_HERO; }}
          />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-5xl md:text-8xl font-serif mb-6 leading-tight animate-in fade-in slide-in-from-top-8 duration-1000 drop-shadow-lg font-bold">
            The Cozy Nook
          </h1>
          <p className="text-xl md:text-2xl font-light mb-12 opacity-95 max-w-3xl mx-auto animate-in fade-in slide-in-from-top-4 duration-1000 delay-200 drop-shadow-md leading-relaxed">
            Off‑grid luxury living in Green Corner, Blantyre — solar powered, pure borehole water, and authentic Malawian hospitality
          </p>

          <div className="bg-white/10 backdrop-blur-2xl p-3 rounded-[32px] md:rounded-full shadow-2xl flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-3 max-w-4xl mx-auto border border-white/20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            {/* Date Picker 1 */}
            <div className="flex-1 px-8 py-4 bg-white hover:bg-slate-50 transition-all rounded-full flex items-center space-x-4 w-full text-left group shadow-lg border-2 border-transparent focus-within:border-brand-red">
              <Calendar className="text-brand-red" size={20} />
              <div className="flex-1">
                <label className="block text-[9px] uppercase tracking-[0.2em] text-slate-400 font-black mb-0.5">Check In</label>
                <input
                  type="date"
                  className="w-full bg-transparent text-nook-900 focus:outline-none cursor-pointer text-sm font-bold [color-scheme:light]"
                  value={dates.checkIn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={handleCheckInChange}
                />
              </div>
            </div>

            {/* Date Picker 2 */}
            <div className="flex-1 px-8 py-4 bg-white hover:bg-slate-50 transition-all rounded-full flex items-center space-x-4 w-full text-left group shadow-lg border-2 border-transparent focus-within:border-brand-red">
              <Calendar className="text-brand-red" size={20} />
              <div className="flex-1">
                <label className="block text-[9px] uppercase tracking-[0.2em] text-slate-400 font-black mb-0.5">Check Out</label>
                <input
                  type="date"
                  className="w-full bg-transparent text-nook-900 focus:outline-none cursor-pointer text-sm font-bold [color-scheme:light]"
                  value={dates.checkOut}
                  min={dates.checkIn}
                  onChange={handleCheckOutChange}
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="w-full md:w-auto">
              <button
                onClick={scrollToRooms}
                className="bg-brand-red text-white w-full px-12 py-5 rounded-full font-black uppercase tracking-widest text-xs hover:bg-red-600 transition flex items-center justify-center space-x-3 shadow-xl"
              >
                <span>Check Availability</span>
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
              <h2 className="text-4xl font-serif text-nook-900 mb-2">Our Listings</h2>
              <p className="text-slate-500">Luxury Home & Rooms</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="animate-spin text-nook-600" size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Synchronizing Live Catalog</span>
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-slate-50 p-20 rounded-[40px] text-center border-2 border-dashed border-slate-100">
              <LayoutGrid size={48} className="mx-auto text-slate-200 mb-6" />
              <p className="text-slate-400 font-medium italic">Our production inventory is currently being updated.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {listings.map((listing) => {
                const isAvailable = availabilityMap[listing.id] !== false;
                // Robust primary image selection
                const mainImage = (listing.images && listing.images.length > 0 && listing.images[0].url && listing.images[0].url.trim().length > 0)
                  ? listing.images[0].url
                  : FALLBACK_IMAGE;

                return (
                  <div key={listing.id} className={`group bg-white rounded-[40px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col`}>
                    {/* Image Section - Clicking opens Gallery */}
                    <div
                      className="relative h-80 overflow-hidden cursor-pointer bg-nook-50"
                      onClick={() => setActiveGallery({ listing, index: 0 })}
                    >
                      <img
                        src={mainImage}
                        alt={listing.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-[2000ms]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                        }}
                      />
                      <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-xl px-4 py-2 rounded-2xl text-xs font-bold text-nook-900 shadow-sm border border-slate-100 z-10">
                        ${listing.price}<span className="text-[10px] text-slate-400 ml-1">/ NIGHT</span>
                      </div>

                      {!isAvailable && (
                        <div
                          className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center z-20 animate-in fade-in duration-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToTop();
                          }}
                        >
                          <div className="bg-white p-5 rounded-[28px] shadow-xl border border-nook-100 transform hover:scale-105 transition-transform duration-300">
                            <Calendar className="mx-auto text-nook-600 mb-2" size={24} />
                            <div className="text-xs font-bold text-nook-900 uppercase tracking-widest mb-1">Dates Taken</div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">View calendar for openings</p>
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-nook-900/0 group-hover:bg-nook-900/20 transition-all duration-500 flex items-center justify-center z-10">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                          <Maximize2 size={24} />
                        </div>
                      </div>
                    </div>

                    {/* Details Section - Clicking opens Expanded View */}
                    <div
                      className="p-10 flex flex-col flex-1 cursor-pointer hover:bg-slate-50/50 transition-colors"
                      onClick={() => setExpandedListing(listing)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-nook-600 bg-nook-50 px-3 py-1 rounded-lg">{listing.type}</span>
                        <div className="flex items-center space-x-1 text-nook-600">
                          <Star size={12} fill="currentColor" />
                          <span className="text-xs font-bold">4.9</span>
                        </div>
                      </div>
                      <h3 className="text-2xl font-serif text-nook-900 mb-4">{listing.name}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed mb-8 h-10 overflow-hidden line-clamp-2">
                        {listing.shortSummary || listing.description}
                      </p>

                      <div className="mt-auto space-y-6">
                        <div className="text-nook-600 font-bold text-xs uppercase tracking-widest flex items-center space-x-2 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                          <span>View Full Details</span> <ArrowRight size={14} />
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Don't open details modal
                            if (isAvailable) {
                              onBook(listing.id, dates);
                            } else {
                              scrollToTop();
                            }
                          }}
                          className={`w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-xs transition flex items-center justify-center space-x-3 ${isAvailable
                              ? 'bg-nook-900 text-white hover:bg-nook-800 shadow-xl shadow-nook-900/20 hover:shadow-2xl'
                              : 'bg-white text-nook-900 border-2 border-nook-100 hover:bg-nook-50 cursor-pointer shadow-sm hover:shadow-md'
                            }`}
                        >
                          {isAvailable ? (
                            <span>Book Now</span>
                          ) : (
                            <>
                              <Search size={14} className="text-nook-600" />
                              <span>Find Open Dates</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Expanded Listing Details Modal */}
      {expandedListing && (
        <div className="fixed inset-0 z-[100] bg-nook-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setExpandedListing(null)}>
          <div
            className="bg-white w-full max-w-4xl h-[90vh] rounded-[40px] shadow-2xl flex flex-col relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Hero */}
            <div className="h-64 relative shrink-0">
              <img
                src={expandedListing.images[0]?.url || FALLBACK_IMAGE}
                className="w-full h-full object-cover"
                alt={expandedListing.name}
              />
              <button
                onClick={() => setExpandedListing(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-nook-900 transition-all border border-white/20 z-10"
              >
                <X size={20} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 pt-20">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">{expandedListing.type}</div>
                <h2 className="text-3xl font-serif font-bold text-white">{expandedListing.name}</h2>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-10">
                {/* Description */}
                <div>
                  <h3 className="text-xl font-serif font-bold text-nook-900 mb-4">About this space</h3>
                  <p className="text-slate-500 leading-relaxed text-sm whitespace-pre-wrap">{expandedListing.description || expandedListing.shortSummary}</p>
                </div>

                {/* Amenities */}
                {expandedListing.amenities && expandedListing.amenities.length > 0 && (
                  <div>
                    <h3 className="text-xl font-serif font-bold text-nook-900 mb-6">What this place offers</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {expandedListing.amenities.map((amenity, i) => (
                        <div key={i} className="flex items-center space-x-3 text-slate-600 bg-slate-50 p-3 rounded-xl">
                          <Check size={16} className="text-nook-600" />
                          <span className="text-sm font-medium">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* House Rules & Host - Grid */}
                <div className="grid md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-nook-900 mb-4 flex items-center space-x-2">
                      <Info size={18} /> <span>House Rules</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-medium">Check-in</span>
                        <span className="text-nook-900 font-bold">{expandedListing.checkInTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-medium">Check-out</span>
                        <span className="text-nook-900 font-bold">{expandedListing.checkOutTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-medium">Quiet Hours</span>
                        <span className="text-nook-900 font-bold">{expandedListing.houseRules?.quietHoursStart} - {expandedListing.houseRules?.quietHoursEnd}</span>
                      </div>
                      {expandedListing.houseRules?.additionalNotes && (
                        <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl mt-2 leading-relaxed">
                          {expandedListing.houseRules.additionalNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-serif font-bold text-nook-900 mb-4 flex items-center space-x-2">
                      <UserIcon size={18} /> <span>Hosted By</span>
                    </h3>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-nook-100 rounded-full flex items-center justify-center text-nook-600 font-bold text-lg overflow-hidden">
                        {expandedListing.hostInfo?.avatarUrl ? (
                          <img src={expandedListing.hostInfo.avatarUrl} className="w-full h-full object-cover" alt="Host" />
                        ) : (
                          expandedListing.hostInfo?.displayName?.[0] || 'C'
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-nook-900">{expandedListing.hostInfo?.displayName || 'The Cozy Nook'}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          {expandedListing.hostInfo?.verified ? 'Verified Host' : 'Host'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Response time: <span className="font-bold">{expandedListing.hostInfo?.responseTime || 'Within an hour'}</span></p>
                      <p>Languages: <span className="font-bold">{(expandedListing.hostInfo?.languages || ['English']).join(', ')}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-6 border-t border-slate-100 bg-white/95 backdrop-blur-md flex items-center justify-between shrink-0">
              <div>
                <div className="text-xl font-bold text-nook-900">${expandedListing.price}</div>
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Per Night</div>
              </div>
              <button
                onClick={() => {
                  const isAvailable = availabilityMap[expandedListing.id] !== false;
                  setExpandedListing(null); // Close modal
                  if (isAvailable) {
                    onBook(expandedListing.id, dates);
                  } else {
                    scrollToTop();
                  }
                }}
                className={`px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition shadow-xl ${availabilityMap[expandedListing.id] !== false
                    ? 'bg-nook-900 text-white hover:bg-nook-800'
                    : 'bg-white text-nook-900 border-2 border-nook-100'
                  }`}
              >
                {availabilityMap[expandedListing.id] !== false ? 'Book Now' : 'Check Calendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Gallery Lightbox */}
      {activeGallery && activeGallery.listing.images && activeGallery.listing.images.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-nook-900/98 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300" onClick={() => setActiveGallery(null)}>
          <button onClick={() => setActiveGallery(null)} className="absolute top-8 right-8 text-white/60 hover:text-white transition-all hover:rotate-90 z-[110]">
            <X size={32} />
          </button>

          <div className="relative w-full max-w-6xl aspect-[16/9] flex items-center justify-center group" onClick={(e) => e.stopPropagation()}>
            {activeGallery.listing.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex = (activeGallery.index - 1 + activeGallery.listing.images.length) % activeGallery.listing.images.length;
                    setActiveGallery({ ...activeGallery, index: newIndex });
                  }}
                  className="absolute left-4 p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-md border border-white/10 z-20"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex = (activeGallery.index + 1) % activeGallery.listing.images.length;
                    setActiveGallery({ ...activeGallery, index: newIndex });
                  }}
                  className="absolute right-4 p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-md border border-white/10 z-20"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <div className="w-full h-full rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative bg-black/20">
              <img
                src={activeGallery.listing.images[activeGallery.index]?.url || FALLBACK_IMAGE}
                className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-500"
                alt={`Photo ${activeGallery.index + 1}`}
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
              />
              <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end pointer-events-none">
                <div className="bg-black/40 backdrop-blur-xl p-6 rounded-[28px] border border-white/10 text-white max-w-md pointer-events-auto">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-white/60">
                    {activeGallery.listing.name} • {activeGallery.index + 1} of {activeGallery.listing.images.length}
                  </div>
                  {activeGallery.listing.images[activeGallery.index]?.caption && (
                    <div className="text-lg font-bold">{activeGallery.listing.images[activeGallery.index].caption}</div>
                  )}
                </div>

                <div className="pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const isAvailable = availabilityMap[activeGallery.listing.id] !== false;
                      if (isAvailable) {
                        onBook(activeGallery.listing.id, dates);
                        setActiveGallery(null);
                      }
                    }}
                    disabled={availabilityMap[activeGallery.listing.id] === false}
                    className={`px-12 py-5 rounded-[24px] font-black uppercase tracking-widest text-xs transition flex items-center justify-center space-x-3 shadow-2xl ${availabilityMap[activeGallery.listing.id] !== false
                        ? 'bg-brand-red text-white hover:bg-red-600 active:scale-95'
                        : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5'
                      }`}
                  >
                    <span>{availabilityMap[activeGallery.listing.id] !== false ? 'Book Now' : 'Check Calendar'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 text-slate-500 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-[11px] uppercase tracking-[0.2em]">
          <div>© 2026 The Cozy Nook.</div>
          <div className="mt-4 md:mt-0 space-x-8">
            <button onClick={onViewPrivacy} className="hover:text-nook-600 transition">Privacy Policy</button>
            <button onClick={onViewTerms} className="hover:text-nook-600 transition">Terms & Conditions</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
