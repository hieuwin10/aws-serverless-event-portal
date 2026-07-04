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
            Không tìm thấy trang
          </h1>

          <p className="error-subtitle text-secondary" style={{ fontSize: '1.1rem', marginBottom: '30px' }}>
            Trang bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc đường dẫn chưa chính xác.
          </p>

          <div
            className="error-details card-glass"
            style={{
              backgroundColor: 'rgba(0, 150, 255, 0.1)',
              border: '1px solid var(--color-accent)',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '30px',
              textAlign: 'left'
            }}
          >
            <h3 style={{ marginBottom: '12px', color: 'var(--color-accent)' }}>Bạn có thể thử</h3>
            <ul style={{ listStyle: 'disc', paddingLeft: '22px', margin: 0 }}>
              <li style={{ marginBottom: '8px' }}>Quay lại trang chủ để xem danh sách sự kiện.</li>
              <li style={{ marginBottom: '8px' }}>Kiểm tra lại URL trên thanh địa chỉ.</li>
              <li>Sử dụng ô tìm kiếm để tìm sự kiện bạn cần.</li>
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
            Mã lỗi: <code style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>404 Not Found</code>
          </p>
        </div>
      </div>
    </div>
  );
};
