
import { Listing, Booking, BookingStatus, ListingType, User, UserRole, ListingImage, HouseRules, HostInfo, GuestExperience } from '../types';
import { THE_COZY_NOOK_CONSTRAINTS, INITIAL_LISTINGS } from '../constants';
import { supabase } from './supabaseClient';

class DatabaseService {
  private parseJsonField<T>(field: any, defaultValue: T): T {
    if (field === null || field === undefined) return defaultValue;
    if (typeof field === 'object') return field as T;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        console.error("Failed to parse JSON field string:", e);
        return defaultValue;
      }
    }
    return defaultValue;
  }

  async getHeroImage(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'hero_image_url')
        .maybeSingle();
      
      if (error) return 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=2070';
      return data?.value || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=2070';
    } catch (err) {
      return 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=2070';
    }
  }

  async updateHeroImage(url: string): Promise<void> {
    const { error } = await supabase
      .from('site_config')
      .upsert(
        { key: 'hero_image_url', value: url, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    if (error) throw error;
  }

  async getListings(): Promise<Listing[]> {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Production database fetch error:", error.message);
        return [];
      }

      if (!data || data.length === 0) return [];

      const mapped = data.map(l => ({
        id: String(l.id),
        name: String(l.name),
        type: l.type as ListingType,
        price: Number(l.price),
        description: String(l.description),
        shortSummary: String(l.short_summary),
        amenities: this.parseJsonField<string[]>(l.amenities, []),
        images: this.parseJsonField<ListingImage[]>(l.images, []),
        maxGuests: Number(l.max_guests),
        bedrooms: Number(l.bedrooms),
        bathrooms: Number(l.bathrooms),
        address: String(l.address),
        checkInMethod: String(l.check_in_method),
        checkInTime: String(l.check_in_time),
        checkOutTime: String(l.check_out_time),
        cleaningFee: Number(l.cleaning_fee),
        securityDeposit: Number(l.security_deposit),
        minStay: Number(l.min_stay),
        maxStay: Number(l.max_stay),
        houseRules: this.parseJsonField<HouseRules>(l.house_rules, {} as HouseRules),
        hostInfo: this.parseJsonField<HostInfo>(l.host_info, {} as HostInfo),
        guestExperience: this.parseJsonField<GuestExperience>(l.guest_experience, {} as GuestExperience)
      } as Listing));

      const TARGET_NAME = 'entire 4 bedroom luxury house';
      mapped.sort((a, b) => {
        const aMatch = a.name.toLowerCase() === TARGET_NAME;
        const bMatch = b.name.toLowerCase() === TARGET_NAME;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });

      return mapped;
    } catch (err) {
      console.error("Critical production listing fetch failure:", err);
      return [];
    }
  }

  async saveListing(listing: Listing): Promise<void> {
    const sanitizedImages = (listing.images || [])
      .filter(img => img && typeof img.url === 'string' && img.url.trim().length > 0)
      .map(img => ({ 
        url: img.url.trim(), 
        caption: (img.caption || '').trim() 
      }));

    const payload = {
      id: listing.id,
      name: listing.name,
      type: listing.type,
      price: Number(listing.price),
      description: listing.description,
      short_summary: listing.shortSummary,
      amenities: listing.amenities || [],
      images: sanitizedImages, 
      max_guests: Number(listing.maxGuests),
      bedrooms: Number(listing.bedrooms),
      bathrooms: Number(listing.bathrooms),
      address: listing.address,
      check_in_method: listing.checkInMethod,
      check_in_time: listing.checkInTime,
      check_out_time: listing.checkOutTime,
      cleaning_fee: Number(listing.cleaningFee || 0),
      security_deposit: Number(listing.securityDeposit || 0),
      min_stay: Number(listing.minStay || 1),
      max_stay: Number(listing.maxStay || 30),
      house_rules: listing.houseRules || {},
      host_info: listing.hostInfo || {},
      guest_experience: listing.guestExperience || {}
    };

    const { error } = await supabase
      .from('listings')
      .upsert(payload, { onConflict: 'id' });
    
    if (error) {
      console.error("Supabase Save Error:", error);
      throw error;
    }
  }

  async seedListings(): Promise<void> {
    for (const listing of INITIAL_LISTINGS) {
      await this.saveListing(listing);
    }
  }

  async deleteListing(id: string): Promise<void> {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Supabase Delete Error:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return (data || []).map(p => ({
      uid: p.id,
      email: p.email || '',
      fullName: p.full_name || 'User',
      role: p.role as UserRole,
      isSuspended: p.is_suspended || false
    }));
  }

  async updateUserRole(uid: string, role: UserRole): Promise<void> {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', uid);
    if (error) throw error;
  }

  async suspendUser(uid: string, isSuspended: boolean): Promise<void> {
    const { error } = await supabase.from('profiles').update({ is_suspended: isSuspended }).eq('id', uid);
    if (error) throw error;
  }

  async deleteUser(uid: string): Promise<void> {
    const { error } = await supabase.from('profiles').delete().eq('id', uid);
    if (error) throw error;
  }

  async getBookings(): Promise<Booking[]> {
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(b => ({
      id: String(b.id),
      userId: String(b.user_id),
      listingId: String(b.listing_id),
      checkIn: String(b.check_in),
      checkOut: String(b.check_out),
      status: b.status as BookingStatus,
      totalAmount: Number(b.total_amount),
      createdAt: String(b.created_at),
      guestCount: Number(b.guest_count)
    }));
  }

  async createBooking(booking: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: booking.userId,
        listing_id: booking.listingId,
        check_in: booking.checkIn,
        check_out: booking.checkOut,
        status: booking.status,
        total_amount: booking.totalAmount,
        guest_count: booking.guestCount
      })
      .select().single();
    if (error) throw error;
    return {
      id: String(data.id),
      userId: String(data.user_id),
      listingId: String(data.listing_id),
      checkIn: String(data.check_in),
      checkOut: String(data.check_out),
      status: data.status as BookingStatus,
      totalAmount: Number(data.total_amount),
      createdAt: String(data.created_at),
      guestCount: Number(data.guest_count)
    };
  }

  async checkAvailability(listingId: string, checkIn: string, checkOut: string): Promise<boolean> {
    const { data: overlapping, error } = await supabase
      .from('bookings')
      .select('listing_id')
      .eq('status', 'confirmed')
      .lt('check_in', checkOut)
      .gt('check_out', checkIn);
    
    if (error) throw error;
    const bookedIds = overlapping?.map(b => String(b.listing_id)) || [];
    if (listingId === THE_COZY_NOOK_CONSTRAINTS.HOUSE_ID) {
      return bookedIds.length === 0;
    } else {
      if (bookedIds.includes(THE_COZY_NOOK_CONSTRAINTS.HOUSE_ID)) return false;
      return !bookedIds.includes(listingId);
    }
  }
}

export const db = new DatabaseService();
