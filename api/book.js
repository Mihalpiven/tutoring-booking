import { fetchAllEvents, createCalendarEvent } from '../lib/caldav.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RECURRENCE_MONTHS = 6;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { studentName, phone, subject, slotStart, slotEnd, recurringUntil } = req.body;
  if (!studentName?.trim() || !phone?.trim() || !subject?.trim() || !slotStart || !slotEnd) {
    return res.status(400).json({ error: 'נא למלא את כל השדות' });
  }

  try {
    const start = new Date(slotStart);
    const end = new Date(slotEnd);
    const duration = end - start;

    // חישוב מופעים — שיעור חד-פעמי או חוזר
    const occurrences = [{ start: new Date(start), end: new Date(end) }];
    let untilDate = null;

    if (recurringUntil) {
      untilDate = new Date(recurringUntil);
      const maxUntil = new Date(start);
      maxUntil.setMonth(maxUntil.getMonth() + MAX_RECURRENCE_MONTHS);
      if (untilDate > maxUntil) {
        return res.status(400).json({ error: `אי אפשר לקבוע שיעור חוזר ליותר מ-${MAX_RECURRENCE_MONTHS} חודשים` });
      }
      if (untilDate <= start) {
        return res.status(400).json({ error: 'תאריך הסיום חייב להיות אחרי תאריך השיעור הראשון' });
      }

      let cursorStart = new Date(start.getTime() + WEEK_MS);
      while (cursorStart <= untilDate) {
        occurrences.push({
          start: new Date(cursorStart),
          end: new Date(cursorStart.getTime() + duration),
        });
        cursorStart = new Date(cursorStart.getTime() + WEEK_MS);
      }
    }

    // בדיקת התנגשויות בכל לוחות השנה
    const checkStart = new Date(occurrences[0].start.getTime() - 60_000);
    const checkEnd = new Date(occurrences[occurrences.length - 1].end.getTime() + 60_000);
    const existing = await fetchAllEvents(checkStart, checkEnd);

    for (const occ of occurrences) {
      const conflict = existing.find((e) => occ.start < e.end && occ.end > e.start);
      if (conflict) {
        const dateStr = occ.start.toLocaleDateString('he-IL', {
          timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'long',
        });
        return res.status(409).json({
          error: occurrences.length > 1
            ? `אחד המופעים תפוס (${dateStr}). נסה/י תאריך סיום מוקדם יותר.`
            : 'הסלוט כבר נתפס, נסה/י לבחור אחד אחר',
        });
      }
    }

    await createCalendarEvent({
      studentName: studentName.trim(),
      phone: phone.trim(),
      subject: subject.trim(),
      startDate: start,
      endDate: end,
      recurringUntil: untilDate,
    });

    res.json({ success: true, occurrences: occurrences.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה ביצירת הפגישה' });
  }
}
