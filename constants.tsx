
import { Listing, ListingType } from './types';

export const THE_COZY_NOOK_CONSTRAINTS = {
  HOUSE_ID: 'listing_house_01',
  ROOM_IDS: ['listing_exec_02', 'listing_deluxe_03', 'listing_room3_04', 'listing_room4_05'],
};

// Common configuration for default listing metadata
const DEFAULT_META = {
  checkInMethod: 'Self check-in with lockbox',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  cleaningFee: 50,
  securityDeposit: 200,
  minStay: 1,
  maxStay: 30,
  address: '123 Serenity Lane, Lilongwe, Malawi',
  houseRules: {
    smokingAllowed: false,
    petsAllowed: true,
    eventsAllowed: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    additionalNotes: 'Please respect the quiet hours and the neighbors.'
  },
  hostInfo: {
    displayName: 'The Cozy Nook',
    avatarUrl: 'https://picsum.photos/seed/nook-host/200/200',
    responseTime: 'Within an hour',
    languages: ['English', 'Chichewa'],
    verified: true
  },
  guestExperience: {
    welcomeGuide: 'Welcome to your sanctuary! We are thrilled to have you.',
    localTips: 'Check out the local market for fresh produce and authentic crafts.',
    airportPickupAvailable: true,
    earlyCheckInAvailable: true
  }
};

/* 
  Fix: Added missing properties (shortSummary, bedrooms, bathrooms, address, checkInMethod, etc.) 
  to all initial listings to comply with the Listing interface definition in types.ts.
*/
export const INITIAL_LISTINGS: Listing[] = [
  {
    id: THE_COZY_NOOK_CONSTRAINTS.HOUSE_ID,
    name: 'Entire 4 Bedroomed House',
    type: ListingType.HOUSE,
    price: 450,
    maxGuests: 10,
    description: 'Experience complete privacy and luxury in our sprawling 4-bedroom estate. Perfect for large families or groups, offering exclusive access to all amenities, multiple lounges, and a private garden.',
    shortSummary: 'A magnificent 4-bedroom estate for ultimate group luxury.',
    bedrooms: 4,
    bathrooms: 4,
    amenities: ['Full Kitchen', 'Private Garden', '4 Bathrooms', 'High-speed WiFi', 'Laundry', 'Security'],
    images: [{ url: 'https://picsum.photos/seed/nook-house/1200/800', caption: 'Estate view' }],
    ...DEFAULT_META
  },
  {
    id: THE_COZY_NOOK_CONSTRAINTS.ROOM_IDS[0],
    name: 'Executive Room',
    type: ListingType.ROOM,
    price: 150,
    maxGuests: 2,
    description: 'Our flagship suite featuring a king-size bed, panoramic views, and a dedicated workspace. Ideal for business travelers seeking refinement.',
    shortSummary: 'Premium executive suite designed for the modern professional.',
    bedrooms: 1,
    bathrooms: 1,
    amenities: ['King Bed', 'Ensuite Bathroom', 'Workspace', 'Mini-bar', 'Smart TV'],
    images: [{ url: 'https://picsum.photos/seed/nook-exec/1200/800', caption: 'Executive Suite' }],
    ...DEFAULT_META
  },
  {
    id: THE_COZY_NOOK_CONSTRAINTS.ROOM_IDS[1],
    name: 'Deluxe Room',
    type: ListingType.ROOM,
    price: 120,
    maxGuests: 2,
    description: 'A perfect blend of comfort and style. The Deluxe room offers a serene environment with premium linens and modern decor.',
    shortSummary: 'Stylish deluxe room perfect for a relaxing getaway.',
    bedrooms: 1,
    bathrooms: 1,
    amenities: ['Queen Bed', 'Private Balcony', 'Tea/Coffee station', 'AC'],
    images: [{ url: 'https://picsum.photos/seed/nook-deluxe/1200/800', caption: 'Deluxe Room' }],
    ...DEFAULT_META
  },
  {
    id: THE_COZY_NOOK_CONSTRAINTS.ROOM_IDS[2],
    name: 'Room 3',
    type: ListingType.ROOM,
    price: 90,
    maxGuests: 2,
    description: 'Cozy and intimate, Room 3 provides all the essentials for a comfortable stay in a thoughtfully designed space.',
    shortSummary: 'Intimate and essential comfort in a modern space.',
    bedrooms: 1,
    bathrooms: 1,
    amenities: ['Double Bed', 'Shared Living', 'Ensuite', 'WiFi'],
    images: [{ url: 'https://picsum.photos/seed/nook-room3/1200/800', caption: 'Room 3 Interior' }],
    ...DEFAULT_META
  },
  {
    id: THE_COZY_NOOK_CONSTRAINTS.ROOM_IDS[3],
    name: 'Room 4',
    type: ListingType.ROOM,
    price: 90,
    maxGuests: 2,
    description: 'Warm and bright, Room 4 is nestled at the quietest corner of the property, ensuring a peaceful night\'s sleep.',
    shortSummary: 'Quiet garden-view retreat for peaceful nights.',
    bedrooms: 1,
    bathrooms: 1,
    amenities: ['Double Bed', 'Garden View', 'Desk', 'WiFi'],
    images: [{ url: 'https://picsum.photos/seed/nook-room4/1200/800', caption: 'Room 4 Interior' }],
    ...DEFAULT_META
  },
];
