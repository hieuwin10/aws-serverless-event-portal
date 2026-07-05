import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import type { Event, Registration } from '../context/EventContext';

interface QRCheckInPageProps {
  events: Event[];
  registrations: Registration[];
  onBack: () => void;
  qrCheckIn?: (eventId: string, ticketCode: string) => Promise<{ success: boolean; message: string }>;
  getEventRegistrations?: (eventId: string) => Promise<Registration[]>;
}

export const QRCheckInPage: React.FC<QRCheckInPageProps> = ({ events, onBack, qrCheckIn, getEventRegistrations }) => {
  const [ticketCode, setTicketCode] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [eventRegistrations, setEventRegistrations] = useState<Registration[]>([]);
  const [checkedIn, setCheckedIn] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanThrottleRef = useRef<boolean>(false);

  const selectedEvent = events.find((event) => event.id === selectedEventId) || events[0];

  // Fetch real registrations for the selected event on mount/change
  useEffect(() => {
    if (getEventRegistrations && selectedEvent) {
      getEventRegistrations(selectedEvent.id).then(regs => {
        setEventRegistrations(regs);
      }).catch(err => console.error('Failed to fetch registrations', err));
    }
  }, [selectedEvent, getEventRegistrations]);

  // Cleanup camera scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        void scannerRef.current.stop().catch(err => console.error(err));
      }
    };
  }, []);

  const startScanner = async () => {
    setMessage(null);
    try {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          if (scanThrottleRef.current) return;
          scanThrottleRef.current = true;
          
          handleScan(decodedText).finally(() => {
            setTimeout(() => {
              scanThrottleRef.current = false;
            }, 3000);
          });
        },
        () => {
          // Ignored verbose error logs
        }
      );
      setScanning(true);
    } catch (err) {
      console.error(err);
      setMessage("Lỗi: Không thể truy cập Camera thiết bị. Vui lòng cấp quyền.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setScanning(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const demoTickets = useMemo(() => {
    const items = eventRegistrations.map((registration) => ({
      code: registration.ticketCode,
      email: registration.email || 'Ẩn danh',
      checkedIn: registration.checkedIn || false
    }));

    return items.length > 0 ? items : [
      { code: 'AWS-DEMO-1001', email: 'user1@example.com', checkedIn: false },
      { code: 'AWS-DEMO-1002', email: 'user2@example.com', checkedIn: false },
      { code: 'AWS-DEMO-1003', email: 'user3@example.com', checkedIn: false }
    ];
  }, [eventRegistrations]);

  const handleScan = async (code = ticketCode) => {
    const normalized = code.replace(/[^a-zA-Z0-9-]/g, '').trim().toUpperCase();
    setTicketCode(normalized);
    if (!normalized) {
      setMessage('Nhập hoặc chọn mã vé để check-in.');
      return;
    }

    if (qrCheckIn && selectedEvent) {
      setLoading(true);
      setMessage('Đang xử lý điểm danh...');
      try {
        const res = await qrCheckIn(selectedEvent.id, normalized);
        if (res.success) {
          setCheckedIn((current) => [normalized, ...current]);
          setMessage(res.message);
          setTicketCode('');
        } else {
          setMessage(`Lỗi: ${res.message}`);
        }
      } catch (err: any) {
        setMessage(`Lỗi kết nối: ${err.message || 'Không thể liên lạc với server.'}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback local simulation
      const codesOnly = demoTickets.map(t => t.code);
      if (!codesOnly.includes(normalized)) {
        setMessage('Không tìm thấy mã vé trong danh sách đăng ký.');
        return;
      }

      const ticketObj = demoTickets.find(t => t.code === normalized);
      if (ticketObj?.checkedIn || checkedIn.includes(normalized)) {
        setMessage('Vé này đã được check-in trước đó.');
        return;
      }

      setCheckedIn((current) => [normalized, ...current]);
      setTicketCode('');
      setMessage(`Check-in thành công cho vé ${normalized}.`);
    }
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
            <select value={selectedEvent?.id || ''} onChange={(event) => setSelectedEventId(event.target.value)} disabled={loading}>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </div>

          <div className="scanner-frame" style={{ position: 'relative', overflow: 'hidden', minHeight: '260px' }}>
            <div id="reader" style={{ width: '100%', minHeight: '260px', borderRadius: '8px' }}></div>
            {!scanning && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.6)',
                zIndex: 10,
                borderRadius: '8px'
              }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={startScanner}
                  style={{ padding: '12px 24px', cursor: 'pointer' }}
                >
                  Bật Camera điểm danh
                </button>
              </div>
            )}
            {scanning && (
              <>
                <div className="scanner-line" style={{ zIndex: 5 }}></div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={stopScanner}
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 12,
                    padding: '6px 16px',
                    fontSize: '0.85rem'
                  }}
                >
                  Tắt Camera
                </button>
              </>
            )}
          </div>

          <form className="check-in-form" onSubmit={(event) => { event.preventDefault(); handleScan(); }}>
            <div className="form-group">
              <label>Mã vé / QR payload</label>
              <input
                value={ticketCode}
                onChange={(event) => setTicketCode(event.target.value)}
                placeholder="AWS-DEMO-1001"
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Đang điểm danh...' : 'Xác nhận Check-in'}
            </button>
          </form>

          {message && <div className="alert alert-success" style={{ marginTop: '18px' }}>{message}</div>}
        </section>

        <section className="check-in-list card-glass">
          <h2>Vé mẫu để quét</h2>
          <div className="scan-ticket-list">
            {demoTickets.map((ticket) => (
              <button 
                key={ticket.code} 
                className="scan-ticket-item" 
                onClick={() => handleScan(ticket.code)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  textAlign: 'left',
                  opacity: (ticket.checkedIn || checkedIn.includes(ticket.code)) ? 0.6 : 1
                }}
              >
                <div>
                  <strong style={{ display: 'block' }}>{ticket.code}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{ticket.email}</span>
                </div>
                <small>{(ticket.checkedIn || checkedIn.includes(ticket.code)) ? 'Đã check-in' : 'Bấm để quét'}</small>
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
