export enum UserRole {
  ADMIN = 'admin',
  GUEST = 'guest',
  DELEGATE = 'delegate',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum ListingType {
  HOUSE = 'house',
  ROOM = 'room',
  APARTMENT = 'apartment',
  STUDIO = 'studio',
}

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
  isFirstLogin?: boolean;
  isSuspended?: boolean;
}

export interface ListingImage {
  url: string; // Resolves to public URL for UI
  path?: string; // Absolute path in Supabase bucket
  caption: string;
  isAiGenerated?: boolean; // Indicates if asset was created by Gemini
}

export interface HouseRules {
  smokingAllowed: boolean;
  petsAllowed: boolean;
  eventsAllowed: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  additionalNotes: string;
}

export interface HostInfo {
  displayName: string;
  avatarUrl: string;
  responseTime: string;
  languages: string[];
  verified: boolean;
}

export interface GuestExperience {
  welcomeGuide: string;
  localTips: string;
  airportPickupAvailable: boolean;
  earlyCheckInAvailable: boolean;
}

export interface Listing {
  id: string;
  name: string;
  type: ListingType;
  price: number;
  description: string;
  shortSummary: string;
  amenities: string[];
  images: ListingImage[];
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  address: string;
  checkInMethod: string;
  checkInTime: string;
  checkOutTime: string;
  cleaningFee: number;
  securityDeposit: number;
  minStay: number;
  maxStay: number;
  houseRules: HouseRules;
  hostInfo: HostInfo;
  guestExperience: GuestExperience;
}

export interface Booking {
  id: string;
  userId: string;
  listingId: string;
  checkIn: string; // ISO format
  checkOut: string; // ISO format
  status: BookingStatus;
  totalAmount: number;
  createdAt: string;
  guestCount: number;
}

export interface PaymentLog {
  id: string;
  bookingId: string;
  txRef: string;
  amount: number;
  status: 'initiated' | 'success' | 'failed';
  createdAt: string;
}

export interface AvailabilityConstraint {
  houseId: string;
  roomIds: string[];
}