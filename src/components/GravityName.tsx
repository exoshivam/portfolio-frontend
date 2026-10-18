import { useEffect, useRef, useState } from 'react';

// A headline made of sand grains (inspired by React Bits Pro "Gravity Letters").
// Click: every grain bursts out from the click point and falls. Drag across it: the cut grains fall.
// Loose sand falls to the bottom of the screen, piles up, rests, then pours back into the letters.
// The resting letters live on a canvas inside the heading (so they scroll with the page); loose sand is
// drawn on a full-screen overlay that ignores the pointer and exists only while sand is loose.
// ponytail: grains fall one by one (no solid chunks that shatter); fine at name size.

const GRAIN = 2; // CSS px per grain
const GRAVITY = 0.45; // px per frame²
const CUT_WIDTH = 10;
const HOLD_MS = 2000; // sand rests on the floor this long (after the last grain lands or the last swipe)
const REBUILD_MS = 1000;
const SWEEP_MS = 500; // rebuild runs left to right over this long
const SAND = ['#f97316', '#fb923c', '#ec4899', '#f472b6'];

const HOME = 0, FALLING = 1, RESTING = 2, RETURNING = 3;

interface Grain {
  hx: number; hy: number; // home position inside the heading
  x: number; y: number; // screen position while loose
  vx: number; vy: number;
  state: number;
  fromX: number; fromY: number; start: number; // rebuild tween
}

export default function GravityName({ text, className = '' }: { text: string; className?: string }) {
  const wrapRef = useRef<HTMLHeadingElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (reduced || !wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let grains: Grain[] = [];
    let heights: number[] = []; // sand pile height per screen column, in grains
    let W = 0, textH = 0, dpr = 1;
    let raf = 0, lastActive = 0, lastLanded = 0, ink = '#fff';
    let down: { x: number; y: number; moved: boolean } | null = null;
    let overlay: HTMLCanvasElement | null = null;
    let octx: CanvasRenderingContext2D | null = null;

    const build = () => {
      const cs = getComputedStyle(wrap);
      ink = cs.color;
      let size = parseFloat(cs.fontSize) || 30;
      const font = (s: number) => `${cs.fontWeight} ${s}px ${cs.fontFamily}`;
      const off = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      if (!off) return;

      const parentW = wrap.parentElement?.clientWidth || window.innerWidth;
      const maxW = Math.max(100, Math.min(parentW, window.innerWidth - 32));

      off.font = font(size);
      let textW = off.measureText(text).width;
      if (textW > maxW) {
        size *= maxW / textW; // shrink to fit narrow screens
        off.font = font(size);
        textW = off.measureText(text).width;
      }

      W = Math.ceil(textW + 4);
      textH = Math.ceil(size * 1.25);
      wrap.style.width = `${W}px`;
      wrap.style.height = `${textH}px`;

      off.canvas.width = W;
      off.canvas.height = textH;
      off.font = font(size);
      off.textBaseline = 'middle';
      off.textAlign = 'left';
      off.fillText(text, 2, textH / 2);
      const data = off.getImageData(0, 0, W, textH).data;

      grains = [];
      for (let y = 0; y < textH; y += GRAIN)
        for (let x = 0; x < W; x += GRAIN)
          if (data[(y * W + x) * 4 + 3] > 120) grains.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, state: HOME, fromX: 0, fromY: 0, start: 0 });

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = textH * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${textH}px`;
      drawHome();
    };

    const drawHome = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, textH);
      ctx.fillStyle = ink;
      for (const g of grains) if (g.state === HOME) ctx.fillRect(g.hx, g.hy, GRAIN, GRAIN);
    };

    // The full-screen layer for loose sand, created when sand first comes loose.
    const openOverlay = () => {
      if (overlay) return;
      overlay = document.createElement('canvas');
      overlay.setAttribute('aria-hidden', 'true');
      Object.assign(overlay.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '45' });
      overlay.width = innerWidth * dpr;
      overlay.height = innerHeight * dpr;
      document.body.appendChild(overlay);
      octx = overlay.getContext('2d');
      heights = new Array(Math.ceil(innerWidth / GRAIN) + 1).fill(0);
    };
    const closeOverlay = () => {
      overlay?.remove();
      overlay = octx = null;
    };

    const drawLoose = () => {
      if (!octx) return;
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = 0; i < grains.length; i++) {
        const g = grains[i];
        if (g.state === HOME) continue;
        octx.fillStyle = SAND[i % SAND.length];
        octx.fillRect(g.x, g.y, GRAIN, GRAIN);
      }
    };

    const column = (x: number) => Math.max(0, Math.min(heights.length - 1, Math.round(x / GRAIN)));
    const land = (g: Grain) => {
      let col = column(g.x);
      // Sand slides off a pile that is higher than its neighbours.
      for (const n of [col - 1, col + 1])
        if (n >= 0 && n < heights.length && heights[n] < heights[col] - 1) col = n;
      g.x = col * GRAIN;
      g.y = innerHeight - (heights[col] + 1) * GRAIN;
      heights[col]++;
      g.state = RESTING;
      lastLanded = performance.now();
    };

    const tick = (now: number) => {
      const origin = wrap.getBoundingClientRect(); // home grains move with the page while sand is loose
      let homeChanged = false, loose = false, falling = false, returning = false;
      for (const g of grains) {
        if (g.state === FALLING) {
          falling = true;
          g.vy += GRAVITY;
          g.vx *= 0.99;
          g.x += g.vx;
          g.y += g.vy;
          if (g.x < 0 || g.x > innerWidth - GRAIN) { g.x = Math.max(0, Math.min(innerWidth - GRAIN, g.x)); g.vx *= -0.4; }
          if (g.vy > 0 && g.y >= innerHeight - (heights[column(g.x)] + 1) * GRAIN) land(g);
        } else if (g.state === RETURNING) {
          returning = true;
          const t = Math.min(1, Math.max(0, (now - g.start) / REBUILD_MS));
          const e = 1 - (1 - t) ** 3;
          g.x = g.fromX + (origin.left + g.hx - g.fromX) * e;
          g.y = g.fromY + (origin.top + g.hy - g.fromY) * e;
          if (t === 1) { g.state = HOME; homeChanged = true; }
        }
        if (g.state === RESTING) loose = true;
      }
      // Once everything has settled and the visitor stopped, pour the sand back, left to right.
      if (loose && !falling && !down && now - Math.max(lastActive, lastLanded) > HOLD_MS) {
        for (const g of grains)
          if (g.state === RESTING) {
            g.state = RETURNING;
            g.fromX = g.x;
            g.fromY = g.y;
            g.start = now + (g.hx / W) * SWEEP_MS;
          }
        heights.fill(0);
        returning = true;
      }
      if (homeChanged) drawHome();
      if (falling || loose || returning) {
        drawLoose();
        raf = requestAnimationFrame(tick);
      } else {
        closeOverlay();
        raf = 0;
      }
    };
    const run = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const knock = (g: Grain, vx: number, vy: number, origin: DOMRect) => {
      g.state = FALLING;
      g.x = origin.left + g.hx;
      g.y = origin.top + g.hy;
      g.vx = vx;
      g.vy = vy;
    };

    const point = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = (e: PointerEvent) => {
      e.preventDefault(); // a drag cuts the name; it must not select the text around it
      down = { ...point(e), moved: false };
      lastActive = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const p = point(e);
      const dx = p.x - down.x, dy = p.y - down.y;
      const len = Math.hypot(dx, dy);
      if (len < 3) return;
      const origin = wrap.getBoundingClientRect();
      let cut = false;
      // Cut every home grain near the segment from the last point to this one.
      for (const g of grains) {
        if (g.state !== HOME) continue;
        const t = Math.max(0, Math.min(1, ((g.hx - down.x) * dx + (g.hy - down.y) * dy) / (len * len)));
        if (Math.hypot(g.hx - (down.x + t * dx), g.hy - (down.y + t * dy)) < CUT_WIDTH) {
          if (!cut) openOverlay();
          cut = true;
          knock(g, dx * 0.25 + (Math.random() - 0.5) * 2, dy * 0.25 - Math.random() * 2, origin);
        }
      }
      down = { ...p, moved: true };
      lastActive = performance.now();
      if (cut) {
        drawHome();
        run();
      }
    };
    const onUp = () => {
      // Click destroy removed; only breaks when swiped/dragged across
      down = null;
      lastActive = performance.now();
      if (overlay) run();
    };

    wrap.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    let lastObservedParentW = wrap.parentElement?.clientWidth || 0;
    const ro = new ResizeObserver(() => {
      const curParentW = wrap.parentElement?.clientWidth || window.innerWidth;
      if (!overlay && Math.abs(curParentW - lastObservedParentW) > 5) {
        lastObservedParentW = curParentW;
        build();
      }
    });
    // Theme switch changes the text colour.
    const mo = new MutationObserver(() => {
      ink = getComputedStyle(wrap).color;
      drawHome();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    document.fonts.ready.then(() => {
      build();
      if (wrap.parentElement) ro.observe(wrap.parentElement);
      else ro.observe(wrap);
    });

    return () => {
      cancelAnimationFrame(raf);
      closeOverlay();
      wrap.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      ro.disconnect();
      mo.disconnect();
    };
  }, [text, reduced]);

  if (reduced) return <h2 className={`inline-block w-fit ${className}`}>{text}</h2>;
  return (
    <h2 ref={wrapRef} className={`relative inline-block w-fit select-none cursor-grab active:cursor-grabbing touch-pan-y ${className}`} title="Swipe across to slice">
      <span className="sr-only">{text}</span>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute left-0 top-0 pointer-events-none" />
    </h2>
  );
}
