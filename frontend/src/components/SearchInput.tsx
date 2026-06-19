import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, onSubmit }) => (
  <form className="search-form form-glass" onSubmit={onSubmit}>
    <div className="search-input-wrapper">
      <span className="search-icon">Search</span>
      <input
        type="text"
        placeholder="Tim kiem su kien theo ten hoac noi dung..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
    <button type="submit" className="btn-primary">Tim Kiem</button>
  </form>
);
