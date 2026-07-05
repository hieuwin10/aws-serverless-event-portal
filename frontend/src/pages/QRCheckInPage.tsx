import React, { useMemo, useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { useAuth } from '../context/AuthContext';
import type { Event, Registration } from '../context/EventContext';

interface QRCheckInPageProps {
  events: Event[];
  registrations: Registration[];
  onBack: () => void;
}

export const QRCheckInPage: React.FC<QRCheckInPageProps> = ({ events, registrations, onBack }) => {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || import.meta.env.VITE_API_BASE_URL || '';

  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  
  const [ticketCode, setTicketCode] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [checkedIn, setCheckedIn] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const selectedEvent = events.find((event) => event.id === selectedEventId) || events[0];
  const demoTickets = useMemo(() => {
    const realTickets = registrations
      .filter((registration) => !selectedEvent || registration.eventId === selectedEvent.id)
      .map((registration) => registration.ticketCode);

    return realTickets.length > 0 ? realTickets : ['AWS-DEMO-1001', 'AWS-DEMO-1002', 'AWS-DEMO-1003'];
  }, [registrations, selectedEvent]);

  // Initialize QR Scanner
  useEffect(() => {
    if (!videoRef.current || !scannerActive) return;

    const initScanner = async () => {
      try {
        setCameraError(null);
        qrScannerRef.current = new QrScanner(
          videoRef.current!,
          async (result) => {
            // Auto-trigger check-in when QR code is detected
            const qrCode = result.data.trim().toUpperCase();
            if (qrCode && !loading) {
              await handleScan(qrCode);
            }
          },
          {
            onDecodeError: (err) => {
              // Silently handle decode errors during scanning
              console.log('Decode error (ignored):', err.message);
            },
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 5,
          }
        );
        
        try {
          await qrScannerRef.current.start();
        } catch (err: any) {
          setCameraError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập và thử lại.');
          console.error('Camera error:', err);
        }
      } catch (err: any) {
        setCameraError('Lỗi khởi tạo QR scanner: ' + err.message);
        console.error('Scanner init error:', err);
      }
    };

    initScanner();

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, [scannerActive]);

  const handleScan = async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setMessage('Quét mã QR hoặc nhập mã vé để check-in.');
      return;
    }

    // Try to call backend API first if configured
    if (API_BASE_URL && selectedEvent) {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/events/${selectedEvent.id}/checkin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ ticketCode: normalized, manualOverride: false })
        });
        const resJson = await res.json();
        if (resJson.success) {
          setCheckedIn((current) => [normalized, ...current]);
          setTicketCode('');
          setMessage(`✓ Check-in thành công! ${resJson.data.message || ''}`);
          setLoading(false);
          return;
        } else {
          // Backend returned error
          setMessage(`❌ ${resJson.error || 'Lỗi check-in'}`);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        // API call failed, fallback to mock
        console.warn('Backend API failed, falling back to mock mode', err.message);
      }
      setLoading(false);
    }

    // Fallback to mock/demo mode
    if (checkedIn.includes(normalized)) {
      setMessage('Vé này đã được check-in trước đó.');
      return;
    }

    setCheckedIn((current) => [normalized, ...current]);
    setTicketCode('');
    setMessage(`(Mock) Check-in thành công cho vé ${normalized}. (Không kết nối backend)`);
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

          {cameraError && (
            <div className="alert alert-error" style={{ marginBottom: '18px' }}>
              {cameraError}
            </div>
          )}

          <div className="scanner-frame">
            <video
              ref={videoRef}
              style={{
                width: '100%',
                borderRadius: '8px',
                aspectRatio: '1',
                objectFit: 'cover',
                backgroundColor: '#000'
              }}
            />
            <div className="scanner-line"></div>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
            <p>📱 Hướng camera đến mã QR để quét tự động</p>
          </div>

          <form className="check-in-form" onSubmit={(event) => { event.preventDefault(); handleScan(ticketCode); }}>
            <div className="form-group">
              <label>Hoặc nhập thủ công (nếu quét không được)</label>
              <input
                value={ticketCode}
                onChange={(event) => setTicketCode(event.target.value)}
                placeholder="AWS-DEMO-1001"
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Đang xử lý...' : '✓ Xác nhận'}
            </button>
          </form>

          {message && <div className="alert alert-success" style={{ marginTop: '18px' }}>{message}</div>}
        </section>

        <section className="check-in-list card-glass">
          <h2>Vé mẫu để quét</h2>
          <div className="scan-ticket-list">
            {demoTickets.map((code) => (
              <button 
                disabled={loading}
                key={code} 
                className="scan-ticket-item" 
                onClick={() => handleScan(code)}
              >
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
