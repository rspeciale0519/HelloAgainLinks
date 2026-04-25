// packages/ui/hal/src/primitives/BackgroundLayers.tsx
// Renders the ambient canvas: dot grid + two drifting radial glows.
// Scanlines are intentionally omitted (spec section 3 "non-goals").

export function BackgroundLayers() {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundColor: 'var(--hal-bg-0)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.045) 1px, transparent 0)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse at 30% 0%, rgba(0,0,0,0.9), transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: '-20%', left: '-10%',
          width: 800, height: 800,
          background: 'radial-gradient(circle, var(--hal-a-dim), transparent 65%)',
          filter: 'blur(60px)',
          opacity: 0.4,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'hal-drift-1 28s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          bottom: '-30%', right: '-10%',
          width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(100, 80, 255, 0.07), transparent 65%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'hal-drift-2 32s ease-in-out infinite',
        }}
      />
    </>
  );
}
