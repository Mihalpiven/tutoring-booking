import { SLOT_CONFIG } from './config.js';

const DAY_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTH_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

const TZ = 'Asia/Jerusalem';
const DOW_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// קבלת רכיבי תאריך לפי שעון ישראל
function israelParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date);
  const obj = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return {
    year: parseInt(obj.year),
    month: parseInt(obj.month),
    day: parseInt(obj.day),
    dayOfWeek: DOW_MAP[obj.weekday],
  };
}

// המרת זמן ישראלי לוקאלי (Y,M,D,H,M) ל-Date אובייקט מדויק (UTC)
function israelToDate(year, month, day, hours, minutes) {
  let guess = Date.UTC(year, month - 1, day, hours, minutes);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false,
    hour: '2-digit', minute: '2-digit',
  });
  const [gotH, gotM] = fmt.format(new Date(guess)).split(':').map(Number);
  let diff = (hours * 60 + minutes) - (gotH * 60 + gotM);
  if (diff > 12 * 60) diff -= 24 * 60;
  if (diff < -12 * 60) diff += 24 * 60;
  return new Date(guess + diff * 60_000);
}

export function generateAllSlots(from = new Date()) {
  const { daysAhead, slotDurationMinutes, workingHours } = SLOT_CONFIG;
  const slots = [];

  for (let i = 0; i < daysAhead; i++) {
    const dayMoment = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
    const { year, month, day, dayOfWeek } = israelParts(dayMoment);

    const hours = workingHours[dayOfWeek];
    if (!hours) continue;

    const [sh, sm] = hours.start.split(':').map(Number);
    const [eh, em] = hours.end.split(':').map(Number);

    let cursor = israelToDate(year, month, day, sh, sm);
    const dayEnd = israelToDate(year, month, day, eh, em);

    while (cursor < dayEnd) {
      const slotEnd = new Date(cursor.getTime() + slotDurationMinutes * 60_000);
      if (slotEnd > dayEnd) break;
      slots.push({ start: new Date(cursor), end: slotEnd });
      cursor = slotEnd;
    }
  }
  return slots;
}

export function filterAvailableSlots(allSlots, existingEvents) {
  const now = new Date();
  return allSlots.filter((slot) =>
    slot.start > now &&
    !existingEvents.some((e) => slot.start < e.end && slot.end > e.start)
  );
}

export function formatSlotLabel(slot) {
  const d = slot.start;
  const t = (dt) => dt.toLocaleTimeString('he-IL', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = israelParts(d);
  return `יום ${DAY_HE[parts.dayOfWeek]}, ${parts.day} ב${MONTH_HE[parts.month - 1]} | ${t(d)}–${t(slot.end)}`;
}
