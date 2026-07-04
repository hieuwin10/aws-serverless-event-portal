import React from 'react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="page-unauthorized fade-in">
      <div className="unauthorized-container">
        <div className="unauthorized-card card-glass text-center">
          <div className="error-code" style={{ fontSize: '5rem', fontWeight: 'bold', color: 'var(--color-error)', marginBottom: '15px' }}>
            403
          </div>

          <h1 className="error-title" style={{ fontSize: '2rem', marginBottom: '10px' }}>
            Truy cập bị từ chối
          </h1>

          <p className="error-subtitle text-secondary" style={{ fontSize: '1.1rem', marginBottom: '30px' }}>
            Bạn không có quyền truy cập trang này. Vui lòng kiểm tra tài khoản hoặc liên hệ quản trị viên.
          </p>

          <div
            className="error-details card-glass"
            style={{
              backgroundColor: 'rgba(255, 80, 80, 0.1)',
              border: '1px solid var(--color-error)',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '30px',
              textAlign: 'left'
            }}
          >
            <h3 style={{ marginBottom: '12px', color: 'var(--color-error)' }}>Nguyên nhân có thể</h3>
            <ul style={{ listStyle: 'disc', paddingLeft: '22px', margin: 0 }}>
              <li style={{ marginBottom: '8px' }}>Bạn đã đăng xuất hoặc phiên làm việc đã hết hạn.</li>
              <li style={{ marginBottom: '8px' }}>Tài khoản của bạn không có quyền truy cập trang quản trị.</li>
              <li>Bạn đang truy cập một đường dẫn không hợp lệ.</li>
            </ul>
          </div>

          <div className="error-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/" className="btn-primary" style={{ display: 'inline-block', padding: '12px 28px', textDecoration: 'none' }}>
              Về trang chủ
            </a>
            <button className="btn-secondary" onClick={() => window.history.back()} style={{ padding: '12px 28px', cursor: 'pointer' }}>
              Quay lại
            </button>
          </div>

          <p className="error-footer text-secondary" style={{ marginTop: '25px', fontSize: '0.85rem' }}>
            Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ quản trị viên.
          </p>
        </div>
      </div>
    </div>
  );
};
