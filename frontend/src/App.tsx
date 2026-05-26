import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { useEvents, EventProvider } from './context/EventContext';
import type { Event, Registration } from './context/EventContext';
import './App.css';

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
    deleteEvent 
  } = useEvents();

  // Navigation state
  const [currentPage, setCurrentPage] = useState<'home' | 'detail' | 'login' | 'admin' | 'my-events'>('home');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Auth Page states
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'otp'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Admin Modal states
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

  // Load events initially
  useEffect(() => {
    fetchEvents(selectedCategory, searchQuery);
  }, [selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents(selectedCategory, searchQuery);
  };

  // Detail View Helper
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [regTicket, setRegTicket] = useState<Registration | null>(null);

  const viewEventDetails = async (id: string) => {
    setDetailLoading(true);
    setSelectedEventId(id);
    setCurrentPage('detail');
    const evt = await getEventById(id);
    setDetailEvent(evt);
    
    // Check if user already has a registration
    if (user && evt) {
      const match = registrations.find(r => r.eventId === id);
      setRegTicket(match || null);
    } else {
      setRegTicket(null);
    }
    setDetailLoading(false);
  };

  useEffect(() => {
    if (currentPage === 'detail' && selectedEventId && user) {
      const match = registrations.find(r => r.eventId === selectedEventId);
      setRegTicket(match || null);
    }
  }, [registrations, currentPage, selectedEventId, user]);

  // Handle Event Registration
  const handleRegisterEvent = async (eventId: string) => {
    if (!user) {
      setAuthEmail('');
      setAuthPassword('');
      setAuthError('Vui lòng đăng nhập để đăng ký sự kiện.');
      setAuthMode('login');
      setCurrentPage('login');
      return;
    }
    try {
      const reg = await registerForEvent(eventId);
      setRegTicket(reg);
      // Refresh details to sync counts
      const updated = await getEventById(eventId);
      setDetailEvent(updated);
    } catch (err: any) {
      alert(err.message || 'Đăng ký thất bại.');
    }
  };

  // Handle Auth submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    try {
      if (authMode === 'login') {
        await login(authEmail, authPassword);
        // Successful login redirects
        if (authEmail.trim().toLowerCase() === 'admin@eventapp.com') {
          setCurrentPage('admin');
        } else {
          setCurrentPage('home');
        }
      } else if (authMode === 'register') {
        if (!authEmail || !authPassword || !authName) {
          throw new Error('Vui lòng nhập đầy đủ họ tên, email và mật khẩu.');
        }
        await register(authEmail, authPassword, authName);
        setAuthSuccess('Mã xác minh OTP đã được gửi! (Gợi ý: Nhập mã mock 123456)');
        setAuthMode('otp');
      } else if (authMode === 'otp') {
        await confirmOTP(authEmail, otpCode);
        setAuthSuccess('Xác minh thành công! Bây giờ bạn có thể đăng nhập.');
        setAuthMode('login');
        setOtpCode('');
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // Open Add modal
  const openAddModal = () => {
    setAdminModalMode('add');
    setEditingEventId(null);
    setFormTitle('');
    setFormCategory('technology');
    setFormDescription('');
    setFormDate(new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 16)); // 10 days later
    setFormLocation('');
    setFormImageUrl('');
    setFormTotalSeats(100);
    setShowAdminModal(true);
  };

  // Open Edit modal
  const openEditModal = (evt: Event) => {
    setAdminModalMode('edit');
    setEditingEventId(evt.id);
    setFormTitle(evt.title);
    setFormCategory(evt.category);
    setFormDescription(evt.description);
    setFormDate(new Date(evt.date).toISOString().slice(0, 16));
    setFormLocation(evt.location);
    setFormImageUrl(evt.imageUrl);
    setFormTotalSeats(evt.totalSeats);
    setShowAdminModal(true);
  };

  // Save Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formTitle,
      category: formCategory,
      description: formDescription,
      date: new Date(formDate).toISOString(),
      location: formLocation,
      imageUrl: formImageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      totalSeats: Number(formTotalSeats)
    };

    try {
      if (adminModalMode === 'add') {
        await createEvent(payload);
      } else if (adminModalMode === 'edit' && editingEventId) {
        await updateEvent(editingEventId, payload);
      }
      setShowAdminModal(false);
      fetchEvents(selectedCategory, searchQuery);
    } catch (err: any) {
      alert(err.message || 'Lưu sự kiện thất bại.');
    }
  };

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sự kiện này cùng toàn bộ người đăng ký tham gia không?')) {
      try {
        await deleteEvent(id);
        fetchEvents(selectedCategory, searchQuery);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="app-container">
      {/* Cosmic background particles overlay */}
      <div className="bg-stars"></div>
      <div className="bg-glowing-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* Header Area */}
      <header className="main-header header-glass">
        <div className="header-logo" onClick={() => { setCurrentPage('home'); fetchEvents(); }}>
          <span className="logo-aws">AWS</span>
          <span className="logo-title">EventPortal</span>
        </div>

        <nav className="header-nav">
          <span 
            className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => { setCurrentPage('home'); fetchEvents(); }}
          >
            Sự Kiện
          </span>
          {user && (
            <span 
              className={`nav-item ${currentPage === 'my-events' ? 'active' : ''}`}
              onClick={() => { setCurrentPage('my-events'); }}
            >
              Vé Của Tôi ({registrations.length})
            </span>
          )}
          {user && user.role === 'Admin' && (
            <span 
              className={`nav-item ${currentPage === 'admin' ? 'active' : ''}`}
              onClick={() => { setCurrentPage('admin'); }}
            >
              Quản Trị
            </span>
          )}
        </nav>

        <div className="header-profile">
          {user ? (
            <div className="profile-active">
              <div className="profile-info">
                <span className="profile-name">{user.name}</span>
                <span className="profile-badge">{user.role}</span>
              </div>
              <button className="btn-secondary" style={{ minHeight: '38px', padding: '5px 15px' }} onClick={logout}>
                Đăng Xuất
              </button>
            </div>
          ) : (
            <button className="btn-primary" style={{ minHeight: '38px', padding: '5px 18px' }} onClick={() => { setAuthError(null); setAuthSuccess(null); setAuthMode('login'); setCurrentPage('login'); }}>
              Đăng Nhập
            </button>
          )}
        </div>
      </header>

      {/* Main Pages Content */}
      <main className="main-content">
        
        {/* HOMEPAGE */}
        {currentPage === 'home' && (
          <div className="page-home fade-in">
            <section className="hero-section">
              <h1 className="hero-headline">Khám Phá & Đăng Ký Các Sự Kiện <span className="gradient-text">AWS Serverless</span> Cực Hot</h1>
              <p className="hero-subtitle">Hệ thống portal tối ưu chi phí, hiệu năng cao, hoàn toàn trong gói AWS Free Tier.</p>

              {/* Search input Form */}
              <form className="search-form form-glass" onSubmit={handleSearch}>
                <div className="search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm sự kiện theo tên hoặc nội dung..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary">Tìm Kiếm</button>
              </form>

              {/* Category Filter Pills */}
              <div className="category-pills">
                {[
                  { value: '', label: 'Tất Cả' },
                  { value: 'technology', label: 'Công Nghệ (AWS)' },
                  { value: 'music', label: 'Âm Nhạc' },
                  { value: 'education', label: 'Giáo Dục' }
                ].map(cat => (
                  <button 
                    key={cat.value} 
                    className={`pill-item ${selectedCategory === cat.value ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.value)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Events Grid */}
            <section className="events-grid-section">
              {eventsLoading ? (
                <div className="loading-spinner">Đang tải danh sách sự kiện...</div>
              ) : events.length === 0 ? (
                <div className="empty-state text-center card-glass" style={{ padding: '60px' }}>
                  <span style={{ fontSize: '3rem' }}>🎫</span>
                  <h3 style={{ marginTop: '15px' }}>Không tìm thấy sự kiện nào</h3>
                  <p className="text-secondary" style={{ marginTop: '8px' }}>Vui lòng thử danh mục khác hoặc nhập từ khóa tìm kiếm mới.</p>
                </div>
              ) : (
                <div className="events-grid">
                  {events.map(evt => {
                    const pct = Math.min(100, Math.round((evt.registeredCount / evt.totalSeats) * 100));
                    const isSoldOut = evt.registeredCount >= evt.totalSeats;
                    return (
                      <article key={evt.id} className="event-card card-glass" onClick={() => viewEventDetails(evt.id)}>
                        <div className="card-image-wrapper">
                          <img src={evt.imageUrl} alt={evt.title} className="card-image" />
                          <span className="card-category-tag">{evt.category.toUpperCase()}</span>
                        </div>
                        <div className="card-content">
                          <span className="card-date-sub">{new Date(evt.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <h3 className="card-title-main">{evt.title}</h3>
                          <p className="card-desc text-secondary">{evt.description.slice(0, 110)}...</p>
                          
                          <div className="card-footer-gauge">
                            <div className="gauge-text-wrapper">
                              <span className="text-secondary">Sức chứa</span>
                              <span className="gauge-nums">{evt.registeredCount} / {evt.totalSeats} ghế</span>
                            </div>
                            <div className="gauge-bar-bg">
                              <div 
                                className={`gauge-bar-fill ${isSoldOut ? 'bg-error' : pct > 85 ? 'bg-warn' : 'bg-primary'}`} 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                          <button className="btn-secondary w-full" style={{ justifyContent: 'center', marginTop: '15px' }}>
                            Xem Chi Tiết ➔
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* EVENT DETAILS & TICKET VIEW */}
        {currentPage === 'detail' && (
          <div className="page-detail fade-in">
            <button className="btn-secondary" style={{ marginBottom: '25px' }} onClick={() => setCurrentPage('home')}>
              ← Quay Lại Danh Sách
            </button>

            {detailLoading || !detailEvent ? (
              <div className="loading-spinner">Đang tải chi tiết sự kiện...</div>
            ) : (
              <div className="detail-layout">
                {/* Event info card */}
                <div className="detail-info card-glass">
                  <div className="detail-img-cover">
                    <img src={detailEvent.imageUrl} alt={detailEvent.title} />
                    <span className="card-category-tag" style={{ top: '20px', left: '20px' }}>{detailEvent.category.toUpperCase()}</span>
                  </div>
                  <div className="detail-body-content">
                    <h1 className="detail-headline">{detailEvent.title}</h1>
                    <div className="detail-meta-row">
                      <span className="meta-item">📅 {new Date(detailEvent.date).toLocaleString('vi-VN')}</span>
                      <span className="meta-item">📍 {detailEvent.location}</span>
                    </div>

                    <h3 className="section-sub-title" style={{ marginTop: '25px' }}>Mô Tả Sự Kiện</h3>
                    <p className="detail-description text-secondary">{detailEvent.description}</p>
                    
                    <div className="detail-seat-status" style={{ marginTop: '30px' }}>
                      <div className="gauge-text-wrapper">
                        <h3>Trạng thái đặt vé</h3>
                        <span className="gauge-nums" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{detailEvent.registeredCount} / {detailEvent.totalSeats} ghế đã đăng ký</span>
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

                {/* Booking status sidebar */}
                <div className="detail-booking-sidebar">
                  {regTicket ? (
                    <div className="ticket-premium-card fade-in">
                      <div className="ticket-border-dashed">
                        <div className="ticket-top-badge">AWS EVENT PASS</div>
                        <div className="ticket-qr-section">
                          {/* Simulated elegant QR code visual */}
                          <div className="mock-qr-code">
                            <div className="qr-corner qr-tl"></div>
                            <div className="qr-corner qr-tr"></div>
                            <div className="qr-corner qr-bl"></div>
                            <div className="qr-matrix"></div>
                          </div>
                        </div>
                        <div className="ticket-details-box">
                          <h4 style={{ color: 'var(--color-primary)', letterSpacing: '0.05em' }}>MÃ VÉ CỦA BẠN</h4>
                          <h2 style={{ fontSize: '1.4rem', margin: '4px 0 15px', color: 'var(--text-primary)' }}>{regTicket.ticketCode}</h2>
                          
                          <div className="ticket-meta-fields">
                            <div className="meta-field">
                              <span className="field-lbl">Sự kiện</span>
                              <span className="field-val">{detailEvent.title}</span>
                            </div>
                            <div className="meta-field" style={{ marginTop: '10px' }}>
                              <span className="field-lbl">Họ Tên / Email</span>
                              <span className="field-val">{regTicket.email}</span>
                            </div>
                            <div className="meta-field" style={{ marginTop: '10px' }}>
                              <span className="field-lbl">Thời gian đăng ký</span>
                              <span className="field-val">{new Date(regTicket.registeredAt).toLocaleString('vi-VN')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="ticket-footer-strip">Xác thực bằng Mock Cognito & DynamoDB</div>
                      </div>
                    </div>
                  ) : (
                    <div className="booking-card card-glass text-center" style={{ padding: '30px' }}>
                      <span style={{ fontSize: '3rem' }}>🎟️</span>
                      <h3 style={{ marginTop: '15px' }}>Đăng Ký Tham Gia</h3>
                      <p className="text-secondary" style={{ margin: '8px 0 25px' }}>Đăng ký ngay hôm nay để nhận vé điện tử Premium miễn phí hoàn toàn offline.</p>
                      
                      {detailEvent.registeredCount >= detailEvent.totalSeats ? (
                        <button className="btn-secondary w-full" disabled style={{ justifyContent: 'center', cursor: 'not-allowed', color: 'var(--color-error)' }}>
                          ❌ Đã Hết Vé Trống
                        </button>
                      ) : (
                        <button className="btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => handleRegisterEvent(detailEvent.id)}>
                          Đăng Ký Vé Một Chạm ➔
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MY REGISTERED EVENTS */}
        {currentPage === 'my-events' && (
          <div className="page-my-events fade-in">
            <h1 className="section-title">Vé Đã Đăng Ký Của Tôi ({registrations.length})</h1>
            <p className="text-secondary" style={{ marginBottom: '30px' }}>Toàn bộ danh sách vé điện tử được lưu trữ an toàn trong DynamoDB của bạn.</p>

            {registrations.length === 0 ? (
              <div className="empty-state text-center card-glass" style={{ padding: '80px 40px' }}>
                <span style={{ fontSize: '3.5rem' }}>🎟️</span>
                <h3 style={{ marginTop: '15px' }}>Bạn chưa đăng ký sự kiện nào</h3>
                <p className="text-secondary" style={{ margin: '8px 0 25px' }}>Trở về trang chủ và khám phá các hội thảo AWS Serverless hot nhất.</p>
                <button className="btn-primary" onClick={() => setCurrentPage('home')}>
                  Khám Phá Sự Kiện Ngay
                </button>
              </div>
            ) : (
              <div className="registrations-list">
                {registrations.map(reg => {
                  const eventMeta = reg.event;
                  if (!eventMeta) return null;
                  return (
                    <div key={reg.registrationId} className="reg-item-glass card-glass">
                      <div className="reg-event-thumbnail">
                        <img src={eventMeta.imageUrl} alt={eventMeta.title} />
                      </div>
                      <div className="reg-event-details">
                        <span className="card-date-sub">{new Date(eventMeta.date).toLocaleString('vi-VN')}</span>
                        <h3 className="reg-title" style={{ margin: '5px 0' }}>{eventMeta.title}</h3>
                        <p className="text-secondary">📍 {eventMeta.location}</p>
                      </div>
                      <div className="reg-ticket-info">
                        <span className="field-lbl">MÃ VÉ ĐIỆN TỬ</span>
                        <span className="ticket-code-highlight">{reg.ticketCode}</span>
                        <button className="btn-secondary" style={{ marginTop: '10px', minHeight: '34px', padding: '5px 12px' }} onClick={() => viewEventDetails(eventMeta.id)}>
                          Xem Chi Tiết Vé
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LOGIN / REGISTER / OTP FORMS */}
        {currentPage === 'login' && (
          <div className="page-auth fade-in">
            <div className="auth-card card-glass">
              <h2 className="auth-card-title text-center">
                {authMode === 'login' ? 'Đăng Nhập Portal' : authMode === 'register' ? 'Tạo Tài Khoản' : 'Nhập OTP Xác Xác Minh'}
              </h2>
              <p className="auth-card-subtitle text-center text-secondary">
                {authMode === 'login' ? 'Truy cập để quản lý và đăng ký vé tham gia AWS events.' : authMode === 'register' ? 'Tham gia cộng đồng Serverless ngay hôm nay.' : `Mã OTP giả lập đã được gửi về email ${authEmail}.`}
              </p>

              {authError && <div className="alert alert-error">{authError}</div>}
              {authSuccess && <div className="alert alert-success">{authSuccess}</div>}

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                {authMode === 'register' && (
                  <div className="form-group">
                    <label>Họ Tên Của Bạn</label>
                    <input 
                      type="text" 
                      placeholder="Nguyễn Văn A" 
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                )}

                {authMode !== 'otp' && (
                  <>
                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>Địa Chỉ Email</label>
                      <input 
                        type="email" 
                        placeholder="yourname@example.com" 
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                      />
                      <span className="hint-label">Tài khoản Admin Demo: <code>admin@eventapp.com</code></span>
                    </div>

                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>Mật Khẩu</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                      />
                      <span className="hint-label">Mật khẩu Admin: <code>AdminPass123!</code></span>
                    </div>
                  </>
                )}

                {authMode === 'otp' && (
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
                    <span className="hint-label">Mã OTP mặc định: <code>123456</code></span>
                  </div>
                )}

                <button type="submit" className="btn-primary w-full" style={{ justifyContent: 'center', marginTop: '25px' }}>
                  {authMode === 'login' ? 'Đăng Nhập ➔' : authMode === 'register' ? 'Tạo Tài Khoản ➔' : 'Xác Minh OTP ➔'}
                </button>
              </form>

              <div className="auth-card-footer text-center" style={{ marginTop: '20px' }}>
                {authMode === 'login' ? (
                  <p>Chưa có tài khoản? <span className="auth-toggle-link" onClick={() => { setAuthMode('register'); setAuthError(null); setAuthSuccess(null); }}>Đăng ký ngay</span></p>
                ) : (
                  <p>Đã có tài khoản? <span className="auth-toggle-link" onClick={() => { setAuthMode('login'); setAuthError(null); setAuthSuccess(null); }}>Đăng nhập</span></p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ADMIN DASHBOARD & CRUD VIEW */}
        {currentPage === 'admin' && user?.role === 'Admin' && (
          <div className="page-admin fade-in">
            <div className="admin-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 className="section-title">Bảng Điều Khiển Quản Trị (Admin Panel)</h1>
                <p className="text-secondary">Quản lý toàn bộ danh sách sự kiện và lượt đặt chỗ trên cơ sở dữ liệu DynamoDB.</p>
              </div>
              <button className="btn-primary" onClick={openAddModal}>
                ➕ Thêm Sự Kiện Mới
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="admin-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div className="metric-card card-glass" style={{ padding: '20px' }}>
                <span className="metric-lbl text-secondary">Tổng số sự kiện</span>
                <h2 className="metric-val" style={{ fontSize: '2.2rem', color: 'var(--color-primary)' }}>{events.length}</h2>
              </div>
              <div className="metric-card card-glass" style={{ padding: '20px' }}>
                <span className="metric-lbl text-secondary">Tổng số lượt đặt vé</span>
                <h2 className="metric-val" style={{ fontSize: '2.2rem', color: 'var(--color-accent)' }}>
                  {events.reduce((sum, e) => sum + e.registeredCount, 0)}
                </h2>
              </div>
              <div className="metric-card card-glass" style={{ padding: '20px' }}>
                <span className="metric-lbl text-secondary">Tỷ lệ lấp đầy trung bình</span>
                <h2 className="metric-val" style={{ fontSize: '2.2rem', color: 'var(--color-success)' }}>
                  {events.length > 0 
                    ? `${Math.round((events.reduce((sum, e) => sum + e.registeredCount, 0) / events.reduce((sum, e) => sum + e.totalSeats, 0)) * 100)}%`
                    : '0%'
                  }
                </h2>
              </div>
            </div>

            {/* Events list table */}
            <div className="admin-table-container card-glass" style={{ overflowX: 'auto', padding: '20px' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ảnh</th>
                    <th>Tiêu đề sự kiện</th>
                    <th>Danh mục</th>
                    <th>Thời gian diễn ra</th>
                    <th>Địa điểm</th>
                    <th>Số vé đặt</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(evt => (
                    <tr key={evt.id}>
                      <td>
                        <img src={evt.imageUrl} alt="" className="table-thumb" />
                      </td>
                      <td style={{ fontWeight: 'bold' }}>{evt.title}</td>
                      <td><span className="card-category-tag" style={{ position: 'relative', top: '0', left: '0' }}>{evt.category}</span></td>
                      <td>{new Date(evt.date).toLocaleDateString('vi-VN')}</td>
                      <td>{evt.location}</td>
                      <td>
                        <strong>{evt.registeredCount}</strong> / {evt.totalSeats}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-secondary" style={{ padding: '4px 10px', minHeight: '32px', fontSize: '0.85rem' }} onClick={() => openEditModal(evt)}>
                            Sửa
                          </button>
                          <button className="btn-secondary text-error" style={{ padding: '4px 10px', minHeight: '32px', fontSize: '0.85rem', marginLeft: '8px' }} onClick={() => handleDeleteEvent(evt.id)}>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CREATE / EDIT EVENT DYNAMIC MODAL */}
            {showAdminModal && (
              <div className="modal-backdrop fade-in">
                <div className="modal-content card-glass">
                  <div className="modal-header">
                    <h2>{adminModalMode === 'add' ? 'Thêm Sự Kiện Mới' : 'Chỉnh Sửa Sự Kiện'}</h2>
                    <span className="modal-close" onClick={() => setShowAdminModal(false)}>✕</span>
                  </div>
                  <form onSubmit={handleSaveEvent} className="modal-form">
                    <div className="form-group">
                      <label>Tiêu đề sự kiện *</label>
                      <input 
                        type="text" 
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Nhập tiêu đề sự kiện..." 
                        required
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Danh mục</label>
                        <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                          <option value="technology">Công Nghệ (AWS)</option>
                          <option value="music">Âm Nhạc</option>
                          <option value="education">Giáo Dục</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Tổng số ghế tối đa *</label>
                        <input 
                          type="number" 
                          value={formTotalSeats}
                          onChange={(e) => setFormTotalSeats(Number(e.target.value))}
                          min={1} 
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row" style={{ marginTop: '15px' }}>
                      <div className="form-group">
                        <label>Thời gian diễn ra *</label>
                        <input 
                          type="datetime-local" 
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Địa điểm tổ chức *</label>
                        <input 
                          type="text" 
                          value={formLocation}
                          onChange={(e) => setFormLocation(e.target.value)}
                          placeholder="Link Zoom, Zoom ID hoặc Địa chỉ..." 
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>URL ảnh bìa sự kiện (Unsplash, v.v.)</label>
                      <input 
                        type="text" 
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..." 
                      />
                    </div>

                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>Nội dung mô tả chi tiết sự kiện</label>
                      <textarea 
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Mô tả các nội dung, diễn giả, lộ trình chương trình..." 
                        rows={4}
                      ></textarea>
                    </div>

                    <div className="modal-footer">
                      <button type="button" className="btn-secondary" onClick={() => setShowAdminModal(false)}>
                        Hủy Bỏ
                      </button>
                      <button type="submit" className="btn-primary">
                        {adminModalMode === 'add' ? 'Tạo Sự Kiện Ngay' : 'Lưu Thay Đổi'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="main-footer footer-glass text-center">
        <p className="text-secondary">© 2026 AWS EventPortal Monorepo. Thiết kế theo tiêu chuẩn kỹ thuật HSL & BMAD-METHOD v6.</p>
        <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '4px' }}>Powered by Amazon S3 + CloudFront + API Gateway + AWS Lambda + DynamoDB</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <EventProvider>
        <AppContent />
      </EventProvider>
    </AuthProvider>
  );
};

export default App;
