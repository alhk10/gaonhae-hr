import { isValid, parseISO } from 'date-fns';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type SlotWeekday = typeof WEEKDAYS[number];
type CapacityConfig = Partial<Record<SlotWeekday, number>>;
type CapacityBooking = { id: string; date: string; branchId: string; status: string };

/** Calendar weekday keys are independent of user-facing date formatting. */
export const getSlotWeekday = (date: Date | string): SlotWeekday | undefined => {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  return isValid(parsed) ? WEEKDAYS[parsed.getDay()] : undefined;
};

export const getSlotCapacity = (config: CapacityConfig | undefined, date: Date | string): number => {
  const weekday = getSlotWeekday(date);
  return weekday ? config?.[weekday] ?? 0 : 0;
};

export const getBranchSlotAvailability = (
  config: CapacityConfig | undefined,
  bookings: readonly CapacityBooking[],
  branchId: string,
  date: string,
  excludeBookingId?: string,
) => {
  const capacity = getSlotCapacity(config, date);
  const booked = bookings.filter(booking =>
    booking.date === date && booking.branchId === branchId &&
    booking.status !== 'cancelled' && booking.status !== 'rejected' &&
    booking.id !== excludeBookingId
  ).length;
  return { capacity, booked, available: Math.max(0, capacity - booked) };
};