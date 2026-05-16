import { DAVClient } from 'tsdav';
import ICAL from 'ical.js';
import { v4 as uuidv4 } from 'uuid';

let client = null;
let targetCalendar = null;

export async function initCalDAV() {
  client = new DAVClient({
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
  targetCalendar =
    calendars.find((c) => c.displayName === calName) ?? calendars[0];

  if (!targetCalendar) throw new Error('לא נמצא לוח שנה');
  console.log(`✓ לוח שנה מחובר: ${targetCalendar.displayName}`);
}

export async function fetchEvents(start, end) {
  const objects = await client.fetchCalendarObjects({
    calendar: targetCalendar,
    timeRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  });

  const events = [];
  for (const obj of objects) {
    if (!obj.data) continue;
    try {
      const jcal = ICAL.parse(obj.data);
      const comp = new ICAL.Component(jcal);
      for (const vevent of comp.getAllSubcomponents('vevent')) {
        const event = new ICAL.Event(vevent);
        events.push({
          start: event.startDate.toJSDate(),
          end: event.endDate.toJSDate(),
          summary: event.summary ?? '',
        });
      }
    } catch {
      // אירוע לא תקין — מדלגים
    }
  }
  return events;
}

export async function createCalendarEvent({ studentName, subject, startDate, endDate }) {
  const uid = uuidv4();
  const stamp = toICSDate(new Date());

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TutoringBooking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}@tutoring`,
    `DTSTAMP:${stamp}`,
    `CREATED:${stamp}`,
    `DTSTART:${toICSDate(startDate)}`,
    `DTEND:${toICSDate(endDate)}`,
    `SUMMARY:שיעור - ${subject}`,
    `DESCRIPTION:תלמיד: ${studentName}\\nנושא: ${subject}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  await client.createCalendarObject({
    calendar: targetCalendar,
    filename: `${uid}.ics`,
    iCalString: icsLines.join('\r\n'),
  });

  return uid;
}

function toICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
