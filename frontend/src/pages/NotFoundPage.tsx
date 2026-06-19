import React from 'react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="page-not-found fade-in">
      <div className="not-found-container">
        <div className="not-found-card card-glass text-center">
          <div className="error-code" style={{ fontSize: '5rem', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '15px' }}>
            404
          </div>
          
          <h1 className="error-title" style={{ fontSize: '2rem', marginBottom: '10px' }}>
            Không Tìm Thấy Trang
          </h1>
          
          <p className="error-subtitle text-secondary" style={{ fontSize: '1.1rem', marginBottom: '30px' }}>
            Rất tiếc, trang mà bạn tìm kiếm không tồn tại. URL có thể bị sai hoặc trang đã bị xóa.
          </p>

          <div className="error-visual" style={{
            fontSize: '3.5rem',
            marginBottom: '30px',
            animation: 'float 3s ease-in-out infinite'
          }}>
            🔍
          </div>

          <div className="error-details card-glass" style={{ 
            backgroundColor: 'rgba(0, 150, 255, 0.1)', 
            border: '1px solid var(--color-accent)',
            padding: '20px', 
            borderRadius: 'var(--radius-md)',
            marginBottom: '30px',
            textAlign: 'left'
          }}>
            <h3 style={{ marginBottom: '12px', color: 'var(--color-accent)' }}>Bạn Có Thể Thử:</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '8px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0' }}>→</span>
                Quay lại trang chủ để duyệt danh sách sự kiện
              </li>
              <li style={{ marginBottom: '8px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0' }}>→</span>
                Kiểm tra lại URL trong thanh địa chỉ
              </li>
              <li style={{ marginBottom: '8px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0' }}>→</span>
                Sử dụng tính năng tìm kiếm để tìm sự kiện mà bạn cần
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
            Mã lỗi: <code style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>404 Not Found</code>
          </p>
        </div>

        {/* Decoration */}
        <div className="error-decoration" style={{
          position: 'fixed',
          bottom: '-100px',
          right: '-100px',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(0, 150, 255, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: '-1'
        }}></div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
        `}</style>
      </div>
    </div>
  );
};
