import { SLOT_CONFIG } from './config.js';

const DAY_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTH_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

export function generateAllSlots(from = new Date()) {
  const { daysAhead, slotDurationMinutes, workingHours } = SLOT_CONFIG;
  const slots = [];

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(from);
    date.setDate(date.getDate() + i);

    const hours = workingHours[date.getDay()];
    if (!hours) continue;

    const [startH, startM] = hours.start.split(':').map(Number);
    const [endH, endM] = hours.end.split(':').map(Number);

    const dayEnd = new Date(date);
    dayEnd.setHours(endH, endM, 0, 0);

    let cursor = new Date(date);
    cursor.setHours(startH, startM, 0, 0);

    while (cursor < dayEnd) {
      const slotEnd = new Date(cursor.getTime() + slotDurationMinutes * 60_000);
      if (slotEnd > dayEnd) break;
      slots.push({ start: new Date(cursor), end: new Date(slotEnd) });
      cursor = slotEnd;
    }
  }

  return slots;
}

export function filterAvailableSlots(allSlots, existingEvents) {
  const now = new Date();
  return allSlots.filter((slot) => {
    if (slot.start <= now) return false;
    return !existingEvents.some((e) => slot.start < e.end && slot.end > e.start);
  });
}

export function formatSlotLabel(slot) {
  const d = slot.start;
  const dayName = DAY_HE[d.getDay()];
  const month = MONTH_HE[d.getMonth()];
  const timeOpts = { hour: '2-digit', minute: '2-digit', hour12: false };
  const startT = d.toLocaleTimeString('he-IL', timeOpts);
  const endT = slot.end.toLocaleTimeString('he-IL', timeOpts);
  return `יום ${dayName}, ${d.getDate()} ב${month} | ${startT}–${endT}`;
}
