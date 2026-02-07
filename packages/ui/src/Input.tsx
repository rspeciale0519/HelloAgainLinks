'use client';
import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ color: '#8a8a9a', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
          {label}
        </label>
      )}
      <input
        style={{
          background: 'rgba(15, 16, 25, 0.8)',
          border: '1px solid rgba(0, 212, 255, 0.15)',
          borderRadius: '10px',
          padding: '10px 16px',
          color: '#f0f0f5',
          fontSize: '14px',
          fontFamily: "'Inter', sans-serif",
          outline: 'none',
          transition: 'all 0.2s ease',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)';
          e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.15)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      />
    </div>
  );
}
