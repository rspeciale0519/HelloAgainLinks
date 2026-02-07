'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 50,
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#0f1019',
              border: '1px solid rgba(0, 212, 255, 0.15)',
              borderRadius: '16px',
              padding: '32px',
              zIndex: 51,
              minWidth: '400px',
              maxWidth: '90vw',
              boxShadow: '0 0 60px rgba(0, 212, 255, 0.1)',
            }}
          >
            {title && (
              <h2
                style={{
                  color: '#f0f0f5',
                  fontSize: '20px',
                  fontWeight: 600,
                  marginBottom: '20px',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {title}
              </h2>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
