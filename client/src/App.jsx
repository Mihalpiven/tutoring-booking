import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
});

const SUBJECTS = [
  'מתמטיקה 5 יח"ל',
  'מתמטיקה 4 יח"ל',
  'מתמטיקה 3 יח"ל',
  'חדוא 1',
  'חדוא 2',
  'פיסיקה',
  'סטטיסטיקה',
];

function groupByDate(slots) {
  const groups = {};
  for (const slot of slots) {
    const d = new Date(slot.start);
    const key = d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(slot);
  }
  return groups;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('he-IL', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function formatDateLong(iso) {
  return new Date(iso).toLocaleDateString('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function googleCalendarUrl({ start, end, name, subject }) {
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `שיעור פרטי - ${subject}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `תלמיד: ${name}\nנושא: ${subject}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function App() {
  const [tab, setTab] = useState('book');

  return (
    <div className="page">
      <header className="header">
        <h1>שיעורים פרטיים</h1>
        <p className="subtitle">קביעה וביטול בקלות</p>
      </header>

      <div className="tabs">
        <button
          className={`tab-btn ${tab === 'book' ? 'active' : ''}`}
          onClick={() => setTab('book')}
        >
          קביעת שיעור
        </button>
        <button
          className={`tab-btn ${tab === 'cancel' ? 'active' : ''}`}
          onClick={() => setTab('cancel')}
        >
          ביטול שיעור
        </button>
      </div>

      {tab === 'book' ? <BookView /> : <CancelView />}
    </div>
  );
}

function BookView() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(true);

  useEffect(() => {
    api.get('/api/slots')
      .then(({ data }) => {
        setSlots(data.slots);
        setCalendarConnected(data.calendarConnected);
        setStatus('idle');
      })
      .catch(() => {
        setErrorMsg('לא ניתן לטעון את הסלוטים. נסה/י שוב.');
        setStatus('error');
      });
  }, []);

  const slotGroups = useMemo(() => groupByDate(slots), [slots]);

  const canSubmit =
    name.trim().split(/\s+/).filter(Boolean).length >= 2 &&
    phone.trim().replace(/\D/g, '').length >= 9 &&
    subject.trim().length > 1 &&
    selectedSlot !== null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');
    try {
      await api.post('/api/book', {
        studentName: name.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        slotStart: selectedSlot.start,
        slotEnd: selectedSlot.end,
      });
      setStatus('success');
    } catch (err) {
      const msg = err.response?.data?.error ?? 'שגיאה בקביעת השיעור';
      setErrorMsg(msg);
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="card success-card">
        <div className="success-icon">✓</div>
        <h2>השיעור נקבע בהצלחה!</h2>
        <div className="success-details">
          <p><strong>{name}</strong></p>
          <p>נושא: {subject}</p>
          <p>{formatDateLong(selectedSlot.start)}</p>
          <p>{formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)}</p>
        </div>
        <p className="success-note">הפגישה נוספה ללוח השנה של המורה.</p>

        <a
          className="btn-primary btn-google"
          href={googleCalendarUrl({
            start: selectedSlot.start,
            end: selectedSlot.end,
            name, subject,
          })}
          target="_blank"
          rel="noopener noreferrer"
        >
          📅 הוסף ליומן Google שלי
        </a>

        <button className="btn-secondary" onClick={() => window.location.reload()}>
          קביעת שיעור נוסף
        </button>
      </div>
    );
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      {!calendarConnected && status !== 'loading' && (
        <div className="banner banner-warn">
          ⚠ לוח השנה לא מחובר — הסלוטים המוצגים לא בהכרח פנויים.
        </div>
      )}

      <h2 className="section-title">פרטים אישיים</h2>

      <div className="field">
        <label htmlFor="name">שם מלא (שם + שם משפחה)</label>
        <input
          id="name" type="text" placeholder="ישראל ישראלי"
          value={name} onChange={(e) => setName(e.target.value)} required
        />
      </div>

      <div className="field">
        <label htmlFor="phone">טלפון</label>
        <input
          id="phone" type="tel" placeholder="050-1234567" inputMode="tel"
          value={phone} onChange={(e) => setPhone(e.target.value)} required
        />
      </div>

      <div className="field">
        <label htmlFor="subject">נושא הלימוד</label>
        <input
          id="subject" type="text" placeholder="בחר/י מהרשימה או הקלד/י"
          value={subject} onChange={(e) => setSubject(e.target.value)}
          list="subjects-list" required
        />
        <datalist id="subjects-list">
          {SUBJECTS.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>

      <h2 className="section-title">בחירת מועד</h2>

      {status === 'loading' && (
        <div className="loading">
          <div className="spinner" />
          <span>טוען זמינות...</span>
        </div>
      )}

      {status !== 'loading' && slots.length === 0 && (
        <p className="empty-msg">אין סלוטים פנויים השבוע.</p>
      )}

      {status !== 'loading' && slots.length > 0 && (
        <div className="slots-container">
          {Object.entries(slotGroups).map(([dateLabel, daySlots]) => (
            <div key={dateLabel} className="day-group">
              <div className="day-label">{dateLabel}</div>
              <div className="slots-row">
                {daySlots.map((slot) => (
                  <button
                    key={slot.id} type="button"
                    className={`slot-btn ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {formatTime(slot.start)} – {formatTime(slot.end)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="banner banner-error">{errorMsg}</div>
      )}

      <button
        type="submit" className="btn-primary"
        disabled={!canSubmit || status === 'submitting'}
      >
        {status === 'submitting' ? 'קובע שיעור...' : 'קבע/י שיעור'}
      </button>
    </form>
  );
}

function CancelView() {
  const [name, setName] = useState('');
  const [bookings, setBookings] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [cancelingUrl, setCancelingUrl] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) {
      setErrorMsg('יש להזין שם מלא (שם + שם משפחה)');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const { data } = await api.post('/api/my-bookings', { studentName: name.trim() });
      setBookings(data.bookings);
      setStatus('idle');
    } catch (err) {
      setErrorMsg(err.response?.data?.error ?? 'שגיאה בחיפוש');
      setStatus('error');
    }
  }

  async function handleCancel(booking) {
    if (!window.confirm(`לבטל את השיעור ב-${formatDateLong(booking.start)} בשעה ${formatTime(booking.start)}?`)) {
      return;
    }
    setCancelingUrl(booking.url);
    try {
      await api.post('/api/cancel', { url: booking.url, etag: booking.etag });
      setBookings(bookings.filter((b) => b.url !== booking.url));
    } catch {
      setErrorMsg('שגיאה בביטול. נסה/י שוב.');
    }
    setCancelingUrl(null);
  }

  return (
    <div className="card form-card">
      <h2 className="section-title">חיפוש שיעורים</h2>

      <form onSubmit={handleSearch}>
        <div className="field">
          <label htmlFor="cancel-name">שם מלא (שם + שם משפחה)</label>
          <input
            id="cancel-name" type="text" placeholder="ישראל ישראלי"
            value={name} onChange={(e) => setName(e.target.value)} required
          />
        </div>

        {errorMsg && <div className="banner banner-error">{errorMsg}</div>}

        <button type="submit" className="btn-primary" disabled={status === 'loading'}>
          {status === 'loading' ? 'מחפש...' : 'הצג את השיעורים שלי'}
        </button>
      </form>

      {bookings !== null && (
        <div className="bookings-list">
          <h2 className="section-title">השיעורים שלך</h2>
          {bookings.length === 0 && (
            <p className="empty-msg">לא נמצאו שיעורים על השם הזה.</p>
          )}
          {bookings.map((b) => (
            <div key={b.url} className="booking-item">
              <div className="booking-info">
                <div className="booking-date">{formatDateLong(b.start)}</div>
                <div className="booking-time">
                  {formatTime(b.start)} – {formatTime(b.end)}
                </div>
                <div className="booking-summary">{b.summary}</div>
              </div>
              <button
                className="btn-danger"
                disabled={cancelingUrl === b.url}
                onClick={() => handleCancel(b)}
              >
                {cancelingUrl === b.url ? 'מבטל...' : 'בטל'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
