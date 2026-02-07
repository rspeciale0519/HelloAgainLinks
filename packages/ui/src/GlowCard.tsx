'use client';
import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

export interface GlowCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  glowColor?: string;
}

export function GlowCard({
  children,
  glowColor = 'rgba(0, 212, 255, 0.15)',
  style,
  ...props
}: GlowCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        boxShadow: `0 0 30px ${glowColor}, inset 0 0 30px rgba(0, 212, 255, 0.03)`,
        borderColor: 'rgba(0, 212, 255, 0.3)',
      }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'rgba(15, 16, 25, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 212, 255, 0.1)',
        padding: '24px',
        transition: 'all 0.3s ease',
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
