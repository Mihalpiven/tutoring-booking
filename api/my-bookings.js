import { fetchBookingEvents } from '../lib/caldav.js';
import { SLOT_CONFIG } from '../lib/config.js';

function parseDescription(desc) {
  const data = { studentName: '', phone: '', subject: '' };
  if (!desc) return data;
  for (const raw of desc.split(/\r?\n/)) {
    const line = raw.trim();
    const m = line.match(/^([^:]+):\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim();
    if (key.includes('תלמיד')) data.studentName = val;
    else if (key.includes('טלפון')) data.phone = val;
    else if (key.includes('נושא')) data.subject = val;
  }
  return data;
}

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

    const events = await fetchBookingEvents(start, end);
    const name = studentName.trim();

    const myBookings = events
      .filter((e) => e.description?.includes(name))
      .filter((e) => e.start > new Date())
      .sort((a, b) => a.start - b.start)
      .map((e) => {
        const parsed = parseDescription(e.description);
        return {
          start: e.start.toISOString(),
          end: e.end.toISOString(),
          summary: e.summary,
          url: e.url,
          etag: e.etag,
          isRecurring: e.isRecurring ?? false,
          studentName: parsed.studentName,
          phone: parsed.phone,
          subject: parsed.subject,
        };
      });

    res.json({ bookings: myBookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת הפגישות' });
  }
}
