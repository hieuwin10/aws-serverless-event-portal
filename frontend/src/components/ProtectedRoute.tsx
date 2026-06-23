import React from 'react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { user, loading } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="page-loading fade-in">
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p className="text-secondary" style={{ marginTop: '15px' }}>Đang kiểm tra phiên làm việc...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="page-unauthorized fade-in">
        <div className="unauthorized-card card-glass text-center">
          <span style={{ fontSize: '4rem' }}>🔐</span>
          <h1 style={{ marginTop: '20px', fontSize: '1.8rem' }}>Yêu Cầu Đăng Nhập</h1>
          <p className="text-secondary" style={{ margin: '15px 0 30px', fontSize: '1rem' }}>
            Bạn phải đăng nhập để truy cập trang này.
          </p>
          <a href="/" className="btn-primary" style={{ display: 'inline-block', padding: '12px 24px', textDecoration: 'none' }}>
            ← Quay Về Trang Chủ
          </a>
        </div>
      </div>
    );
  }

  // Authenticated but insufficient permissions
  if (requireAdmin && user.role !== 'Admin') {
    return (
      <div className="page-unauthorized fade-in">
        <div className="unauthorized-card card-glass text-center">
          <span style={{ fontSize: '4rem' }}>⛔</span>
          <h1 style={{ marginTop: '20px', fontSize: '1.8rem' }}>Không Có Quyền Truy Cập</h1>
          <p className="text-secondary" style={{ margin: '15px 0 10px', fontSize: '1rem' }}>
            Chỉ người dùng có vai trò <strong>Admin</strong> mới có thể truy cập trang này.
          </p>
          <p className="text-secondary" style={{ margin: '0 0 30px', fontSize: '0.9rem' }}>
            Vai trò của bạn: <strong>{user.role}</strong>
          </p>
          <a href="/" className="btn-primary" style={{ display: 'inline-block', padding: '12px 24px', textDecoration: 'none' }}>
            ← Quay Về Trang Chủ
          </a>
        </div>
      </div>
    );
  }

  // Authorized - render children
  return <>{children}</>;
};
