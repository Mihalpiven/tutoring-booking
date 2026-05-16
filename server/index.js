import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fetchEvents, createCalendarEvent } from '../lib/caldav.js';
import { generateAllSlots, filterAvailableSlots, formatSlotLabel } from '../lib/slots.js';
import { SLOT_CONFIG } from '../lib/config.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/slots', async (req, res) => {
  try {
    const allSlots = generateAllSlots();
    const start = new Date();
    const end = new Date(); end.setDate(end.getDate() + SLOT_CONFIG.daysAhead);
    const existingEvents = await fetchEvents(start, end);
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
});

app.post('/api/book', async (req, res) => {
  const { studentName, subject, slotStart, slotEnd } = req.body;
  if (!studentName?.trim() || !subject?.trim() || !slotStart || !slotEnd) {
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
      subject: subject.trim(),
      startDate: start,
      endDate: end,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה ביצירת הפגישה' });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`✓ Server: http://localhost:${PORT}`));
