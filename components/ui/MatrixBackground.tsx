"use client";

import React from 'react';

type Props = {
  className?: string;
  opacity?: number; // 0..1 visual opacity of the canvas
  fps?: number; // target frames per second
};

// Lightweight, dependency-free Matrix "rain" background tuned for dark UIs.
// Renders behind content; respects prefers-reduced-motion.
export default function MatrixBackground({ className = '', opacity = 0.22, fps = 32 }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const stopRef = React.useRef(false);
  const lastRef = React.useRef(0);
  const dprRef = React.useRef(1);

  React.useEffect(() => {
    const prefersReduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduce) return; // Respect user preference

    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const chars = '010'; // mix of glyphs
    let width = 0;
    let height = 0;
    let fontSize = 14; // base logical size; scaled by dpr
    let columns: number[] = [];

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      dprRef.current = dpr;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fontSize = Math.max(12, Math.round(width / 120)); // responsive density
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      columns = new Array(Math.ceil(width / fontSize)).fill(0).map(() => Math.floor(Math.random() * -80));
    }

    function step(ts: number) {
      if (stopRef.current) return;
      const frameInterval = 1000 / Math.max(12, Math.min(60, fps));
      if (ts - lastRef.current < frameInterval) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      lastRef.current = ts;

      // Fade the canvas slightly to create trails
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0.06, 0.12 * dprRef.current)})`;
      ctx.fillRect(0, 0, width, height);

      // Neon "matrix" green
      ctx.fillStyle = 'rgba(100, 255, 180, 0.85)';

      for (let i = 0; i < columns.length; i++) {
        const x = i * fontSize;
        const y = columns[i] * fontSize;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, x, y);
        if (y > height && Math.random() > 0.975) columns[i] = 0;
        else columns[i]++;
      }
      rafRef.current = requestAnimationFrame(step);
    }

    const onResize = () => resize();
    resize();
    rafRef.current = requestAnimationFrame(step);
    window.addEventListener('resize', onResize);
    return () => {
      stopRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [fps]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`fixed inset-0 -z-10 pointer-events-none opacity-${Math.round(Math.min(1, Math.max(0, opacity)) * 100)} ${className}`}
    />
  );
}
