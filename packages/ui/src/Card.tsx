'use client';
import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'rgba(15, 16, 25, 0.8)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 212, 255, 0.1)',
        padding: '24px',
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
