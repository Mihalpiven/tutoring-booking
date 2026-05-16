import { fetchEvents, createCalendarEvent } from '../lib/caldav.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { studentName, phone, subject, slotStart, slotEnd } = req.body;
  if (!studentName?.trim() || !phone?.trim() || !subject?.trim() || !slotStart || !slotEnd) {
    return res.status(400).json({ error: 'נא למלא את כל השדות' });
  }

  try {
    const start = new Date(slotStart);
    const end = new Date(slotEnd);

    const surrounding = await fetchEvents(
      new Date(start.getTime() - 60_000),
      new Date(end.getTime() + 60_000),
    );
    if (surrounding.some((e) => start < e.end && end > e.start)) {
      return res.status(409).json({ error: 'הסלוט כבר נתפס, נסה/י לבחור אחד אחר' });
    }

    await createCalendarEvent({
      studentName: studentName.trim(),
      phone: phone.trim(),
      subject: subject.trim(),
      startDate: start,
      endDate: end,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה ביצירת הפגישה' });
  }
}
