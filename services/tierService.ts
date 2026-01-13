
import { BookingStatus, Booking } from '../types';

export interface TierDetails {
  name: 'Silver Members' | 'Bronze Members' | 'Platinum Member';
  discount: number;
  nextThreshold: number;
  nextTierName: string | null;
  progress: number;
}

/**
 * Strictly follows the requested tier logic:
 * 0-5 bookings: Silver Members (0% discount)
 * 6-10 bookings: Bronze Members (10% discount)
 * >10 bookings: Platinum Member (15% discount)
 */
export const calculateTier = (bookings: Booking[]): TierDetails => {
  const confirmedCount = bookings.filter(b => b.status === BookingStatus.CONFIRMED).length;

  if (confirmedCount <= 5) {
    return {
      name: 'Silver Members',
      discount: 0,
      nextThreshold: 6,
      nextTierName: 'Bronze Members',
      progress: (confirmedCount / 6) * 100
    };
  } else if (confirmedCount <= 10) {
    return {
      name: 'Bronze Members',
      discount: 0.10,
      nextThreshold: 11,
      nextTierName: 'Platinum Member',
      progress: ((confirmedCount - 6) / 5) * 100
    };
  } else {
    return {
      name: 'Platinum Member',
      discount: 0.15,
      nextThreshold: Infinity,
      nextTierName: null,
      progress: 100
    };
  }
};
