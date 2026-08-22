"use client";
import { useEffect } from "react";

// Same accent color previously used by SplashCursor (#cb905a), expressed as HSL.
const CURSOR_HUE = 29;
const CURSOR_SATURATION = 52;
const CURSOR_LIGHTNESS = 57;

interface Point {
  x: number;
  y: number;
}

class Node {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
}

interface LineConfig {
  spring: number;
}

const E = {
  friction: 0.5,
  trails: 20,
  size: 50,
  dampening: 0.25,
  tension: 0.98,
};

class Line {
  spring: number;
  friction: number;
  nodes: Node[];

  constructor(config: LineConfig, pos: Point) {
    this.spring = config.spring + 0.1 * Math.random() - 0.02;
    this.friction = E.friction + 0.01 * Math.random() - 0.002;
    this.nodes = [];
    for (let n = 0; n < E.size; n++) {
      const node = new Node();
      node.x = pos.x;
      node.y = pos.y;
      this.nodes.push(node);
    }
  }

  update(pos: Point) {
    let spring = this.spring;
    let node = this.nodes[0];
    node.vx += (pos.x - node.x) * spring;
    node.vy += (pos.y - node.y) * spring;

    for (let i = 0, len = this.nodes.length; i < len; i++) {
      node = this.nodes[i];
      if (i > 0) {
        const prev = this.nodes[i - 1];
        node.vx += (prev.x - node.x) * spring;
        node.vy += (prev.y - node.y) * spring;
        node.vx += prev.vx * E.dampening;
        node.vy += prev.vy * E.dampening;
      }
      node.vx *= this.friction;
      node.vy *= this.friction;
      node.x += node.vx;
      node.y += node.vy;
      spring *= E.tension;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    let node = this.nodes[0];
    let x = node.x;
    let y = node.y;
    ctx.beginPath();
    ctx.moveTo(x, y);

    let a = 1;
    const last = this.nodes.length - 2;
    for (; a < last; a++) {
      const current = this.nodes[a];
      const next = this.nodes[a + 1];
      x = 0.5 * (current.x + next.x);
      y = 0.5 * (current.y + next.y);
      ctx.quadraticCurveTo(current.x, current.y, x, y);
    }
    const current = this.nodes[a];
    const next = this.nodes[a + 1];
    ctx.quadraticCurveTo(current.x, current.y, next.x, next.y);
    ctx.stroke();
    ctx.closePath();
  }
}

export function useCanvasCursor() {
  useEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    const pos: Point = { x: 0, y: 0 };
    let lines: Line[] = [];

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width = window.innerWidth - 20;
      canvas.height = window.innerHeight;
    }

    function render() {
      if (!running || !ctx) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `hsla(${CURSOR_HUE}, ${CURSOR_SATURATION}%, ${CURSOR_LIGHTNESS}%, 0.4)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < E.trails; i++) {
        const line = lines[i];
        line.update(pos);
        line.draw(ctx);
      }
      window.requestAnimationFrame(render);
    }

    function initLines() {
      lines = [];
      for (let i = 0; i < E.trails; i++) {
        lines.push(new Line({ spring: 0.4 + (i / E.trails) * 0.025 }, pos));
      }
    }

    function updatePosition(e: MouseEvent | TouchEvent) {
      if ("touches" in e) {
        pos.x = e.touches[0].pageX;
        pos.y = e.touches[0].pageY;
      } else {
        pos.x = e.clientX;
        pos.y = e.clientY;
      }
      e.preventDefault();
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        pos.x = e.touches[0].pageX;
        pos.y = e.touches[0].pageY;
      }
    }

    function handleFirstMove(e: MouseEvent | TouchEvent) {
      document.removeEventListener("mousemove", handleFirstMove);
      document.removeEventListener("touchstart", handleFirstMove);
      document.addEventListener("mousemove", updatePosition);
      document.addEventListener("touchmove", updatePosition);
      document.addEventListener("touchstart", handleTouchStart);
      updatePosition(e);
      initLines();
      // A blur before this first move sets running=false; render() bails
      // out immediately unless it's explicitly turned back on here.
      running = true;
      render();
    }

    function handleFocus() {
      // lines stays empty until the first pointer interaction (handleFirstMove
      // calls initLines()) — render() indexes into it unconditionally, so
      // refocusing before ever moving the pointer would otherwise throw.
      if (!running && lines.length > 0) {
        running = true;
        render();
      }
    }

    function handleBlur() {
      running = false;
    }

    document.addEventListener("mousemove", handleFirstMove);
    document.addEventListener("touchstart", handleFirstMove);
    document.body.addEventListener("orientationchange", resizeCanvas);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    resizeCanvas();

    return () => {
      running = false;
      document.removeEventListener("mousemove", handleFirstMove);
      document.removeEventListener("touchstart", handleFirstMove);
      document.removeEventListener("mousemove", updatePosition);
      document.removeEventListener("touchmove", updatePosition);
      document.removeEventListener("touchstart", handleTouchStart);
      document.body.removeEventListener("orientationchange", resizeCanvas);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);
}
