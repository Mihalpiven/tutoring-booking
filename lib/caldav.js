import pkg from 'tsdav';
import ICAL from 'ical.js';
import { v4 as uuidv4 } from 'uuid';

const { DAVClient } = pkg;

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
  return { client, calendars };
}

function findTargetCalendar(calendars) {
  const calName = process.env.CALENDAR_NAME || 'Calendar';
  const calendar = calendars.find((c) => c.displayName === calName) ?? calendars[0];
  if (!calendar) throw new Error('לא נמצא לוח שנה');
  return calendar;
}

function pushEvent(events, e, obj, calendarName, startDate, endDate, isRecurring = false) {
  events.push({
    start: startDate,
    end: endDate,
    summary: e.summary ?? '',
    description: e.description ?? '',
    url: obj.url,
    etag: obj.etag,
    calendarName,
    isRecurring,
  });
}

function expandRecurring(e, obj, calendarName, rangeStart, rangeEnd, events) {
  try {
    const durationMs = e.endDate.toJSDate().getTime() - e.startDate.toJSDate().getTime();
    const iter = e.iterator();
    const maxIter = 500;
    let count = 0;
    let next;
    while ((next = iter.next()) && count++ < maxIter) {
      const startMs = next.toJSDate().getTime();
      if (startMs > rangeEnd.getTime()) break;
      const endMs = startMs + durationMs;
      if (endMs < rangeStart.getTime()) continue;
      pushEvent(events, e, obj, calendarName, new Date(startMs), new Date(endMs), true);
    }
  } catch { /* יש בעיה בכלל החזרה - מדלגים */ }
}

function parseObjects(objects, calendarName, rangeStart, rangeEnd) {
  const events = [];
  for (const obj of objects) {
    if (!obj.data) continue;
    try {
      const comp = new ICAL.Component(ICAL.parse(obj.data));
      for (const vevent of comp.getAllSubcomponents('vevent')) {
        const e = new ICAL.Event(vevent);
        if (e.isRecurring() && rangeStart && rangeEnd) {
          expandRecurring(e, obj, calendarName, rangeStart, rangeEnd, events);
        } else {
          try {
            pushEvent(events, e, obj, calendarName, e.startDate.toJSDate(), e.endDate.toJSDate());
          } catch { /* אירוע ללא תאריך */ }
        }
      }
    } catch { /* אירוע לא תקין */ }
  }
  return events;
}

// קורא אירועים מכל לוחות השנה במקביל (לבדיקת זמינות)
export async function fetchAllEvents(start, end) {
  const { client, calendars } = await connect();
  const range = { start: start.toISOString(), end: end.toISOString() };

  const results = await Promise.allSettled(
    calendars.map(async (cal) => {
      const objects = await client.fetchCalendarObjects({ calendar: cal, timeRange: range });
      return parseObjects(objects, cal.displayName, start, end);
    }),
  );

  const all = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return all;
}

// קורא אירועים רק מלוח "שיעור פרטי" (לחיפוש שיעורים לביטול)
export async function fetchBookingEvents(start, end) {
  const { client, calendars } = await connect();
  const calendar = findTargetCalendar(calendars);
  const objects = await client.fetchCalendarObjects({
    calendar,
    timeRange: { start: start.toISOString(), end: end.toISOString() },
  });
  return parseObjects(objects, calendar.displayName, start, end);
}

export async function createCalendarEvent({ studentName, phone, subject, startDate, endDate, recurringUntil }) {
  const { client, calendars } = await connect();
  const calendar = findTargetCalendar(calendars);
  const uid = uuidv4();
  const stamp = toICS(new Date());

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TutoringBooking//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}@tutoring`,
    `DTSTAMP:${stamp}`, `CREATED:${stamp}`,
    `DTSTART:${toICS(startDate)}`, `DTEND:${toICS(endDate)}`,
    `SUMMARY:שיעור - ${subject} - ${studentName}`,
    `DESCRIPTION:תלמיד: ${studentName}\\nטלפון: ${phone}\\nנושא: ${subject}`,
  ];
  if (recurringUntil) {
    lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${toICS(recurringUntil)}`);
  }
  lines.push('STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR');

  await client.createCalendarObject({
    calendar,
    filename: `${uid}.ics`,
    iCalString: lines.join('\r\n'),
  });
  return uid;
}

export async function cancelCalendarEvent(url, etag) {
  const { client } = await connect();
  await client.deleteCalendarObject({
    calendarObject: { url, etag },
  });
}

function toICS(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
