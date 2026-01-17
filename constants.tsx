import { Listing, ListingType } from './types';

export const THE_COZY_NOOK_CONSTRAINTS = {
  HOUSE_ID: 'listing_house_01',
  ROOM_IDS: ['listing_exec_02', 'listing_deluxe_03', 'listing_room3_04', 'listing_room4_05'],
};

// Centralized Assets
export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1200';
export const DEFAULT_HERO = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=2070';

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
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
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
    images: [
      { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200', caption: 'Elegant Estate Exterior' },
      { url: 'https://images.unsplash.com/photo-1513584684374-8bdb7489feef?auto=format&fit=crop&q=80&w=1200', caption: 'Modern Living Area' },
      { url: 'https://images.unsplash.com/photo-1556911220-e150213ff16a?auto=format&fit=crop&q=80&w=1200', caption: 'Chef\'s Kitchen' }
    ],
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
    images: [
      { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1200', caption: 'Executive Suite Interior' },
      { url: 'https://images.unsplash.com/photo-1591088398332-8a77d399a80d?auto=format&fit=crop&q=80&w=1200', caption: 'Private En-suite' }
    ],
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
    images: [
      { url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=1200', caption: 'Deluxe Suite Comfort' },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1200', caption: 'Garden View Balcony' }
    ],
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
    images: [
      { url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&q=80&w=1200', caption: 'Room 3 Minimalist Design' }
    ],
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
    images: [
      { url: 'https://images.unsplash.com/photo-1616594192358-af7717ca48a2?auto=format&fit=crop&q=80&w=1200', caption: 'Room 4 Serenity' }
    ],
    ...DEFAULT_META
  },
];