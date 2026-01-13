
import { Listing, Booking, BookingStatus, ListingType, User, UserRole, ListingImage, HouseRules, HostInfo, GuestExperience } from '../types';
import { THE_COZY_NOOK_CONSTRAINTS, INITIAL_LISTINGS } from '../constants';
import { supabase } from './supabaseClient';

class DatabaseService {
  async getListings(): Promise<Listing[]> {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*');
      
      if (error) {
        console.warn("Database fetch warning:", error.message);
        return INITIAL_LISTINGS as Listing[];
      }

      if (!data || data.length === 0) return INITIAL_LISTINGS as Listing[];
      
      return data.map(l => ({
        id: String(l.id || ''),
        name: String(l.name || 'Untitled Listing'),
        type: (l.type as ListingType) || ListingType.ROOM,
        price: Number(l.price || 0),
        description: String(l.description || ''),
        shortSummary: String(l.short_summary || ''),
        amenities: Array.isArray(l.amenities) ? l.amenities.map(String) : [],
        images: Array.isArray(l.images) ? l.images : [],
        maxGuests: Number(l.max_guests || 2),
        bedrooms: Number(l.bedrooms || 1),
        bathrooms: Number(l.bathrooms || 1),
        address: String(l.address || ''),
        checkInMethod: String(l.check_in_method || 'Key Exchange'),
        checkInTime: String(l.check_in_time || '14:00'),
        checkOutTime: String(l.check_out_time || '11:00'),
        cleaningFee: Number(l.cleaning_fee || 0),
        securityDeposit: Number(l.security_deposit || 0),
        minStay: Number(l.min_stay || 1),
        maxStay: Number(l.max_stay || 30),
        houseRules: (l.house_rules as HouseRules) || {
          smokingAllowed: false,
          petsAllowed: false,
          eventsAllowed: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          additionalNotes: ''
        },
        hostInfo: (l.host_info as HostInfo) || {
          displayName: 'The Cozy Nook',
          avatarUrl: '',
          responseTime: 'Within an hour',
          languages: ['English'],
          verified: true
        },
        guestExperience: (l.guest_experience as GuestExperience) || {
          welcomeGuide: '',
          localTips: '',
          airportPickupAvailable: false,
          earlyCheckInAvailable: false
        }
      }));
    } catch (err: any) {
      console.error("Error in getListings:", err?.message || JSON.stringify(err));
      return INITIAL_LISTINGS as Listing[];
    }
  }

  async saveListing(listing: Listing): Promise<void> {
    try {
      const payload = {
        id: listing.id,
        name: listing.name,
        type: listing.type,
        price: listing.price,
        description: listing.description,
        short_summary: listing.shortSummary,
        amenities: listing.amenities,
        images: listing.images,
        max_guests: listing.maxGuests,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        address: listing.address,
        check_in_method: listing.checkInMethod,
        check_in_time: listing.checkInTime,
        check_out_time: listing.checkOutTime,
        cleaning_fee: listing.cleaningFee,
        security_deposit: listing.securityDeposit,
        min_stay: listing.minStay,
        max_stay: listing.maxStay,
        house_rules: listing.houseRules,
        host_info: listing.hostInfo,
        guest_experience: listing.guestExperience
      };

      const { error } = await supabase
        .from('listings')
        .upsert(payload);
      
      if (error) throw error;
    } catch (err: any) {
      console.error("Error saving listing:", err?.message || err);
      throw err;
    }
  }

  async deleteListing(id: string): Promise<void> {
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) throw error;
  }

  // User Management
  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) {
        console.error("Error fetching profiles:", error.message);
        return [];
      }
      
      return (data || []).map(p => ({
        uid: p.id,
        email: p.email || 'user@cozynook.com',
        fullName: p.full_name || 'Unnamed User',
        role: p.role as UserRole,
        isSuspended: p.is_suspended || false
      }));
    } catch (err: any) {
      console.error("Error fetching users:", err?.message || err);
      return [];
    }
  }

  async updateUserRole(uid: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', uid);
    
    if (error) throw error;
  }

  async suspendUser(uid: string, isSuspended: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: isSuspended })
      .eq('id', uid);
    
    if (error) throw error;
  }

  async deleteUser(uid: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', uid);
    
    if (error) throw error;
  }

  async getBookings(): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(b => ({
        id: String(b.id || ''),
        userId: String(b.user_id || ''),
        listingId: String(b.listing_id || ''),
        checkIn: String(b.check_in || ''),
        checkOut: String(b.check_out || ''),
        status: (b.status as BookingStatus) || BookingStatus.PENDING,
        totalAmount: Number(b.total_amount || 0),
        createdAt: String(b.created_at || ''),
        guestCount: Number(b.guest_count || 1)
      }));
    } catch (err: any) {
      console.error("Error in getBookings:", err?.message || err);
      return [];
    }
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

  async updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
    await supabase.from('bookings').update({ status }).eq('id', id);
  }

  async checkAvailability(listingId: string, checkIn: string, checkOut: string): Promise<boolean> {
    try {
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
    } catch (err: any) {
      return true;
    }
  }

  async getOccupiedDates(): Promise<{date: string, listingId: string}[]> {
    const { data } = await supabase.from('bookings').select('*').eq('status', 'confirmed');
    const dates: {date: string, listingId: string}[] = [];
    data?.forEach(b => {
      let current = new Date(b.check_in);
      const end = new Date(b.check_out);
      while(current < end) {
        dates.push({ date: current.toISOString().split('T')[0], listingId: String(b.listing_id) });
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  }
}

export const db = new DatabaseService();
