'use client';
import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #00d4ff 0%, #0ea5e9 100%)',
    color: '#0a0a0f',
    border: 'none',
    fontWeight: 600,
  },
  secondary: {
    background: 'transparent',
    color: '#00d4ff',
    border: '1px solid rgba(0, 212, 255, 0.3)',
  },
  ghost: {
    background: 'transparent',
    color: '#f0f0f5',
    border: '1px solid transparent',
  },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: '13px' },
  md: { padding: '10px 20px', fontSize: '14px' },
  lg: { padding: '14px 28px', fontSize: '16px' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' }}
      whileTap={{ scale: 0.98 }}
      style={{
        borderRadius: '10px',
        cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
        letterSpacing: '0.02em',
        transition: 'all 0.2s ease',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
