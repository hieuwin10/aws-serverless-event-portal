import React from 'react';

export interface CategoryOption {
  value: string;
  label: string;
}

interface CategoryPillsProps {
  categories: CategoryOption[];
  selectedCategory: string;
  onSelect: (value: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({ categories, selectedCategory, onSelect }) => (
  <div className="category-pills">
    {categories.map((category) => (
      <button
        key={category.value}
        className={`pill-item ${selectedCategory === category.value ? 'active' : ''}`}
        onClick={() => onSelect(category.value)}
      >
        {category.label}
      </button>
    ))}
  </div>
);
