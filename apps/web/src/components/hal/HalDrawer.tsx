'use client';

import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface HalDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Mobile drawer wrapper with backdrop + slide-in animation. Renders the
 * provided children (Index sidebar) at the left edge.
 */
export function HalDrawer({ open, onClose, children }: HalDrawerProps) {
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: 'tween', duration: 0.25 }}
            style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 41, display: 'flex' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
