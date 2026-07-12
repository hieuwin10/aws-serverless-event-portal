import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface UserProfilePageProps {
  onLogout: () => void;
  onBack: () => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ onLogout, onBack }) => {
  const { user, changePassword, deleteAccount, token, refreshUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'security' | 'payments' | 'notifications' | 'preferences'>('profile');
  
  // Refresh profile details on mount to get latest loyaltyPoints
  useEffect(() => {
    if (refreshUserProfile) {
      void refreshUserProfile();
    }
  }, []);

  const [payments, setPayments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Fetch payments and notifications when tab changes
  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    if (activeTab === 'attendance' && token) {
      setAttendanceLoading(true);
      fetch(`${API_BASE_URL}/users/registrations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setAttendanceHistory(json.data);
        }
      })
      .catch(err => console.error('Failed to load attendance history', err))
      .finally(() => setAttendanceLoading(false));
    }
    
    if (activeTab === 'payments' && token) {
      setPaymentsLoading(true);
      fetch(`${API_BASE_URL}/users/payments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setPayments(json.data);
        }
      })
      .catch(err => console.error('Failed to load payments', err))
      .finally(() => setPaymentsLoading(false));
    }

    if (activeTab === 'notifications' && token) {
      setNotificationsLoading(true);
      fetch(`${API_BASE_URL}/users/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setNotifications(json.data);
        }
      })
      .catch(err => console.error('Failed to load notifications', err))
      .finally(() => setNotificationsLoading(false));
    }
  }, [activeTab, token]);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    setLoading(true);

    try {
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        throw new Error('Vui lòng nhập đầy đủ thông tin mật khẩu.');
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự.');
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('Mật khẩu xác nhận không khớp.');
      }

      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordSuccess('Mật khẩu đã được thay đổi thành công.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (err: any) {
      setPasswordError(err.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.')) {
      return;
    }

    setLoading(true);
    try {
      await deleteAccount();
      alert('Tài khoản của bạn đã được xóa thành công.');
      onLogout();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi xóa tài khoản.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!user) {
    return (
      <div className="page-profile fade-in">
        <div className="loading-spinner">Đang tải thông tin...</div>
      </div>
    );
  }

  const roleLabel = user.role === 'Admin' ? 'Quản trị viên' : 'Người dùng';
  const attendedCount = attendanceHistory.filter(item => item.checkedIn).length;
  const completedCount = attendanceHistory.filter(item => item.checkedIn && item.checkedOut).length;

  return (
    <div className="page-profile fade-in">
      <button className="btn-secondary" style={{ marginBottom: '25px' }} onClick={onBack}>
        Quay lại
      </button>

      <div className="profile-layout" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '30px', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="profile-sidebar card-glass" style={{ padding: '25px', height: 'fit-content', position: 'sticky', top: '20px' }}>
          <div className="profile-avatar-section" style={{ textAlign: 'center', marginBottom: '25px' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto 15px',
                fontWeight: 800
              }}
            >
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <h3 style={{ margin: '0 0 5px' }}>{user.name}</h3>
            <p className="text-secondary" style={{ margin: '0 0 12px', fontSize: '0.85rem' }}>{user.email}</p>
            <div
              style={{
                display: 'inline-block',
                backgroundColor: 'rgba(0, 150, 255, 0.2)',
                border: '1px solid var(--color-accent)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                color: 'var(--color-accent)'
              }}
            >
              {roleLabel}
            </div>
          </div>

          <div className="profile-nav" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { key: 'profile', label: 'Hồ sơ cá nhân' },
              { key: 'attendance', label: 'Lịch sử tham dự' },
              { key: 'security', label: 'Bảo mật' },
              { key: 'payments', label: 'Lịch sử thanh toán' },
              { key: 'notifications', label: 'Thông báo' },
              { key: 'preferences', label: 'Tùy chọn' }
            ].map(item => (
              <button
                key={item.key}
                className={`profile-nav-item ${activeTab === item.key ? 'active' : ''}`}
                onClick={() => setActiveTab(item.key as any)}
                style={{
                  padding: '12px 16px',
                  border: 'none',
                  background: activeTab === item.key ? 'rgba(255,165,0,0.2)' : 'transparent',
                  borderLeft: activeTab === item.key ? '3px solid var(--color-primary)' : '3px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: '0 8px 8px 0',
                  color: activeTab === item.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button className="btn-secondary w-full" onClick={onLogout} style={{ marginTop: '25px', justifyContent: 'center' }}>
            Đăng xuất
          </button>
        </div>

        <div className="profile-content">
          {activeTab === 'profile' && (
            <div className="tab-content card-glass fade-in">
              <h2 style={{ marginBottom: '25px' }}>Hồ sơ cá nhân</h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '25px' }}>
                <div className="profile-info-item">
                  <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Họ tên</span>
                  <p style={{ marginTop: '8px', fontSize: '1.05rem' }}>{user.name}</p>
                </div>
                <div className="profile-info-item">
                  <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Email</span>
                  <p style={{ marginTop: '8px', fontSize: '1.05rem' }}>{user.email}</p>
                </div>
                <div className="profile-info-item">
                  <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Điểm tích lũy (Loyalty Points)</span>
                  <p style={{ marginTop: '8px', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{user.loyaltyPoints || 0} pts</p>
                </div>
                <div className="profile-info-item">
                  <span className="text-secondary" style={{ fontSize: '0.85rem' }}>ID người dùng</span>
                  <p style={{ marginTop: '8px', fontSize: '0.9rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>{user.id}</p>
                </div>
                <div className="profile-info-item">
                  <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Vai trò</span>
                  <p style={{ marginTop: '8px', fontSize: '1.05rem' }}>{roleLabel}</p>
                </div>
              </div>

              <div className="profile-info-card card-glass" style={{ backgroundColor: 'rgba(0,150,255,0.1)', border: '1px solid var(--color-accent)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ marginBottom: '12px' }}>Thông tin</h3>
                <p className="text-secondary">
                  Để cập nhật tên, ảnh đại diện hoặc thông tin cá nhân khác, vui lòng liên hệ quản trị viên trong bản demo này.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="tab-content card-glass fade-in">
              <h2 style={{ marginBottom: '10px' }}>Lịch sử tham dự sự kiện</h2>
              <p className="text-secondary" style={{ marginBottom: '25px' }}>
                Theo dõi toàn bộ sự kiện bạn đã đăng ký cùng trạng thái check-in và check-out.
              </p>

              <div className="admin-metrics-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))', marginBottom: '25px' }}>
                <div className="metric-card card-glass">
                  <span className="metric-lbl text-secondary">Đã đăng ký</span>
                  <h2 className="metric-val">{attendanceHistory.length}</h2>
                </div>
                <div className="metric-card card-glass">
                  <span className="metric-lbl text-secondary">Đã check-in</span>
                  <h2 className="metric-val">{attendedCount}</h2>
                </div>
                <div className="metric-card card-glass">
                  <span className="metric-lbl text-secondary">Đã check-out</span>
                  <h2 className="metric-val">{completedCount}</h2>
                </div>
              </div>

              {attendanceLoading ? (
                <div>Đang tải lịch sử tham dự...</div>
              ) : attendanceHistory.length === 0 ? (
                <div className="empty-state text-center" style={{ padding: '35px' }}>
                  <h3>Bạn chưa có lịch sử tham dự</h3>
                  <p className="text-secondary" style={{ marginTop: '8px' }}>
                    Khi bạn đăng ký và check-in sự kiện, lịch sử sẽ xuất hiện tại đây.
                  </p>
                </div>
              ) : (
                <div className="attendance-history-list" style={{ display: 'grid', gap: '14px' }}>
                  {attendanceHistory.map((registration) => {
                    const event = registration.event;
                    const statusLabel = registration.checkedOut
                      ? 'Đã check-out'
                      : registration.checkedIn
                        ? 'Đã check-in'
                        : 'Đã đăng ký';
                    const statusColor = registration.checkedOut
                      ? 'var(--color-success)'
                      : registration.checkedIn
                        ? 'var(--color-primary)'
                        : 'var(--color-accent)';

                    return (
                      <div key={registration.registrationId || `${registration.eventId}-${registration.ticketCode}`} className="card-glass" style={{ padding: '18px', display: 'grid', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: '16px', alignItems: 'center' }}>
                          <div style={{ width: '96px', height: '68px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
                            {event?.imageUrl && (
                              <img src={event.imageUrl} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </div>
                          <div>
                            <span className="card-date-sub">{event?.date ? new Date(event.date).toLocaleString('vi-VN') : 'Chưa có thời gian'}</span>
                            <h3 style={{ margin: '4px 0' }}>{event?.title || registration.eventId}</h3>
                            <p className="text-secondary" style={{ margin: 0 }}>{event?.location || 'Chưa có địa điểm'}</p>
                          </div>
                          <span className="status-pill" style={{ color: statusColor, borderColor: statusColor, background: 'rgba(255,255,255,0.04)' }}>
                            {statusLabel}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                          <div>
                            <span className="field-lbl">Mã vé</span>
                            <span className="field-val">{registration.ticketCode || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="field-lbl">Đăng ký lúc</span>
                            <span className="field-val">{registration.registeredAt ? new Date(registration.registeredAt).toLocaleString('vi-VN') : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="field-lbl">Check-in</span>
                            <span className="field-val">{registration.checkedInAt ? new Date(registration.checkedInAt).toLocaleString('vi-VN') : 'Chưa check-in'}</span>
                          </div>
                          <div>
                            <span className="field-lbl">Check-out</span>
                            <span className="field-val">{registration.checkedOutAt ? new Date(registration.checkedOutAt).toLocaleString('vi-VN') : 'Chưa check-out'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="tab-content card-glass fade-in">
              <h2 style={{ marginBottom: '25px' }}>Bảo mật tài khoản</h2>

              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>Mật khẩu</h3>
                  <button className="btn-secondary" onClick={() => setShowPasswordForm(!showPasswordForm)} style={{ padding: '8px 16px', minHeight: '38px' }}>
                    {showPasswordForm ? 'Hủy bỏ' : 'Thay đổi'}
                  </button>
                </div>

                {!showPasswordForm && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    <p style={{ margin: 0 }}>Mật khẩu đang được bảo vệ.</p>
                    <p className="text-secondary" style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                      Lần cập nhật gần nhất: 3 tháng trước
                    </p>
                  </div>
                )}

                {showPasswordForm && (
                  <form onSubmit={handlePasswordChange} style={{ marginTop: '15px' }}>
                    {passwordError && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{passwordError}</div>}
                    {passwordSuccess && <div className="alert alert-success" style={{ marginBottom: '15px' }}>{passwordSuccess}</div>}

                    <div className="form-group">
                      <label>Mật khẩu hiện tại</label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>Mật khẩu mới</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Ít nhất 8 ký tự"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>Xác nhận mật khẩu mới</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                        {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setShowPasswordForm(false)} style={{ flex: 1, justifyContent: 'center' }}>
                        Hủy bỏ
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: '30px' }} />

              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px' }}>Xác thực hai lớp</h3>
                <div style={{ backgroundColor: 'rgba(200,120,255,0.1)', border: '1px solid rgba(200,120,255,0.3)', padding: '15px', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ marginBottom: '12px' }}>Bảo vệ tài khoản bằng một lớp xác thực bổ sung. Tính năng này đang ở chế độ demo.</p>
                  <button className="btn-secondary" style={{ padding: '8px 16px', minHeight: '38px' }}>
                    Bật xác thực hai lớp
                  </button>
                </div>
              </div>

              <div>
                <h3 style={{ marginBottom: '15px' }}>Phiên hoạt động</h3>
                <div className="session-item card-glass" style={{ padding: '15px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: '500' }}>Windows hiện tại</p>
                      <span className="text-secondary" style={{ fontSize: '0.85rem' }}>127.0.0.1 - Chrome - hôm nay</span>
                    </div>
                    <span style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>Đang hoạt động</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="tab-content card-glass fade-in">
              <h2 style={{ marginBottom: '25px' }}>Lịch sử thanh toán</h2>
              {paymentsLoading ? (
                <div>Đang tải thông tin giao dịch...</div>
              ) : payments.length === 0 ? (
                <div className="text-secondary">Chưa có giao dịch thanh toán nào được thực hiện.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '12px' }}>Mã giao dịch</th>
                        <th style={{ padding: '12px' }}>Số tiền</th>
                        <th style={{ padding: '12px' }}>Cổng thanh toán</th>
                        <th style={{ padding: '12px' }}>Trạng thái</th>
                        <th style={{ padding: '12px' }}>Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.paymentId || p.transactionId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.transactionId || p.paymentId}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{Number(p.amount).toLocaleString('vi-VN')} {p.currency || 'VND'}</td>
                          <td style={{ padding: '12px' }}>{p.provider || 'MOCK'}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              backgroundColor: p.state === 'SUCCESS' ? 'rgba(40,167,69,0.2)' : 'rgba(255,193,7,0.2)',
                              color: p.state === 'SUCCESS' ? '#28a745' : '#ffc107'
                            }}>
                              {p.state === 'SUCCESS' ? 'Thành công' : p.state}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '0.85rem' }}>{p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="tab-content card-glass fade-in">
              <h2 style={{ marginBottom: '25px' }}>Thông báo ({notifications.length})</h2>
              {notificationsLoading ? (
                <div>Đang tải danh sách thông báo...</div>
              ) : notifications.length === 0 ? (
                <div className="text-secondary">Bạn không có thông báo mới nào.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notifications.map((n) => (
                    <div key={n.notificationId || n.SK} className="card-glass" style={{ padding: '15px', position: 'relative' }}>
                      <h4 style={{ margin: '0 0 5px 0', color: 'var(--color-primary)' }}>{n.title}</h4>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>{n.message}</p>
                      <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : 'Vừa xong'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="tab-content card-glass fade-in">
              <h2 style={{ marginBottom: '25px' }}>Tùy chọn tài khoản</h2>

              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '20px' }}>Tùy chọn thông báo</h3>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  <span>Nhận email khi có sự kiện mới phù hợp với sở thích của tôi</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  <span>Nhận nhắc lịch trước khi sự kiện đã đăng ký bắt đầu</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  <span>Nhận bản tin sự kiện hằng tuần</span>
                </label>
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: '30px' }} />

              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '20px' }}>Cài đặt riêng tư</h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                  <span>Hiển thị hồ sơ công khai</span>
                  <input type="checkbox" style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                  <span>Cho phép người khác xem lịch sự kiện của tôi</span>
                  <input type="checkbox" style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                </div>
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: '30px' }} />

              <div>
                <h3 style={{ marginBottom: '15px', color: 'var(--color-error)' }}>Vùng nguy hiểm</h3>
                <div style={{ backgroundColor: 'rgba(255,80,80,0.1)', border: '2px solid var(--color-error)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ marginBottom: '8px', color: 'var(--color-error)' }}>Xóa tài khoản</h4>
                  <p className="text-secondary" style={{ marginBottom: '15px', fontSize: '0.95rem' }}>
                    Xóa tài khoản và toàn bộ dữ liệu liên quan. Hành động này không thể hoàn tác.
                  </p>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{ padding: '10px 20px', minHeight: '38px', backgroundColor: 'var(--color-error)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)' }}
                  >
                    Xóa tài khoản vĩnh viễn
                  </button>
                </div>

                {showDeleteConfirm && (
                  <div style={{ marginTop: '15px', padding: '15px', backgroundColor: 'rgba(255,80,80,0.15)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ marginBottom: '15px', color: 'var(--color-error)' }}>Bạn chắc chắn muốn xóa tài khoản này không?</p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="btn-secondary" onClick={handleDeleteAccount} disabled={loading} style={{ padding: '10px 20px', backgroundColor: 'var(--color-error)', color: 'white', border: 'none' }}>
                        {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
                      </button>
                      <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={loading} style={{ padding: '10px 20px' }}>
                        Hủy bỏ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
