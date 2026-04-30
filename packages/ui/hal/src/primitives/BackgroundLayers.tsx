// packages/ui/hal/src/primitives/BackgroundLayers.tsx
// Renders the ambient canvas: dot grid + two drifting radial glows.
// Scanlines are intentionally omitted (spec section 3 "non-goals").
//
// Important: every layer here is `pointer-events: none` AND uses
// `z-index: -1` so it sits BEHIND all content in the parent stacking
// context. The page/layout owner is responsible for setting the page
// background color (e.g. `background: var(--hal-bg-0)` on the outer
// flex container). A fixed-position div with `z-index: 0` would cover
// any sibling content with `z-index: auto`, which is why we don't ship
// a solid background layer here.

export function BackgroundLayers() {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: -1,
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
          zIndex: -1,
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
          zIndex: -1,
          animation: 'hal-drift-2 32s ease-in-out infinite',
        }}
      />
    </>
  );
}
