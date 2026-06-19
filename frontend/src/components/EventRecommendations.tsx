import React from 'react';
import type { Event } from '../context/EventContext';

interface EventRecommendationsProps {
  events: Event[];
  currentEvent?: Event | null;
  onOpen: (id: string) => void;
}

export const EventRecommendations: React.FC<EventRecommendationsProps> = ({ events, currentEvent, onOpen }) => {
  const recommendations = events
    .filter((event) => event.id !== currentEvent?.id)
    .filter((event) => !currentEvent || event.category === currentEvent.category || event.registeredCount < event.totalSeats)
    .slice(0, 3);

  if (recommendations.length === 0) return null;

  return (
    <section className="recommendations-section">
      <div className="section-heading-row">
        <div>
          <h2 className="section-title">Goi Y Su Kien</h2>
          <p className="text-secondary">Lua chon dua tren danh muc va cac su kien con cho trong.</p>
        </div>
      </div>
      <div className="recommendations-grid">
        {recommendations.map((event) => (
          <button key={event.id} className="recommendation-card card-glass" onClick={() => onOpen(event.id)}>
            <img src={event.imageUrl} alt={event.title} />
            <span className="card-date-sub">{event.category}</span>
            <strong>{event.title}</strong>
            <span className="text-secondary">{new Date(event.date).toLocaleDateString('vi-VN')}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
