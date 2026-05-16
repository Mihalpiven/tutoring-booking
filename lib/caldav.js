import { DAVClient } from 'tsdav';
import ICAL from 'ical.js';
import { v4 as uuidv4 } from 'uuid';

async function connect() {
  const client = new DAVClient({
    serverUrl: 'https://caldav.icloud.com',
    credentials: {
      username: process.env.APPLE_ID,
      password: process.env.APP_SPECIFIC_PASSWORD,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  await client.login();
  const calendars = await client.fetchCalendars();
  const calName = process.env.CALENDAR_NAME || 'Calendar';
  const calendar = calendars.find((c) => c.displayName === calName) ?? calendars[0];
  if (!calendar) throw new Error('לא נמצא לוח שנה');
  return { client, calendar };
}

export async function fetchEvents(start, end) {
  const { client, calendar } = await connect();
  const objects = await client.fetchCalendarObjects({
    calendar,
    timeRange: { start: start.toISOString(), end: end.toISOString() },
  });

  const events = [];
  for (const obj of objects) {
    if (!obj.data) continue;
    try {
      const comp = new ICAL.Component(ICAL.parse(obj.data));
      for (const vevent of comp.getAllSubcomponents('vevent')) {
        const e = new ICAL.Event(vevent);
        events.push({ start: e.startDate.toJSDate(), end: e.endDate.toJSDate() });
      }
    } catch { /* אירוע לא תקין */ }
  }
  return events;
}

export async function createCalendarEvent({ studentName, subject, startDate, endDate }) {
  const { client, calendar } = await connect();
  const uid = uuidv4();
  const stamp = toICS(new Date());

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TutoringBooking//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}@tutoring`,
    `DTSTAMP:${stamp}`, `CREATED:${stamp}`,
    `DTSTART:${toICS(startDate)}`, `DTEND:${toICS(endDate)}`,
    `SUMMARY:שיעור - ${subject}`,
    `DESCRIPTION:תלמיד: ${studentName}\\nנושא: ${subject}`,
    'STATUS:CONFIRMED',
    'END:VEVENT', 'END:VCALENDAR',
  ];

  await client.createCalendarObject({
    calendar,
    filename: `${uid}.ics`,
    iCalString: lines.join('\r\n'),
  });
  return uid;
}

function toICS(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
