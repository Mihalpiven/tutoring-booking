import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
});

const SUBJECTS = [
  'מתמטיקה', 'פיזיקה', 'כימיה', 'ביולוגיה', 'אנגלית',
  'עברית', 'היסטוריה', 'אזרחות', 'ספרות', 'מחשבים',
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

export default function App() {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(true);

  useEffect(() => {
    api
      .get('/api/slots')
      .then(({ data }) => {
        setSlots(data.slots);
        setCalendarConnected(data.calendarConnected);
        setStatus('idle');
      })
      .catch(() => {
        setErrorMsg('לא ניתן לטעון את הסלוטים. ודא שהשרת פועל.');
        setStatus('error');
      });
  }, []);

  const slotGroups = useMemo(() => groupByDate(slots), [slots]);

  const canSubmit =
    name.trim().split(' ').length >= 2 &&
    name.trim().length > 3 &&
    subject.trim().length > 1 &&
    selectedSlot !== null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus('submitting');
    try {
      await api.post('/api/book', {
        studentName: name.trim(),
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

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  if (status === 'success') {
    const d = new Date(selectedSlot.start);
    const dateStr = d.toLocaleDateString('he-IL', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    return (
      <div className="page">
        <div className="card success-card">
          <div className="success-icon">✓</div>
          <h2>השיעור נקבע בהצלחה!</h2>
          <div className="success-details">
            <p><strong>{name}</strong></p>
            <p>נושא: {subject}</p>
            <p>{dateStr}</p>
            <p>{formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)}</p>
          </div>
          <p className="success-note">הפגישה נוספה ללוח השנה.</p>
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            קביעת שיעור נוסף
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <h1>קביעת שיעור פרטי</h1>
        <p className="subtitle">בחר/י זמן פנוי וקבע/י שיעור בקלות</p>
      </header>

      {!calendarConnected && status !== 'loading' && (
        <div className="banner banner-warn">
          ⚠ לוח השנה לא מחובר — הסלוטים המוצגים הם לפי שעות העבודה בלבד, ללא בדיקת זמינות אמיתית.
        </div>
      )}

      <form className="card form-card" onSubmit={handleSubmit}>
        <h2 className="section-title">פרטים אישיים</h2>

        <div className="field">
          <label htmlFor="name">שם מלא (שם + שם משפחה)</label>
          <input
            id="name"
            type="text"
            placeholder="ישראל ישראלי"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="subject">נושא הלימוד</label>
          <input
            id="subject"
            type="text"
            placeholder="מתמטיקה, פיזיקה, אנגלית..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            list="subjects-list"
            required
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
          <p className="empty-msg">אין סלוטים פנויים כרגע. נסה שוב מאוחר יותר.</p>
        )}

        {status !== 'loading' && slots.length > 0 && (
          <div className="slots-container">
            {Object.entries(slotGroups).map(([dateLabel, daySlots]) => (
              <div key={dateLabel} className="day-group">
                <div className="day-label">{dateLabel}</div>
                <div className="slots-row">
                  {daySlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
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
          type="submit"
          className="btn-primary"
          disabled={!canSubmit || status === 'submitting'}
        >
          {status === 'submitting' ? 'קובע שיעור...' : 'קבע/י שיעור'}
        </button>

        {!canSubmit && status === 'idle' && (
          <p className="hint">
            {!name.trim().includes(' ') ? 'הכנס/י שם מלא (שם ושם משפחה) ' : ''}
            {!selectedSlot ? '• בחר/י מועד' : ''}
          </p>
        )}
      </form>
    </div>
  );
}
