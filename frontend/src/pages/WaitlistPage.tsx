import React, { useState } from 'react';
import type { Event } from '../context/EventContext';

interface WaitlistPageProps {
  event: Event;
  onBack: () => void;
  onJoinWaitlist: (email: string) => Promise<void>;
}

export const WaitlistPage: React.FC<WaitlistPageProps> = ({ 
  event, 
  onBack, 
  onJoinWaitlist 
}) => {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!email || !phoneNumber) {
        throw new Error('Vui lòng nhập đầy đủ email và số điện thoại.');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Email không hợp lệ.');
      }

      // Phone validation (Vietnam)
      const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;
      if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
        throw new Error('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam.');
      }

      await onJoinWaitlist(email);
      setSuccess('✓ Bạn đã được thêm vào danh sách chờ thành công! Chúng tôi sẽ liên hệ bạn khi có vé trống.');
      setEmail('');
      setPhoneNumber('');
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Mock waitlist data - in thực tế sẽ từ backend
  const mockWaitlist = [
    { position: 1, name: 'Nguyễn Văn A', registeredAt: new Date(Date.now() - 3600000).toLocaleString('vi-VN') },
    { position: 2, name: 'Trần Thị B', registeredAt: new Date(Date.now() - 1800000).toLocaleString('vi-VN') },
    { position: 3, name: 'Phạm Văn C', registeredAt: new Date(Date.now() - 900000).toLocaleString('vi-VN') },
  ];

  return (
    <div className="page-waitlist fade-in">
      <button className="btn-secondary" style={{ marginBottom: '25px' }} onClick={onBack}>
        ← Quay Lại
      </button>

      <div className="waitlist-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
        
        {/* Event Info Card */}
        <div className="waitlist-event-info card-glass">
          <div className="waitlist-event-image">
            <img src={event.imageUrl} alt={event.title} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
            <span className="card-category-tag">{event.category.toUpperCase()}</span>
          </div>
          
          <h2 style={{ marginTop: '20px' }}>{event.title}</h2>
          
          <div className="event-meta-info" style={{ marginTop: '15px' }}>
            <div style={{ marginBottom: '12px' }}>
              <span className="text-secondary" style={{ fontSize: '0.9rem' }}>📅 Thời gian:</span>
              <p style={{ marginTop: '4px' }}>{new Date(event.date).toLocaleString('vi-VN')}</p>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span className="text-secondary" style={{ fontSize: '0.9rem' }}>📍 Địa điểm:</span>
              <p style={{ marginTop: '4px' }}>{event.location}</p>
            </div>
            <div>
              <span className="text-secondary" style={{ fontSize: '0.9rem' }}>👥 Tổng sức chứa:</span>
              <p style={{ marginTop: '4px' }}>{event.totalSeats} ghế</p>
            </div>
          </div>

          <div className="sold-out-badge" style={{
            backgroundColor: 'rgba(255, 80, 80, 0.15)',
            border: '2px solid var(--color-error)',
            padding: '15px',
            borderRadius: 'var(--radius-md)',
            marginTop: '20px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '2rem' }}>❌</span>
            <h3 style={{ color: 'var(--color-error)', marginTop: '10px' }}>Sự Kiện Đã Hết Vé</h3>
            <p className="text-secondary" style={{ marginTop: '8px', fontSize: '0.9rem' }}>
              Tất cả {event.totalSeats} ghế đã được đặt hết. Tham gia danh sách chờ để nhận thông báo khi có vé trống.
            </p>
          </div>
        </div>

        {/* Waitlist Form & List */}
        <div className="waitlist-section">
          
          {/* Join Waitlist Form */}
          <div className="join-waitlist-card card-glass" style={{ padding: '25px', marginBottom: '25px' }}>
            <h3 style={{ marginBottom: '8px' }}>Tham Gia Danh Sách Chờ</h3>
            <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
              Nhập thông tin của bạn. Chúng tôi sẽ thông báo ngay khi có chỗ trống.
            </p>

            {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>}
            {success && <div className="alert alert-success" style={{ marginBottom: '15px' }}>{success}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group">
                <label>Email *</label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Số Điện Thoại *</label>
                <input 
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0912345678"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary w-full" 
                disabled={loading}
                style={{ justifyContent: 'center', marginTop: '10px' }}
              >
                {loading ? 'Đang xử lý...' : '⏳ Tham Gia Danh Sách Chờ'}
              </button>
            </form>

            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '15px', textAlign: 'center' }}>
              Chúng tôi sẽ liên hệ với bạn qua email hoặc SMS khi có vé trống.
            </p>
          </div>

          {/* Waitlist Stats */}
          <div className="waitlist-stats card-glass" style={{ padding: '20px', marginBottom: '25px' }}>
            <h3 style={{ marginBottom: '15px' }}>Thống Kê Danh Sách Chờ</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="stat-item" style={{
                backgroundColor: 'rgba(0, 150, 255, 0.1)',
                padding: '15px',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center'
              }}>
                <span className="stat-label text-secondary" style={{ fontSize: '0.85rem' }}>Đang Chờ</span>
                <span className="stat-value" style={{ fontSize: '1.8rem', color: 'var(--color-accent)', marginTop: '8px', display: 'block' }}>
                  {mockWaitlist.length}
                </span>
              </div>
              <div className="stat-item" style={{
                backgroundColor: 'rgba(200, 120, 255, 0.1)',
                padding: '15px',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center'
              }}>
                <span className="stat-label text-secondary" style={{ fontSize: '0.85rem' }}>Khả Năng (Est.)</span>
                <span className="stat-value" style={{ fontSize: '1.8rem', color: 'var(--color-primary)', marginTop: '8px', display: 'block' }}>
                  ~{Math.round((event.totalSeats / (event.registeredCount || 1)) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Waitlist Preview */}
          <div className="waitlist-preview card-glass" style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>Danh Sách Chờ Hiện Tại (Top 3)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mockWaitlist.map((item) => (
                <div key={item.position} className="waitlist-item" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--color-primary)'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    fontWeight: 'bold',
                    marginRight: '12px',
                    flexShrink: 0
                  }}>
                    {item.position}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: '500' }}>{item.name}</p>
                    <span className="text-secondary" style={{ fontSize: '0.85rem' }}>{item.registeredAt}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-secondary" style={{ marginTop: '15px', fontSize: '0.85rem', textAlign: 'center' }}>
              Hiển thị top 3. Tổng {mockWaitlist.length} người đang chờ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
