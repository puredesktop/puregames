import React, { useEffect, useRef, useState } from "react";
import { dialogueFor } from "./lib/halloween.mjs";
import { renderHalloween, cameraBetween } from "./halloween-render.mjs";

export function HalloweenScene({
  board,
  seat = 0,
  names = [],
  preview = false,
  balanced = false,
}) {
  const canvas = useRef(null),
    latest = useRef({ board, seat, names });
  const [fallback, setFallback] = useState(false);
  latest.current = { board, seat, names };
  useEffect(() => {
    const node = canvas.current;
    let disposed = false,
      raf,
      world,
      observer,
      visible = true;
    let before = latest.current.board.players[Math.max(0, latest.current.seat)],
      lastBoard,
      changed = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    intersection.observe(node);
    const fail = () => {
      if (!disposed) setFallback(true);
    };
    const lost = (e) => {
      e.preventDefault();
      fail();
    };
    node.addEventListener("webglcontextlost", lost);
    const start = async () => {
      try {
        if (fallback) {
          const c = node.getContext("2d");
          if (!c) return;
          world = {
            resize(w, h) {
              const dpr = Math.min(1.5, devicePixelRatio || 1);
              node.width = w * dpr;
              node.height = h * dpr;
              c.setTransform(dpr, 0, 0, dpr, 0, 0);
            },
            render(b, seat, time) {
              const p = b.players[Math.max(0, seat)];
              if (b !== lastBoard) {
                before = lastBoard?.players[Math.max(0, seat)] || p;
                lastBoard = b;
                changed = time;
              }
              const view = {
                ...b,
                dialogue: dialogueFor(b, seat),
                party: b.players.filter((_, i) => i !== Math.max(0, seat)),
              };
              renderHalloween(
                c,
                view,
                node.clientWidth,
                node.clientHeight,
                reduced ? 0 : time,
                cameraBetween(before, p, Math.min(1, (time - changed) / 100))
              );
            },
            dispose() {},
          };
        } else {
          const { createHalloweenWorld } = await import(
            "./halloween-world.mjs"
          );
          if (disposed) return;
          world = createHalloweenWorld(node, { preview, balanced });
        }
        if (disposed) {
          world?.dispose();
          return;
        }
        const resize = () => world.resize(node.clientWidth, node.clientHeight);
        observer = new ResizeObserver(resize);
        observer.observe(node);
        resize();
        const frame = (time) => {
          if (disposed) return;
          if (visible && !document.hidden) {
            const v = latest.current;
            try {
              world.render(v.board, v.seat, time, reduced, v.names);
            } catch {
              fail();
              return;
            }
          }
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      } catch {
        fail();
      }
    };
    void start();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      intersection.disconnect();
      node.removeEventListener("webglcontextlost", lost);
      world?.dispose();
    };
  }, [fallback, balanced, preview]);
  return (
    <>
      <canvas
        key={`${fallback}-${balanced}`}
        ref={canvas}
        className={`boo-canvas ${fallback ? "boo-simple" : ""}`}
        role="img"
        aria-label="First-person view of Gourd Street, a moonlit Halloween village with glowing cottages and figures watching from the doors."
      />
      {fallback && !preview && (
        <span className="boo-render-note">
          Simple graphics · 3D unavailable
        </span>
      )}
    </>
  );
}
