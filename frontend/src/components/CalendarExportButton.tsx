import React from 'react';
import type { Event } from '../context/EventContext';

interface CalendarExportButtonProps {
  event: Event;
}

const toCalendarDate = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

export const CalendarExportButton: React.FC<CalendarExportButtonProps> = ({ event }) => {
  const handleExport = () => {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AWS EventPortal//Event Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@aws-eventportal.local`,
      `DTSTAMP:${toCalendarDate(new Date().toISOString())}`,
      `DTSTART:${toCalendarDate(start.toISOString())}`,
      `DTEND:${toCalendarDate(end.toISOString())}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
      `LOCATION:${event.location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const googleUrl = new URL('https://calendar.google.com/calendar/render');
  const start = new Date(event.date);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  googleUrl.searchParams.set('action', 'TEMPLATE');
  googleUrl.searchParams.set('text', event.title);
  googleUrl.searchParams.set('dates', `${toCalendarDate(start.toISOString())}/${toCalendarDate(end.toISOString())}`);
  googleUrl.searchParams.set('details', event.description);
  googleUrl.searchParams.set('location', event.location);

  return (
    <div className="calendar-actions">
      <button type="button" className="btn-secondary" onClick={handleExport}>
        Xuat lich .ics
      </button>
      <a className="btn-secondary" href={googleUrl.toString()} target="_blank" rel="noreferrer">
        Them vao Google Calendar
      </a>
    </div>
  );
};
