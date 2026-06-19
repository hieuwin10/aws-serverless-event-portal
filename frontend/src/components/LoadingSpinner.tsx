import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = 'Dang tai du lieu...' }) => (
  <div className="loading-spinner">{label}</div>
);
