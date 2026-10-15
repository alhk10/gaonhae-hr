import { getSlotWeekday, getSlotCapacity, getBranchSlotAvailability } from './slotCapacity';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  if (actual !== expected) throw new Error(`${rule}: expected ${expected}, got ${actual}`);
};
const config = { thursday: 1, monday: 0 };
const date = '2026-10-15';
const booking = { id: 'target', date, branchId: 'jurong-west', status: 'approved' };

equal(getSlotWeekday(date), 'thursday', '15/10/2026 is Thursday');
equal(getSlotCapacity(config, date), 1, 'Jurong West Thursday capacity is one');
equal(getBranchSlotAvailability(config, [], 'jurong-west', date).available, 1, 'empty branch allows a move');
equal(getBranchSlotAvailability(config, [booking], 'jurong-west', date).available, 0, 'occupied branch blocks a move');
for (const status of ['cancelled', 'rejected']) {
  equal(getBranchSlotAvailability(config, [{ ...booking, status }], 'jurong-west', date).available, 1, `${status} does not consume capacity`);
}
equal(getBranchSlotAvailability(config, [booking], 'jurong-west', date, booking.id).available, 1, 'current booking is excluded');
equal(getBranchSlotAvailability(config, [{ ...booking, branchId: 'balmoral' }], 'jurong-west', date).available, 1, 'other branches do not consume capacity');
equal(getSlotCapacity(config, '2026-10-12'), 0, 'zero-slot Monday stays closed');
equal(getSlotWeekday('invalid'), undefined, 'invalid date has no weekday');