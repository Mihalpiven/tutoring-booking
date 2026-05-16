export const SLOT_CONFIG = {
  daysAhead: 30,
  slotDurationMinutes: 60,
  timezone: 'Asia/Jerusalem',

  // null = סגור, אחרת { start, end } בפורמט HH:MM
  workingHours: {
    0: null,                                    // ראשון
    1: { start: '16:00', end: '20:00' },        // שני
    2: { start: '16:00', end: '20:00' },        // שלישי
    3: { start: '16:00', end: '20:00' },        // רביעי
    4: { start: '16:00', end: '20:00' },        // חמישי
    5: { start: '10:00', end: '14:00' },        // שישי
    6: null,                                    // שבת
  },
};
