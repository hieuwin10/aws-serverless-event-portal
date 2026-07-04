import React from 'react';
import type { Event } from '../context/EventContext';

interface EventCardProps {
  event: Event;
  onOpen: (id: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onOpen }) => {
  const pct = Math.min(100, Math.round((event.registeredCount / event.totalSeats) * 100));
  const isSoldOut = event.registeredCount >= event.totalSeats;

  return (
    <article className="event-card card-glass" onClick={() => onOpen(event.id)}>
      <div className="card-image-wrapper">
        <img src={event.imageUrl} alt={event.title} className="card-image" />
        <span className="card-category-tag">{event.category.toUpperCase()}</span>
        {isSoldOut && <span className="card-sold-out-tag">Het ve</span>}
      </div>
      <div className="card-content">
        <span className="card-date-sub">
          {new Date(event.date).toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <h3 className="card-title-main">{event.title}</h3>
        <div className="card-location-line">{event.location}</div>
        <p className="card-desc text-secondary">{event.description.slice(0, 110)}...</p>

        <div className="card-footer-gauge">
          <div className="gauge-text-wrapper">
            <span className="text-secondary">Suc chua</span>
            <span className="gauge-nums">{Math.max(0, event.totalSeats - event.registeredCount)} ghe trong</span>
          </div>
          <div className="gauge-bar-bg">
            <div
              className={`gauge-bar-fill ${isSoldOut ? 'bg-error' : pct > 85 ? 'bg-warn' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button className="btn-secondary w-full" style={{ justifyContent: 'center', marginTop: '15px' }}>
          Xem Chi Tiet
        </button>
      </div>
    </article>
  );
};
