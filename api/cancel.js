import { cancelCalendarEvent } from '../lib/caldav.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url, etag } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'חסרים פרטים' });
  }

  try {
    await cancelCalendarEvent(url, etag);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בביטול הפגישה' });
  }
}
