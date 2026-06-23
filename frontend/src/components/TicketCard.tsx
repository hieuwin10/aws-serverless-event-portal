import React from 'react';
import type { Event, Registration } from '../context/EventContext';

interface TicketCardProps {
  event: Event;
  registration: Registration;
}

export const TicketCard: React.FC<TicketCardProps> = ({ event, registration }) => (
  <div className="ticket-premium-card fade-in">
    <div className="ticket-border-dashed">
      <div className="ticket-top-badge">AWS EVENT PASS</div>
      <div className="ticket-qr-section">
        <div className="mock-qr-code">
          <div className="qr-corner qr-tl"></div>
          <div className="qr-corner qr-tr"></div>
          <div className="qr-corner qr-bl"></div>
          <div className="qr-matrix"></div>
        </div>
      </div>
      <div className="ticket-details-box">
        <h4 style={{ color: 'var(--color-primary)', letterSpacing: '0.05em' }}>MA VE CUA BAN</h4>
        <h2 style={{ fontSize: '1.4rem', margin: '4px 0 15px', color: 'var(--text-primary)' }}>
          {registration.ticketCode}
        </h2>
        <div className="ticket-meta-fields">
          <div className="meta-field">
            <span className="field-lbl">Su kien</span>
            <span className="field-val">{event.title}</span>
          </div>
          <div className="meta-field" style={{ marginTop: '10px' }}>
            <span className="field-lbl">Email</span>
            <span className="field-val">{registration.email}</span>
          </div>
          <div className="meta-field" style={{ marginTop: '10px' }}>
            <span className="field-lbl">Thoi gian dang ky</span>
            <span className="field-val">{new Date(registration.registeredAt).toLocaleString('vi-VN')}</span>
          </div>
        </div>
      </div>
      <div className="ticket-footer-strip">Xac thuc bang Mock Cognito & DynamoDB</div>
    </div>
  </div>
);
