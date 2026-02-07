'use client';
import React from 'react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function SearchBar({ value, onChange, placeholder = 'Search bookmarks...', style }: SearchBarProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        ...style,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4a4a5a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'rgba(15, 16, 25, 0.8)',
          border: '1px solid rgba(0, 212, 255, 0.1)',
          borderRadius: '12px',
          padding: '12px 16px 12px 44px',
          color: '#f0f0f5',
          fontSize: '14px',
          fontFamily: "'Inter', sans-serif",
          outline: 'none',
          transition: 'all 0.2s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.4)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.1)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}
