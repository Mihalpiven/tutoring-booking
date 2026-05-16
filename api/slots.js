import { fetchAllEvents } from '../lib/caldav.js';
import { generateAllSlots, filterAvailableSlots, formatSlotLabel } from '../lib/slots.js';
import { SLOT_CONFIG } from '../lib/config.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const allSlots = generateAllSlots();
    const start = new Date();
    const end = new Date(); end.setDate(end.getDate() + SLOT_CONFIG.daysAhead);

    const existingEvents = await fetchAllEvents(start, end);
    const available = filterAvailableSlots(allSlots, existingEvents);

    res.json({
      slots: available.map((slot, i) => ({
        id: i,
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        label: formatSlotLabel(slot),
      })),
      calendarConnected: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת הסלוטים' });
  }
}
