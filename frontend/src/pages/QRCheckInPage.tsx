import React, { useMemo, useState } from 'react';
import type { Event, Registration } from '../context/EventContext';

interface QRCheckInPageProps {
  events: Event[];
  registrations: Registration[];
  onBack: () => void;
}

export const QRCheckInPage: React.FC<QRCheckInPageProps> = ({ events, registrations, onBack }) => {
  const [ticketCode, setTicketCode] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [checkedIn, setCheckedIn] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const selectedEvent = events.find((event) => event.id === selectedEventId) || events[0];
  const demoTickets = useMemo(() => {
    const realTickets = registrations
      .filter((registration) => !selectedEvent || registration.eventId === selectedEvent.id)
      .map((registration) => registration.ticketCode);

    return realTickets.length > 0 ? realTickets : ['AWS-DEMO-1001', 'AWS-DEMO-1002', 'AWS-DEMO-1003'];
  }, [registrations, selectedEvent]);

  const handleScan = (code = ticketCode) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setMessage('Nhập hoặc chọn mã vé để check-in.');
      return;
    }

    if (!demoTickets.includes(normalized)) {
      setMessage('Không tìm thấy mã vé trong danh sách đăng ký.');
      return;
    }

    if (checkedIn.includes(normalized)) {
      setMessage('Vé này đã được check-in trước đó.');
      return;
    }

    setCheckedIn((current) => [normalized, ...current]);
    setTicketCode('');
    setMessage(`Check-in thành công cho vé ${normalized}.`);
  };

  return (
    <div className="page-check-in fade-in">
      <button className="btn-secondary" style={{ marginBottom: '25px' }} onClick={onBack}>
        Quay lại trang quản trị
      </button>

      <div className="admin-header-row">
        <div>
          <h1 className="section-title">QR Check-in</h1>
          <p className="text-secondary">Mô phỏng quét QR và xác nhận người tham dự tại cổng sự kiện.</p>
        </div>
      </div>

      <div className="check-in-layout">
        <section className="qr-scanner-card card-glass">
          <div className="form-group">
            <label>Sự kiện</label>
            <select value={selectedEvent?.id || ''} onChange={(event) => setSelectedEventId(event.target.value)}>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </div>

          <div className="scanner-frame">
            <div className="scanner-line"></div>
            <div className="mock-qr-code scanner-qr">
              <div className="qr-corner qr-tl"></div>
              <div className="qr-corner qr-tr"></div>
              <div className="qr-corner qr-bl"></div>
              <div className="qr-matrix"></div>
            </div>
          </div>

          <form className="check-in-form" onSubmit={(event) => { event.preventDefault(); handleScan(); }}>
            <div className="form-group">
              <label>Mã vé / QR payload</label>
              <input
                value={ticketCode}
                onChange={(event) => setTicketCode(event.target.value)}
                placeholder="AWS-DEMO-1001"
              />
            </div>
            <button type="submit" className="btn-primary w-full">Xác nhận Check-in</button>
          </form>

          {message && <div className="alert alert-success" style={{ marginTop: '18px' }}>{message}</div>}
        </section>

        <section className="check-in-list card-glass">
          <h2>Vé mẫu để quét</h2>
          <div className="scan-ticket-list">
            {demoTickets.map((code) => (
              <button key={code} className="scan-ticket-item" onClick={() => handleScan(code)}>
                <span>{code}</span>
                <small>{checkedIn.includes(code) ? 'Đã check-in' : 'Bấm để quét'}</small>
              </button>
            ))}
          </div>

          <h2 style={{ marginTop: '28px' }}>Đã check-in ({checkedIn.length})</h2>
          <div className="checked-in-list">
            {checkedIn.length === 0 ? (
              <p className="text-secondary">Chưa có người tham dự nào được xác nhận.</p>
            ) : (
              checkedIn.map((code) => (
                <div key={code} className="checked-in-item">
                  <strong>{code}</strong>
                  <span className="text-secondary">{new Date().toLocaleTimeString('vi-VN')}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
