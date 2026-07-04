import React, { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EventProvider, useEvents } from './context/EventContext';
import type { Event, Registration } from './context/EventContext';
import { CalendarExportButton } from './components/CalendarExportButton';
import { CategoryPills } from './components/CategoryPills';
import { EventCard } from './components/EventCard';
import { EventRecommendations } from './components/EventRecommendations';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Modal } from './components/Modal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ReviewRating } from './components/ReviewRating';
import { SearchInput } from './components/SearchInput';
import { TicketCard } from './components/TicketCard';
import { MemberListPage } from './pages/MemberListPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { QRCheckInPage } from './pages/QRCheckInPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { WaitlistPage } from './pages/WaitlistPage';
import './App.css';

type PageName =
  | 'home'
  | 'detail'
  | 'login'
  | 'admin'
  | 'my-events'
  | 'waitlist'
  | 'profile'
  | 'check-in'
  | 'members'
  | 'unauthorized'
  | 'not-found';

const categories = [
  { value: '', label: 'Tất cả' },
  { value: 'technology', label: 'Công nghệ (AWS)' },
  { value: 'music', label: 'Âm nhạc' },
  { value: 'education', label: 'Giáo dục' },
];

const AppContent: React.FC = () => {
  const { user, login, register, confirmOTP, logout } = useAuth();
  const {
    events,
    registrations,
    loading: eventsLoading,
    fetchEvents,
    getEventById,
    registerForEvent,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();

  const [currentPage, setCurrentPage] = useState<PageName>('home');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedAdminEventId, setSelectedAdminEventId] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [regTicket, setRegTicket] = useState<Registration | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'otp'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminModalMode, setAdminModalMode] = useState<'add' | 'edit'>('add');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('technology');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formTotalSeats, setFormTotalSeats] = useState(100);

  const selectedAdminEvent = useMemo(
    () => events.find((event) => event.id === selectedAdminEventId) || null,
    [events, selectedAdminEventId],
  );

  const heroStats = useMemo(() => {
    const totalRegistrations = events.reduce((sum, event) => sum + event.registeredCount, 0);
    const totalSeats = events.reduce((sum, event) => sum + event.totalSeats, 0);
    const fillRate = totalSeats > 0 ? Math.round((totalRegistrations / totalSeats) * 100) : 0;

    return {
      totalEvents: events.length,
      totalRegistrations,
      fillRate
    };
  }, [events]);

  useEffect(() => {
    fetchEvents(selectedCategory, searchQuery);
  }, [selectedCategory]);

  useEffect(() => {
    if (currentPage === 'detail' && selectedEventId && user) {
      setRegTicket(registrations.find((registration) => registration.eventId === selectedEventId) || null);
    }
  }, [currentPage, registrations, selectedEventId, user]);

  const goHome = () => {
    setCurrentPage('home');
    fetchEvents(selectedCategory, searchQuery);
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    fetchEvents(selectedCategory, searchQuery);
  };

  const viewEventDetails = async (id: string) => {
    setDetailLoading(true);
    setSelectedEventId(id);
    setCurrentPage('detail');
    const nextEvent = await getEventById(id);
    setDetailEvent(nextEvent);
    setRegTicket(user ? registrations.find((registration) => registration.eventId === id) || null : null);
    setDetailLoading(false);
  };

  const handleRegisterEvent = async (eventId: string) => {
    if (!user) {
      setAuthEmail('');
      setAuthPassword('');
      setAuthMode('login');
      setAuthError('Vui lòng đăng nhập để đăng ký sự kiện.');
      setCurrentPage('login');
      return;
    }

    try {
      const registration = await registerForEvent(eventId);
      setRegTicket(registration);
      setDetailEvent(await getEventById(eventId));
    } catch (error: any) {
      alert(error.message || 'Đăng ký thất bại.');
    }
  };

  const handleJoinWaitlist = async (email: string) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    alert(`Bạn đã được thêm vào danh sách chờ với email: ${email}`);
    setCurrentPage('detail');
  };

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (authMode === 'login') {
        await login(authEmail, authPassword);
        setCurrentPage(authEmail.trim().toLowerCase() === 'admin@eventapp.com' ? 'admin' : 'home');
        return;
      }

      if (authMode === 'register') {
        if (!authEmail || !authPassword || !authName) {
          throw new Error('Vui lòng nhập đầy đủ họ tên, email và mật khẩu.');
        }
        await register(authEmail, authPassword, authName);
        setAuthSuccess('Mã xác minh OTP đã được gửi. Vui lòng kiểm tra email của bạn.');
        setAuthMode('otp');
        return;
      }

      await confirmOTP(authEmail, otpCode);
      setAuthSuccess('Xác minh thành công. Bạn có thể đăng nhập.');
      setAuthMode('login');
      setOtpCode('');
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const openAddModal = () => {
    setAdminModalMode('add');
    setEditingEventId(null);
    setFormTitle('');
    setFormCategory('technology');
    setFormDescription('');
    setFormDate(new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 16));
    setFormLocation('');
    setFormImageUrl('');
    setFormTotalSeats(100);
    setShowAdminModal(true);
  };

  const openEditModal = (event: Event) => {
    setAdminModalMode('edit');
    setEditingEventId(event.id);
    setFormTitle(event.title);
    setFormCategory(event.category);
    setFormDescription(event.description);
    setFormDate(new Date(event.date).toISOString().slice(0, 16));
    setFormLocation(event.location);
    setFormImageUrl(event.imageUrl);
    setFormTotalSeats(event.totalSeats);
    setShowAdminModal(true);
  };

  const handleSaveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      title: formTitle,
      category: formCategory,
      description: formDescription,
      date: new Date(formDate).toISOString(),
      location: formLocation,
      imageUrl: formImageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      totalSeats: Number(formTotalSeats),
    };

    try {
      if (adminModalMode === 'add') {
        await createEvent(payload);
      } else if (editingEventId) {
        await updateEvent(editingEventId, payload);
      }
      setShowAdminModal(false);
      fetchEvents(selectedCategory, searchQuery);
    } catch (error: any) {
      alert(error.message || 'Lưu sự kiện thất bại.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) return;
    try {
      await deleteEvent(id);
      fetchEvents(selectedCategory, searchQuery);
    } catch (error: any) {
      alert(error.message || 'Xóa sự kiện thất bại.');
    }
  };

  const openMemberList = (event: Event) => {
    setSelectedAdminEventId(event.id);
    setCurrentPage('members');
  };

  return (
    <div className="app-container">
      <div className="bg-stars"></div>
      <div className="bg-glowing-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      <header className="main-header header-glass">
        <div className="header-logo" onClick={goHome}>
          <span className="logo-aws">AWS</span>
          <span className="logo-title">EventPortal</span>
        </div>

        <nav className="header-nav">
          <span className={`nav-item ${currentPage === 'home' ? 'active' : ''}`} onClick={goHome}>
            Sự kiện
          </span>
          {user && (
            <span className={`nav-item ${currentPage === 'my-events' ? 'active' : ''}`} onClick={() => setCurrentPage('my-events')}>
              Vé của tôi ({registrations.length})
            </span>
          )}
          {user?.role === 'Admin' && (
            <>
              <span className={`nav-item ${currentPage === 'admin' ? 'active' : ''}`} onClick={() => setCurrentPage('admin')}>
                Quản trị
              </span>
              <span className={`nav-item ${currentPage === 'check-in' ? 'active' : ''}`} onClick={() => setCurrentPage('check-in')}>
                Check-in
              </span>
            </>
          )}
        </nav>

        <div className="header-profile">
          {user ? (
            <div className="profile-active">
              <div className="profile-info">
                <span className="profile-name">{user.name}</span>
                <span className="profile-badge">{user.role === 'Admin' ? 'Quản trị' : 'Người dùng'}</span>
              </div>
              <button className="btn-secondary compact-button" onClick={() => setCurrentPage('profile')}>Hồ sơ</button>
              <button className="btn-secondary compact-button" onClick={() => { logout(); setCurrentPage('home'); }}>Đăng xuất</button>
            </div>
          ) : (
            <button className="btn-primary compact-button" onClick={() => { setAuthMode('login'); setAuthError(null); setAuthSuccess(null); setCurrentPage('login'); }}>
              Đăng nhập
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        {currentPage === 'home' && (
          <div className="page-home fade-in">
            <section className="hero-section">
              <h1 className="hero-headline">Khám phá & đăng ký sự kiện <span className="gradient-text">AWS Serverless</span></h1>
              <p className="hero-subtitle">Cổng quản lý sự kiện, đăng ký vé, danh sách chờ và check-in cho cộng đồng AWS.</p>
              <div className="hero-stat-row">
                <div className="hero-stat-card">
                  <strong>{heroStats.totalEvents}</strong>
                  <span>Sự kiện</span>
                </div>
                <div className="hero-stat-card">
                  <strong>{heroStats.totalRegistrations}</strong>
                  <span>Đăng ký</span>
                </div>
                <div className="hero-stat-card">
                  <strong>{heroStats.fillRate}%</strong>
                  <span>Lấp đầy</span>
                </div>
              </div>
              <SearchInput value={searchQuery} onChange={setSearchQuery} onSubmit={handleSearch} />
              <CategoryPills categories={categories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
            </section>

            <section className="events-grid-section">
              {eventsLoading ? (
                <LoadingSpinner label="Đang tải danh sách sự kiện..." />
              ) : events.length === 0 ? (
                <div className="empty-state text-center card-glass" style={{ padding: '60px' }}>
                  <h3>Không tìm thấy sự kiện nào</h3>
                  <p className="text-secondary" style={{ marginTop: '8px' }}>Thử danh mục khác hoặc từ khóa mới.</p>
                </div>
              ) : (
                <div className="events-grid">
                  {events.map((event) => <EventCard key={event.id} event={event} onOpen={viewEventDetails} />)}
                </div>
              )}
            </section>

            <EventRecommendations events={events} onOpen={viewEventDetails} />
          </div>
        )}

        {currentPage === 'detail' && (
          <div className="page-detail fade-in">
            <button className="btn-secondary" style={{ marginBottom: '25px' }} onClick={goHome}>Quay lại danh sách</button>

            {detailLoading || !detailEvent ? (
              <LoadingSpinner label="Đang tải chi tiết sự kiện..." />
            ) : (
              <>
                <div className="detail-layout">
                  <div className="detail-info card-glass">
                    <div className="detail-img-cover">
                      <img src={detailEvent.imageUrl} alt={detailEvent.title} />
                      <span className="card-category-tag" style={{ top: '20px', left: '20px' }}>{detailEvent.category.toUpperCase()}</span>
                    </div>
                    <div className="detail-body-content">
                      <h1 className="detail-headline">{detailEvent.title}</h1>
                      <div className="detail-meta-row">
                        <span>{new Date(detailEvent.date).toLocaleString('vi-VN')}</span>
                        <span>{detailEvent.location}</span>
                      </div>
                      <h3 className="section-sub-title" style={{ marginTop: '25px' }}>Mô tả sự kiện</h3>
                      <p className="detail-description text-secondary">{detailEvent.description}</p>
                      <CalendarExportButton event={detailEvent} />
                      <div className="detail-seat-status" style={{ marginTop: '30px' }}>
                        <div className="gauge-text-wrapper">
                          <h3>Trạng thái đặt vé</h3>
                          <span className="gauge-nums">{detailEvent.registeredCount} / {detailEvent.totalSeats} ghế</span>
                        </div>
                        <div className="gauge-bar-bg" style={{ height: '12px', marginTop: '10px' }}>
                          <div
                            className="gauge-bar-fill bg-primary"
                            style={{ width: `${Math.min(100, (detailEvent.registeredCount / detailEvent.totalSeats) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-booking-sidebar">
                    {regTicket ? (
                      <TicketCard event={detailEvent} registration={regTicket} />
                    ) : (
                      <div className="booking-card card-glass text-center" style={{ padding: '30px' }}>
                        <h3>Đăng ký tham gia</h3>
                        <p className="text-secondary" style={{ margin: '8px 0 25px' }}>Nhận vé điện tử miễn phí cho sự kiện này.</p>
                        {detailEvent.registeredCount >= detailEvent.totalSeats ? (
                          <button className="btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setCurrentPage('waitlist')}>
                            Tham gia danh sách chờ
                          </button>
                        ) : (
                          <button className="btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => handleRegisterEvent(detailEvent.id)}>
                            Đăng ký vé
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <ReviewRating eventId={detailEvent.id} userName={user?.name} />
                <EventRecommendations events={events} currentEvent={detailEvent} onOpen={viewEventDetails} />
              </>
            )}
          </div>
        )}

        {currentPage === 'my-events' && (
          <ProtectedRoute>
            <div className="page-my-events fade-in">
              <h1 className="section-title">Vé đã đăng ký của tôi ({registrations.length})</h1>
              {registrations.length === 0 ? (
                <div className="empty-state text-center card-glass" style={{ padding: '80px 40px' }}>
                  <h3>Bạn chưa đăng ký sự kiện nào</h3>
                  <button className="btn-primary" style={{ marginTop: '20px' }} onClick={goHome}>Khám phá sự kiện</button>
                </div>
              ) : (
                <div className="registrations-list">
                  {registrations.map((registration) => registration.event && (
                    <div key={registration.registrationId} className="reg-item-glass card-glass">
                      <div className="reg-event-thumbnail">
                        <img src={registration.event.imageUrl} alt={registration.event.title} />
                      </div>
                      <div className="reg-event-details">
                        <span className="card-date-sub">{new Date(registration.event.date).toLocaleString('vi-VN')}</span>
                        <h3 className="reg-title" style={{ margin: '5px 0' }}>{registration.event.title}</h3>
                        <p className="text-secondary">{registration.event.location}</p>
                      </div>
                      <div className="reg-ticket-info">
                        <span className="field-lbl">Mã vé</span>
                        <span className="ticket-code-highlight">{registration.ticketCode}</span>
                        <button className="btn-secondary" style={{ marginTop: '10px' }} onClick={() => viewEventDetails(registration.event!.id)}>
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ProtectedRoute>
        )}

        {currentPage === 'login' && (
          <div className="page-auth fade-in">
            <div className="auth-card card-glass">
              <h2 className="auth-card-title text-center">
                {authMode === 'login' ? 'Đăng nhập EventPortal' : authMode === 'register' ? 'Tạo tài khoản' : 'Nhập OTP xác minh'}
              </h2>
              <p className="auth-card-subtitle text-center text-secondary">
                {authMode === 'otp' ? `Mã OTP mock đã gửi về ${authEmail}.` : 'Đăng nhập để quản lý và đăng ký vé sự kiện.'}
              </p>

              {authError && <div className="alert alert-error">{authError}</div>}
              {authSuccess && <div className="alert alert-success">{authSuccess}</div>}

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                {authMode === 'register' && (
                  <div className="form-group">
                    <label>Họ tên</label>
                    <input value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Nguyễn Văn A" />
                  </div>
                )}

                {authMode !== 'otp' ? (
                  <>
                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>Email</label>
                      <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required />
                      <span className="hint-label">Tài khoản admin demo: <code>admin@eventapp.com</code></span>
                    </div>
                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>Mật khẩu</label>
                      <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required />
                      <span className="hint-label">Mật khẩu admin: <code>AdminPass123!</code></span>
                    </div>
                  </>
                ) : (
                  <div className="form-group">
                    <label>Nhập Mã OTP (6 số)</label>
                    <input 
                      type="text" 
                      placeholder="123456" 
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      maxLength={6}
                      required
                    />
                    <span className="hint-label">Mã OTP có 6 chữ số</span>
                  </div>
                )}

                <button type="submit" className="btn-primary w-full" style={{ justifyContent: 'center', marginTop: '25px' }}>
                  {authMode === 'login' ? 'Đăng nhập' : authMode === 'register' ? 'Tạo tài khoản' : 'Xác minh OTP'}
                </button>
              </form>

              <div className="auth-card-footer text-center" style={{ marginTop: '20px' }}>
                {authMode === 'login' ? (
                  <p>Chưa có tài khoản? <span className="auth-toggle-link" onClick={() => setAuthMode('register')}>Đăng ký ngay</span></p>
                ) : (
                  <p>Đã có tài khoản? <span className="auth-toggle-link" onClick={() => setAuthMode('login')}>Đăng nhập</span></p>
                )}
              </div>
            </div>
          </div>
        )}

        {currentPage === 'admin' && (
          <ProtectedRoute requireAdmin>
            <div className="page-admin fade-in">
              <div className="admin-header-row">
                <div>
                  <h1 className="section-title">Bảng điều khiển quản trị</h1>
                  <p className="text-secondary">Quản lý sự kiện, danh sách thành viên và check-in.</p>
                </div>
                <div className="admin-action-row">
                  <button className="btn-secondary" onClick={() => setCurrentPage('check-in')}>Mở QR Check-in</button>
                  <button className="btn-primary" onClick={openAddModal}>Thêm sự kiện mới</button>
                </div>
              </div>

              <div className="admin-metrics-grid">
                <div className="metric-card card-glass">
                  <span className="metric-lbl text-secondary">Tổng sự kiện</span>
                  <h2 className="metric-val">{events.length}</h2>
                </div>
                <div className="metric-card card-glass">
                  <span className="metric-lbl text-secondary">Tổng đặt vé</span>
                  <h2 className="metric-val">{events.reduce((sum, event) => sum + event.registeredCount, 0)}</h2>
                </div>
                <div className="metric-card card-glass">
                  <span className="metric-lbl text-secondary">Tỉ lệ lấp đầy TB</span>
                  <h2 className="metric-val">
                    {events.length > 0
                      ? `${Math.round((events.reduce((sum, event) => sum + event.registeredCount, 0) / events.reduce((sum, event) => sum + event.totalSeats, 0)) * 100)}%`
                      : '0%'}
                  </h2>
                </div>
              </div>

              <div className="admin-table-container card-glass" style={{ overflowX: 'auto', padding: '20px' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ảnh</th>
                      <th>Tiêu đề</th>
                      <th>Danh mục</th>
                      <th>Thời gian</th>
                      <th>Địa điểm</th>
                      <th>Vé đặt</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td><img src={event.imageUrl} alt="" className="table-thumb" /></td>
                        <td style={{ fontWeight: 'bold' }}>{event.title}</td>
                        <td>{event.category}</td>
                        <td>{new Date(event.date).toLocaleDateString('vi-VN')}</td>
                        <td>{event.location}</td>
                        <td><strong>{event.registeredCount}</strong> / {event.totalSeats}</td>
                        <td>
                          <div className="table-actions">
                            <button className="btn-secondary table-button" onClick={() => openMemberList(event)}>Thành viên</button>
                            <button className="btn-secondary table-button" onClick={() => openEditModal(event)}>Sửa</button>
                            <button className="btn-secondary table-button text-error" onClick={() => handleDeleteEvent(event.id)}>Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {showAdminModal && (
                <Modal
                  title={adminModalMode === 'add' ? 'Thêm sự kiện mới' : 'Chỉnh sửa sự kiện'}
                  onClose={() => setShowAdminModal(false)}
                >
                  <form onSubmit={handleSaveEvent} className="modal-form">
                    <div className="form-group">
                      <label>Tiêu đề sự kiện *</label>
                      <input value={formTitle} onChange={(event) => setFormTitle(event.target.value)} required />
                    </div>
                    <div className="form-row" style={{ marginTop: '15px' }}>
                      <div className="form-group">
                        <label>Danh mục</label>
                        <select value={formCategory} onChange={(event) => setFormCategory(event.target.value)}>
                          <option value="technology">Công nghệ (AWS)</option>
                          <option value="music">Âm nhạc</option>
                          <option value="education">Giáo dục</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Tổng số ghế *</label>
                        <input type="number" min={1} value={formTotalSeats} onChange={(event) => setFormTotalSeats(Number(event.target.value))} required />
                      </div>
                    </div>
                    <div className="form-row" style={{ marginTop: '15px' }}>
                      <div className="form-group">
                        <label>Thời gian *</label>
                        <input type="datetime-local" value={formDate} onChange={(event) => setFormDate(event.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Địa điểm *</label>
                        <input value={formLocation} onChange={(event) => setFormLocation(event.target.value)} required />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>URL ảnh bìa</label>
                      <input value={formImageUrl} onChange={(event) => setFormImageUrl(event.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>Mô tả</label>
                      <textarea value={formDescription} onChange={(event) => setFormDescription(event.target.value)} rows={4}></textarea>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn-secondary" onClick={() => setShowAdminModal(false)}>Hủy</button>
                      <button type="submit" className="btn-primary">{adminModalMode === 'add' ? 'Tạo sự kiện' : 'Lưu thay đổi'}</button>
                    </div>
                  </form>
                </Modal>
              )}
            </div>
          </ProtectedRoute>
        )}

        {currentPage === 'waitlist' && detailEvent && (
          <WaitlistPage event={detailEvent} onBack={() => setCurrentPage('detail')} onJoinWaitlist={handleJoinWaitlist} />
        )}

        {currentPage === 'profile' && (
          <ProtectedRoute>
            <UserProfilePage onBack={goHome} onLogout={() => { logout(); setCurrentPage('home'); }} />
          </ProtectedRoute>
        )}

        {currentPage === 'check-in' && (
          <ProtectedRoute requireAdmin>
            <QRCheckInPage events={events} registrations={registrations} onBack={() => setCurrentPage('admin')} />
          </ProtectedRoute>
        )}

        {currentPage === 'members' && (
          <ProtectedRoute requireAdmin>
            <MemberListPage event={selectedAdminEvent} registrations={registrations} onBack={() => setCurrentPage('admin')} />
          </ProtectedRoute>
        )}

        {currentPage === 'unauthorized' && <UnauthorizedPage />}
        {currentPage === 'not-found' && <NotFoundPage />}
      </main>

      <footer className="main-footer footer-glass text-center">
        <p className="text-secondary">(c) 2026 AWS EventPortal.</p>
        <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
          Vận hành với S3, CloudFront, API Gateway, Lambda và DynamoDB
        </p>
      </footer>
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <EventProvider>
      <AppContent />
    </EventProvider>
  </AuthProvider>
);

export default App;
