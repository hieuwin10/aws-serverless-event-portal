import React, { useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

// Full-screen page renderer for the 26 stitch_eventsphere_space_portal pages
const PageRenderer: React.FC<{ folder: string }> = ({ folder }) => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Helper to add toast messages inside parent window
  const showRouteNotification = (text: string, path: string) => {
    // Check if toast container exists, if not create one
    let container = document.getElementById('cosmic-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cosmic-toast-container';
      container.setAttribute('style', 'position: fixed; top: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 10px;');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.setAttribute('style', `
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(255, 153, 0, 0.5);
      color: #ffc082;
      padding: 14px 28px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6), 0 0 20px rgba(255, 153, 0, 0.25);
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 0.92rem;
      font-weight: 600;
      backdrop-filter: blur(12px);
      max-width: 380px;
      transition: all 0.3s ease-out;
      transform: translateX(120%);
      opacity: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    `);

    toast.innerHTML = `🪐 <span>Phát hiện click <strong>"${text}"</strong> -> Chuyển tuyến tới <code>${path}</code></span>`;
    container.appendChild(toast);

    // Trigger animate-in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 50);

    // Animate out and remove
    setTimeout(() => {
      toast.style.transform = 'translateX(120%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 350);
    }, 4000);
  };

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Scan all possible elements acting as buttons or links inside the loaded template
      const clickables = iframeDoc.querySelectorAll('a, button, [role="button"], .table-actions button, td button');
      clickables.forEach(node => {
        const el = node as HTMLElement;
        
        // Clone element to wipe any pre-existing listeners
        const elClone = el.cloneNode(true) as HTMLElement;
        el.parentNode?.replaceChild(elClone, el);

        elClone.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();

          const text = elClone.textContent?.trim() || '';
          const targetText = text.toLowerCase();

          // Standard click-to-route transitions matching our routing table:
          if (targetText.includes('đăng ký ngay') || targetText.includes('đăng ký vé') || targetText.includes('book ticket') || targetText.includes('chọn mua')) {
            showRouteNotification(text || 'Đăng ký ngay', '/checkout');
            navigate('/checkout');
          } 
          else if (targetText.includes('xác nhận thanh toán') || targetText.includes('thanh toán') || targetText.includes('confirm payment')) {
            showRouteNotification(text || 'Xác nhận thanh toán', '/history/v2');
            navigate('/history/v2');
          }
          else if (targetText.includes('xem chi tiết') || targetText.includes('chi tiết') || targetText.includes('view detail')) {
            showRouteNotification(text || 'Xem chi tiết', '/event-detail');
            navigate('/event-detail');
          }
          else if (targetText.includes('command center') || targetText.includes('dashboard') || targetText.includes('bảng điều khiển') || targetText.includes('overview') || targetText.includes('tổng quan')) {
            showRouteNotification(text || 'Command Center', '/admin');
            navigate('/admin');
          }
          else if (targetText.includes('sự kiện') || targetText.includes('events') || targetText.includes('quản lý sự kiện')) {
            if (targetText.includes('thêm') || targetText.includes('create') || targetText.includes('tạo')) {
              showRouteNotification(text, '/admin/events/new');
              navigate('/admin/events/new');
            } else {
              showRouteNotification(text, '/admin/events');
              navigate('/admin/events');
            }
          }
          else if (targetText.includes('thêm loại vé') || targetText.includes('tạo vé') || targetText.includes('tickets')) {
            showRouteNotification(text, '/admin/tickets/new');
            navigate('/admin/tickets/new');
          }
          else if (targetText.includes('lọc') || targetText.includes('filter')) {
            showRouteNotification(text || 'Lọc', '/filter');
            navigate('/filter');
          }
          else if (targetText.includes('diễn giả') || targetText.includes('nhà tài trợ') || targetText.includes('speakers')) {
            showRouteNotification(text, '/admin/speakers');
            navigate('/admin/speakers');
          }
          else if (targetText.includes('người dùng') || targetText.includes('attendees') || targetText.includes('người tham gia')) {
            showRouteNotification(text, '/admin/users');
            navigate('/admin/users');
          }
          else if (targetText.includes('thành viên') || targetText.includes('crew') || targetText.includes('team')) {
            showRouteNotification(text, '/admin/team');
            navigate('/admin/team');
          }
          else if (targetText.includes('nhật ký') || targetText.includes('logs') || targetText.includes('audit')) {
            showRouteNotification(text, '/admin/logs');
            navigate('/admin/logs');
          }
          else if (targetText.includes('vai trò') || targetText.includes('permissions') || targetText.includes('phân quyền')) {
            showRouteNotification(text, '/admin/roles');
            navigate('/admin/roles');
          }
          else if (targetText.includes('kết nối lịch') || targetText.includes('đồng bộ lịch') || targetText.includes('sync')) {
            showRouteNotification(text, '/calendar');
            navigate('/calendar');
          }
          else if (targetText.includes('lịch trình') || targetText.includes('schedule') || targetText.includes('chương trình')) {
            if (targetText.includes('chi tiết') || targetText.includes('ngày')) {
              showRouteNotification(text, '/schedule/daily');
              navigate('/schedule/daily');
            } else {
              showRouteNotification(text, '/schedule');
              navigate('/schedule');
            }
          }
          else if (targetText.includes('thống kê') || targetText.includes('financials') || targetText.includes('doanh thu')) {
            showRouteNotification(text, '/admin/analytics/overview');
            navigate('/admin/analytics/overview');
          }
          else if (targetText.includes('cắt ảnh') || targetText.includes('điều chỉnh hình ảnh') || targetText.includes('media')) {
            showRouteNotification(text, '/admin/events/media');
            navigate('/admin/events/media');
          }
          else if (targetText.includes('không gian') || targetText.includes('aetheric') || targetText.includes('vũ trụ')) {
            showRouteNotification(text || 'Không gian', '/space');
            navigate('/space');
          }
          else if (targetText.includes('bauhaus') || targetText.includes('tối giản')) {
            showRouteNotification(text || 'Bauhaus', '/bauhaus');
            navigate('/bauhaus');
          }
          else if (targetText.includes('home') || targetText.includes('trang chủ') || targetText.includes('quay lại') || targetText.includes('hủy bỏ') || targetText.includes('back')) {
            showRouteNotification(text || 'Home', '/');
            navigate('/');
          }
          else if (targetText.includes('sign in') || targetText.includes('đăng nhập') || targetText.includes('tài khoản') || targetText.includes('login') || targetText.includes('register')) {
            showRouteNotification(text || 'Đăng nhập', '/auth');
            navigate('/auth');
          }
        });
      });
    } catch (e) {
      console.warn("Iframe origin isolation block or loading draft", e);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: '#0b0f19',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <iframe
        ref={iframeRef}
        src={`/stitch_eventsphere_space_portal/${folder}/code.html`}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          display: 'block',
          margin: 0,
          padding: 0
        }}
        title={folder}
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Core routes */}
        <Route path="/" element={<PageRenderer folder="trang_ch_aetherevents" />} />
        <Route path="/auth" element={<PageRenderer folder="ng_nh_p_ng_k_aetherevents" />} />
        <Route path="/login" element={<PageRenderer folder="ng_nh_p_ng_k_aetherevents" />} />
        <Route path="/event-detail" element={<PageRenderer folder="chi_ti_t_s_ki_n_aetherevents" />} />
        <Route path="/filter" element={<PageRenderer folder="b_l_c_n_ng_cao_aetherevents" />} />
        <Route path="/space" element={<PageRenderer folder="aetheric_space" />} />
        <Route path="/bauhaus" element={<PageRenderer folder="bauhaus" />} />

        {/* Admin Command Center routes */}
        <Route path="/admin" element={<PageRenderer folder="b_ng_i_u_khi_n_admin_aetherevents" />} />
        <Route path="/admin/events" element={<PageRenderer folder="qu_n_l_s_ki_n_aetherevents" />} />
        <Route path="/admin/events/new" element={<PageRenderer folder="th_m_s_ki_n_m_i_aetherevents" />} />
        <Route path="/admin/events/media" element={<PageRenderer folder="i_u_ch_nh_h_nh_nh_s_ki_n_aetherevents" />} />
        <Route path="/admin/users" element={<PageRenderer folder="qu_n_l_ng_i_d_ng_aetherevents" />} />
        <Route path="/admin/registrations" element={<PageRenderer folder="danh_s_ch_ng_k_aetherevents" />} />
        <Route path="/admin/roles" element={<PageRenderer folder="qu_n_l_vai_tr_quy_n_h_n_aetherevents" />} />
        <Route path="/admin/speakers" element={<PageRenderer folder="qu_n_l_di_n_gi_nh_t_i_tr_aetherevents" />} />
        <Route path="/admin/team" element={<PageRenderer folder="qu_n_l_th_nh_vi_n_aetherevents" />} />
        <Route path="/admin/tickets/new" element={<PageRenderer folder="th_m_lo_i_v_m_i_aetherevents" />} />
        <Route path="/admin/tickets/config" element={<PageRenderer folder="c_u_h_nh_v_n_ng_cao_aetherevents" />} />
        <Route path="/admin/analytics/attendees" element={<PageRenderer folder="th_ng_k_ng_i_tham_gia_aetherevents" />} />
        <Route path="/admin/analytics/overview" element={<PageRenderer folder="t_ng_quan_qu_n_tr_aetherevents" />} />
        <Route path="/admin/logs" element={<PageRenderer folder="nh_t_k_h_th_ng_aetherevents" />} />

        {/* Schedules */}
        <Route path="/schedule" element={<PageRenderer folder="l_ch_tr_nh_s_ki_n_aetherevents" />} />
        <Route path="/schedule/daily" element={<PageRenderer folder="l_ch_tr_nh_chi_ti_t_ng_y_aetherevents" />} />
        <Route path="/calendar" element={<PageRenderer folder="k_t_n_i_l_ch_aetherevents" />} />

        {/* Booking process and history */}
        <Route path="/checkout" element={<PageRenderer folder="thanh_to_n_aetherevents" />} />
        <Route path="/history/v1" element={<PageRenderer folder="l_ch_s_t_v_aetherevents_1" />} />
        <Route path="/history/v2" element={<PageRenderer folder="l_ch_s_t_v_aetherevents_2" />} />

        {/* Fallback to homepage */}
        <Route path="*" element={<PageRenderer folder="trang_ch_aetherevents" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
