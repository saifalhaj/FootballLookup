"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "./motion";
import s from "./viz.module.css";

interface Particle {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  alpha: number;
}

/** Floodlight dust: tiny amber motes drifting up through the beams.
    The rAF loop only runs while the canvas is actually on screen. */
export default function Dust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const flood =
      getComputedStyle(canvas).getPropertyValue("--floodlight").trim() || "#ffb000";

    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    const resize = () => {
      // read per-resize so zoom / monitor changes pick up the current DPR
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // re-scatter particles stranded below a shrunken canvas (hero → compact)
      for (const p of particles) if (p.y > h + 4) p.y = Math.random() * h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawn = (anywhere = false): Particle => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 4,
      r: 0.6 + Math.random() * 1.1,
      speed: 0.1 + Math.random() * 0.28,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.05 + Math.random() * 0.13,
    });
    particles = Array.from({ length: 44 }, () => spawn(true));

    let raf = 0;
    let running = false;
    let t = 0;
    const tick = () => {
      t += 1 / 60;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = flood;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        p.y -= p.speed;
        p.x += Math.sin(t * 0.7 + p.phase) * 0.15;
        if (p.y < -4) particles[i] = spawn();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    // Battery guard: don't burn frames while the hero is scrolled away.
    const io = new IntersectionObserver(([e]) => (e?.isIntersecting ? start() : stop()));
    io.observe(canvas);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
    };
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvasRef} className={s.dust} aria-hidden />;
}
