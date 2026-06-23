import React from 'react';
import type { Event, Registration } from '../context/EventContext';

interface MemberListPageProps {
  event: Event | null;
  registrations: Registration[];
  onBack: () => void;
}

export const MemberListPage: React.FC<MemberListPageProps> = ({ event, registrations, onBack }) => {
  if (!event) {
    return (
      <div className="page-members fade-in">
        <button className="btn-secondary" onClick={onBack}>Quay Lai Admin</button>
        <div className="empty-state card-glass text-center" style={{ padding: '50px', marginTop: '25px' }}>
          <h2>Chua chon su kien</h2>
        </div>
      </div>
    );
  }

  const eventRegistrations = registrations.filter((registration) => registration.eventId === event.id);
  const members = eventRegistrations.length > 0
    ? eventRegistrations
    : Array.from({ length: Math.min(event.registeredCount, 12) }, (_, index) => ({
        registrationId: `mock_member_${index}`,
        eventId: event.id,
        userId: `mock_user_${index}`,
        email: `member${index + 1}@example.com`,
        registeredAt: new Date(Date.now() - index * 3600000).toISOString(),
        ticketCode: `AWS-${event.id.slice(0, 4).toUpperCase()}-${String(index + 1).padStart(4, '0')}`,
      }));

  return (
    <div className="page-members fade-in">
      <button className="btn-secondary" style={{ marginBottom: '25px' }} onClick={onBack}>
        Quay Lai Admin
      </button>

      <div className="admin-header-row">
        <div>
          <h1 className="section-title">Danh Sach Nguoi Dang Ky</h1>
          <p className="text-secondary">{event.title}</p>
        </div>
        <div className="member-count-badge">{members.length} thanh vien</div>
      </div>

      <div className="admin-table-container card-glass" style={{ overflowX: 'auto', padding: '20px' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Email</th>
              <th>Ma ve</th>
              <th>Ngay dang ky</th>
              <th>Trang thai</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <tr key={member.registrationId}>
                <td>{index + 1}</td>
                <td style={{ fontWeight: 'bold' }}>{member.email}</td>
                <td><span className="ticket-code-highlight">{member.ticketCode}</span></td>
                <td>{new Date(member.registeredAt).toLocaleString('vi-VN')}</td>
                <td><span className="status-pill">Da dang ky</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
