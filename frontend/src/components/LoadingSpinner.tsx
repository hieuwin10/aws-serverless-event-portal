import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = 'Đang tải dữ liệu...' }) => (
  <div className="loading-spinner">{label}</div>
);
