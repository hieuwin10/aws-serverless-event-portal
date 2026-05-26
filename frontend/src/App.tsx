import React, { useMemo } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';

type Screen = {
  key: string;
  title: string;
  route: string;
  folder: string;
  group: 'Core' | 'Admin' | 'Operations' | 'Integrations';
};

const screens: Screen[] = [
  { key: 'home', title: 'Trang chủ', route: '/', folder: 'trang_ch_aetherevents', group: 'Core' },
  { key: 'auth', title: 'Đăng nhập / Đăng ký', route: '/auth', folder: 'ng_nh_p_ng_k_aetherevents', group: 'Core' },
  { key: 'events', title: 'Quản lý sự kiện', route: '/admin/events', folder: 'qu_n_l_s_ki_n_aetherevents', group: 'Admin' },
  { key: 'event-create', title: 'Thêm sự kiện mới', route: '/admin/events/new', folder: 'th_m_s_ki_n_m_i_aetherevents', group: 'Admin' },
  { key: 'event-detail', title: 'Chi tiết sự kiện', route: '/events/detail', folder: 'chi_ti_t_s_ki_n_aetherevents', group: 'Core' },
  { key: 'event-media', title: 'Điều chỉnh hình ảnh', route: '/admin/events/media', folder: 'i_u_ch_nh_h_nh_nh_s_ki_n_aetherevents', group: 'Admin' },
  { key: 'tickets', title: 'Thêm loại vé', route: '/admin/tickets/new', folder: 'th_m_lo_i_v_m_i_aetherevents', group: 'Admin' },
  { key: 'checkout', title: 'Thanh toán', route: '/checkout', folder: 'thanh_to_n_aetherevents', group: 'Core' },
  { key: 'registrations', title: 'Danh sách đăng ký', route: '/registrations', folder: 'danh_s_ch_ng_k_aetherevents', group: 'Operations' },
  { key: 'schedule', title: 'Lịch trình sự kiện', route: '/schedule', folder: 'l_ch_tr_nh_s_ki_n_aetherevents', group: 'Core' },
  { key: 'schedule-day', title: 'Lịch trình theo ngày', route: '/schedule/day', folder: 'l_ch_tr_nh_chi_ti_t_ng_y_aetherevents', group: 'Core' },
  { key: 'calendar', title: 'Kết nối lịch', route: '/integrations/calendar', folder: 'k_t_n_i_l_ch_aetherevents', group: 'Integrations' },
  { key: 'admin-dashboard', title: 'Dashboard Admin', route: '/admin/dashboard', folder: 'b_ng_i_u_khi_n_admin_aetherevents', group: 'Admin' },
  { key: 'admin-overview', title: 'Tổng quan quản trị', route: '/admin/overview', folder: 't_ng_quan_qu_n_tr_aetherevents', group: 'Admin' },
  { key: 'admin-users', title: 'Quản lý người dùng', route: '/admin/users', folder: 'qu_n_l_ng_i_d_ng_aetherevents', group: 'Admin' },
  { key: 'admin-members', title: 'Quản lý thành viên', route: '/admin/members', folder: 'qu_n_l_th_nh_vi_n_aetherevents', group: 'Admin' },
  { key: 'admin-roles', title: 'Vai trò & quyền hạn', route: '/admin/roles', folder: 'qu_n_l_vai_tr_quy_n_h_n_aetherevents', group: 'Admin' },
  { key: 'admin-speakers', title: 'Diễn giả & tài trợ', route: '/admin/speakers', folder: 'qu_n_l_di_n_gi_nh_t_i_tr_aetherevents', group: 'Admin' },
  { key: 'analytics-attendance', title: 'Thống kê người tham gia', route: '/analytics/attendance', folder: 'th_ng_k_ng_i_tham_gia_aetherevents', group: 'Operations' },
  { key: 'advanced-filter', title: 'Bộ lọc nâng cao', route: '/operations/filter', folder: 'b_l_c_n_ng_cao_aetherevents', group: 'Operations' },
  { key: 'advanced-config', title: 'Cấu hình nâng cao', route: '/operations/config', folder: 'c_u_h_nh_v_n_ng_cao_aetherevents', group: 'Operations' },
  { key: 'audit-log', title: 'Nhật ký hệ thống', route: '/operations/logs', folder: 'nh_t_k_h_th_ng_aetherevents', group: 'Operations' },
  { key: 'history-v1', title: 'Lịch sử vé v1', route: '/history/v1', folder: 'l_ch_s_t_v_aetherevents_1', group: 'Operations' },
  { key: 'history-v2', title: 'Lịch sử vé v2', route: '/history/v2', folder: 'l_ch_s_t_v_aetherevents_2', group: 'Operations' },
  { key: 'space-theme', title: 'Aetheric Space Theme', route: '/theme/space', folder: 'aetheric_space', group: 'Integrations' },
  { key: 'bauhaus-theme', title: 'Bauhaus Theme', route: '/theme/bauhaus', folder: 'bauhaus', group: 'Integrations' },
];

const groupedScreens = ['Core', 'Admin', 'Operations', 'Integrations'] as const;

const AppLayout: React.FC = () => {
  const location = useLocation();

  const activeScreen = useMemo(
    () => screens.find((screen) => screen.route === location.pathname) ?? screens[0],
    [location.pathname],
  );

  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div className="brand">EventSphere Local UI</div>
        <p className="caption">26 màn hình đã map đầy đủ để chạy local.</p>
        {groupedScreens.map((group) => (
          <section key={group} className="menu-group">
            <h3>{group}</h3>
            {screens
              .filter((screen) => screen.group === group)
              .map((screen) => (
                <Link
                  key={screen.key}
                  to={screen.route}
                  className={`menu-link ${location.pathname === screen.route ? 'active' : ''}`}
                >
                  {screen.title}
                </Link>
              ))}
          </section>
        ))}
      </aside>

      <main className="content">
        <header className="content-header">
          <div>
            <h1>{activeScreen.title}</h1>
            <p>{activeScreen.route}</p>
          </div>
        </header>
        <iframe
          className="screen-frame"
          src={`/stitch_eventsphere_space_portal/${activeScreen.folder}/code.html`}
          title={activeScreen.title}
        />
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {screens.map((screen) => (
        <Route key={screen.key} path={screen.route} element={<AppLayout />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
