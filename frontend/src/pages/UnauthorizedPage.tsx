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
            Truy Cập Bị Từ Chối
          </h1>
          
          <p className="error-subtitle text-secondary" style={{ fontSize: '1.1rem', marginBottom: '30px' }}>
            Bạn không có quyền truy cập trang này. Vui lòng kiểm tra lại tài khoản của mình hoặc liên hệ với quản trị viên.
          </p>

          <div className="error-details card-glass" style={{ 
            backgroundColor: 'rgba(255, 80, 80, 0.1)', 
            border: '1px solid var(--color-error)',
            padding: '20px', 
            borderRadius: 'var(--radius-md)',
            marginBottom: '30px',
            textAlign: 'left'
          }}>
            <h3 style={{ marginBottom: '12px', color: 'var(--color-error)' }}>Nguyên Nhân Có Thể:</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '8px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0' }}>✗</span>
                Bạn đã đăng xuất hoặc phiên làm việc đã hết hạn
              </li>
              <li style={{ marginBottom: '8px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0' }}>✗</span>
                Tài khoản của bạn không có quyền truy cập trang Admin
              </li>
              <li style={{ marginBottom: '8px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0' }}>✗</span>
                Bạn cố gắng truy cập URL không đúng
              </li>
            </ul>
          </div>

          <div className="error-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a 
              href="/" 
              className="btn-primary" 
              style={{ 
                display: 'inline-block', 
                padding: '12px 28px', 
                textDecoration: 'none',
                minHeight: '44px',
                lineHeight: '1.5'
              }}
            >
              ← Trang Chủ
            </a>
            <button 
              className="btn-secondary" 
              onClick={() => window.history.back()}
              style={{ 
                padding: '12px 28px',
                minHeight: '44px',
                cursor: 'pointer'
              }}
            >
              ← Quay Lại
            </button>
          </div>

          <p className="error-footer text-secondary" style={{ marginTop: '25px', fontSize: '0.85rem' }}>
            Nếu bạn cho rằng đây là lỗi, vui lòng <strong>liên hệ quản trị viên</strong>.
          </p>
        </div>

        {/* Decoration */}
        <div className="error-decoration" style={{
          position: 'fixed',
          top: '50%',
          left: '-100px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(255, 80, 80, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: '-1'
        }}></div>
      </div>
    </div>
  );
};
