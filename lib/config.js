export const SLOT_CONFIG = {
  daysAhead: 14,
  slotDurationMinutes: 60,
  timezone: 'Asia/Jerusalem',

  // null = סגור, אחרת { start, end } בפורמט HH:MM
  workingHours: {
    0: { start: '18:00', end: '20:00' },        // ראשון
    1: { start: '17:30', end: '18:30' },        // שני
    2: { start: '18:30', end: '20:30' },        // שלישי
    3: { start: '17:30', end: '20:30' },        // רביעי
    4: { start: '18:00', end: '20:00' },        // חמישי
    5: { start: '11:00', end: '13:00' },        // שישי
    6: { start: '08:00', end: '11:00' },        // שבת
  },
};
