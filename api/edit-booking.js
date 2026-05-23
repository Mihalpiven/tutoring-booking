import { fetchAllEvents, createCalendarEvent, cancelCalendarEvent } from '../lib/caldav.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url, etag, newSlotStart, newSlotEnd, studentName, phone, subject, isRecurring } = req.body;

  if (!url || !etag || !newSlotStart || !newSlotEnd || !studentName || !phone || !subject) {
    return res.status(400).json({ error: 'חסרים פרטים' });
  }

  if (isRecurring) {
    return res.status(400).json({ error: 'אי אפשר לערוך שיעור חוזר. יש לבטל ולקבוע מחדש.' });
  }

  try {
    const newStart = new Date(newSlotStart);
    const newEnd = new Date(newSlotEnd);

    // בדיקת זמינות של המועד החדש (מתעלמת מהאירוע הישן שעומד להימחק)
    const surrounding = await fetchAllEvents(
      new Date(newStart.getTime() - 60_000),
      new Date(newEnd.getTime() + 60_000),
    );
    const conflict = surrounding.find(
      (e) => e.url !== url && newStart < e.end && newEnd > e.start,
    );
    if (conflict) {
      return res.status(409).json({ error: 'המועד החדש כבר תפוס, בחר/י מועד אחר' });
    }

    // יצירת אירוע חדש עם אותם פרטי תלמיד
    await createCalendarEvent({
      studentName: studentName.trim(),
      phone: phone.trim(),
      subject: subject.trim(),
      startDate: newStart,
      endDate: newEnd,
    });

    // מחיקת האירוע הישן (רק אחרי שהחדש נוצר בהצלחה)
    await cancelCalendarEvent(url, etag);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון הפגישה' });
  }
}
