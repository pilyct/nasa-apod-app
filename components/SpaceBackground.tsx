"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number; // centered coords: 0 is the middle of the viewport
  y: number;
  z: number; // depth — MAX_DEPTH is "far away", near 0 is "at the camera"
  isAccent: boolean;
}

const STAR_COUNT = 600;
const MAX_DEPTH = 1000;
const FOV = 300;
const DRIFT_SPEED = 0.15; // depth units/frame — kept low for a calm drift, not warp speed
const PARALLAX_SHIFT_PX = 40; // max on-screen shift for the nearest stars as the pointer moves
const PARALLAX_EASE = 0.02;
const ACCENT_STAR_CHANCE = 0.06;

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let animationFrame: number;
    // Pauses the loop while the tab is backgrounded — without this it kept
    // redrawing ~600 stars every frame indefinitely with nothing visible,
    // burning CPU/battery for no benefit (useCanvasCursor.ts pauses on
    // blur for the same reason).
    let running = !document.hidden;

    const stars: Star[] = [];

    // Picks a screen position first, then derives world x/y for that exact
    // z from the projection formula — so the star is immediately visible on
    // screen at whatever depth it's given, rather than x/y being chosen
    // independent of z (which places a star that happens to get a small,
    // near-camera z at wildly off-screen coordinates, invisible until it
    // completes a full drift cycle to get there naturally).
    function randomStar(z: number): Star {
      const margin = 1.2;
      const screenX = (Math.random() - 0.5) * width * margin;
      const screenY = (Math.random() - 0.5) * height * margin;
      return {
        x: (screenX / FOV) * z,
        y: (screenY / FOV) * z,
        z,
        isAccent: Math.random() < ACCENT_STAR_CHANCE,
      };
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      centerX = width / 2;
      centerY = height / 2;
      canvas!.width = width;
      canvas!.height = height;
    }

    function initStars() {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++)
        stars.push(randomStar(Math.random() * MAX_DEPTH));
    }

    let targetOffsetX = 0;
    let targetOffsetY = 0;
    let offsetX = 0;
    let offsetY = 0;

    function onPointerMove(e: PointerEvent) {
      targetOffsetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetOffsetY = (e.clientY / window.innerHeight) * 2 - 1;
    }

    function draw() {
      if (!running) return;

      offsetX += (targetOffsetX - offsetX) * PARALLAX_EASE;
      offsetY += (targetOffsetY - offsetY) * PARALLAX_EASE;

      ctx!.clearRect(0, 0, width, height);

      for (const star of stars) {
        star.z -= DRIFT_SPEED;

        // depthFactor: 0 for a star at the far plane, 1 for a star at the camera.
        const depthFactor = 1 - star.z / MAX_DEPTH;
        const px =
          (star.x / star.z) * FOV +
          centerX +
          offsetX * PARALLAX_SHIFT_PX * depthFactor;
        const py =
          (star.y / star.z) * FOV +
          centerY +
          offsetY * PARALLAX_SHIFT_PX * depthFactor;

        const offscreen = px < 0 || px > width || py < 0 || py > height;

        // Respawn the instant a star leaves the camera or the visible area —
        // at a fresh random depth, not always the far plane — so the field
        // stays continuously full instead of thinning out in waves while
        // off-screen stars silently count down before reappearing.
        if (star.z <= 1 || offscreen) {
          const fresh = randomStar(Math.random() * MAX_DEPTH);
          star.x = fresh.x;
          star.y = fresh.y;
          star.isAccent = fresh.isAccent;
          star.z = fresh.z;
          continue;
        }

        const radius = Math.max(0.3, depthFactor * 1.8);
        const opacity = Math.min(1, 0.15 + depthFactor * 0.9);

        ctx!.beginPath();
        ctx!.arc(px, py, radius, 0, Math.PI * 2);
        ctx!.fillStyle = star.isAccent
          ? `hsla(29, 60%, 65%, ${opacity})`
          : `hsla(220, 20%, 92%, ${opacity})`;
        ctx!.fill();
      }

      animationFrame = requestAnimationFrame(draw);
    }

    function onVisibilityChange() {
      const wasRunning = running;
      running = !document.hidden;
      if (running && !wasRunning) {
        // Browsers defer (not cancel) a pending rAF while hidden — it can
        // still fire after we resume, see running=true by then, and
        // reschedule itself, running alongside the fresh chain kicked off
        // here. Cancel it first so there's only ever one chain, regardless
        // of whether it already died naturally (its own next tick would
        // have seen running=false and bailed) or is still pending.
        cancelAnimationFrame(animationFrame);
        draw();
      }
    }

    resize();
    initStars();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 bg-main-bg"
    />
  );
}
