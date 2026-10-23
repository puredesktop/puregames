import { useEffect, useRef } from "react";
// Keep a quick tap alive for one simulation step, even between timer/network samples.
export function useFlightControls(onSteer, onPause, weapon) {
  const send = useRef(onSteer),
    pause = useRef(onPause),
    pressed = useRef(new Set()),
    until = useRef(new Map());
  send.current = onSteer;
  pause.current = onPause;
  const emit = () => {
    const has = (k) =>
      pressed.current.has(k) || (until.current.get(k) || 0) > performance.now();
    send.current(
      {
        turn: +has("ArrowRight") - has("ArrowLeft"),
        thrust: +has("ArrowUp"),
        brake: has("ArrowDown"),
        [weapon]: has(weapon === "fire" ? "Space" : "Shift"),
      },
      0
    );
    send.current(
      {
        turn: +has("d") - has("a"),
        thrust: +has("w"),
        brake: has("s"),
        [weapon]: has("f"),
      },
      1
    );
  };
  const clear = () => {
    pressed.current.clear();
    until.current.clear();
    emit();
  };
  useEffect(() => {
    const timer = setInterval(emit, 60);
    window.addEventListener("blur", clear);
    return () => {
      clearInterval(timer);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, [weapon]);
  const key = (e, down) => {
    const k =
      e.code === "Space"
        ? "Space"
        : e.key.length === 1
        ? e.key.toLowerCase()
        : e.key;
    const pauseKey = weapon === "fire" ? "p" : "Space";
    if (k === pauseKey) {
      e.preventDefault();
      e.stopPropagation();
      if (down && !e.repeat) pause.current();
      return;
    }
    if (
      ![
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "w",
        "a",
        "s",
        "d",
        "f",
        weapon === "fire" ? "Space" : "Shift",
      ].includes(k)
    )
      return;
    e.preventDefault();
    e.stopPropagation();
    if (down) {
      pressed.current.add(k);
      if (!e.repeat) until.current.set(k, performance.now() + 140);
    } else pressed.current.delete(k);
    emit();
  };
  return {
    onKeyDown: (e) => key(e, true),
    onKeyUp: (e) => key(e, false),
    onBlur: clear,
  };
}
