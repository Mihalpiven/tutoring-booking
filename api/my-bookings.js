import { fetchEvents } from '../lib/caldav.js';
import { SLOT_CONFIG } from '../lib/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { studentName } = req.body;
  if (!studentName?.trim() || studentName.trim().length < 3) {
    return res.status(400).json({ error: 'נא להזין שם מלא' });
  }

  try {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + SLOT_CONFIG.daysAhead);

    const events = await fetchEvents(start, end);
    const name = studentName.trim();

    const myBookings = events
      .filter((e) => e.description?.includes(name))
      .filter((e) => e.start > new Date())
      .sort((a, b) => a.start - b.start)
      .map((e) => ({
        start: e.start.toISOString(),
        end: e.end.toISOString(),
        summary: e.summary,
        url: e.url,
        etag: e.etag,
      }));

    res.json({ bookings: myBookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת הפגישות' });
  }
}
