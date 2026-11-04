import { useEffect, useState } from "react";
import { bridge } from "@purescience/platform-bridge/client";

/** A shell that never answers must not leave the whole app unable to start. */
const ANSWER_WAIT_MS = 3000;

const heldIn = (app) => app?.heldInRoom === true;

/**
 * Where this copy runs. `compact`: held in a page, so the short list and the game itself. `second`: held, or nested in a room,
 * which stays true when a room's Full app grows it: it joins nothing on its own. Nothing that acts on its own starts until
 * `known`. The timer only stands in for an answer that never comes, and a later answer still counts.
 */
export function useCopyRole() {
  const nested = window.parent !== window.top;
  const alone = window.parent === window;
  const [role, setRole] = useState({ known: alone, compact: false, second: nested });
  useEffect(() => {
    if (alone) return undefined;
    let disposed = false;
    let told = false;
    const answer = (app) => {
      if (disposed) return;
      const compact = heldIn(app);
      setRole((now) => ({ known: true, compact, second: nested || now.second || compact }));
    };
    const receive = (event) => {
      if (event.source !== window.parent || event.data?.type !== "pure:adjacent-app") return;
      told = true;
      answer(event.data.app);
    };
    window.addEventListener("message", receive);
    const timer = window.setTimeout(() => {
      if (!told) answer(null);
    }, ANSWER_WAIT_MS);
    void bridge.call("workspace.adjacentApp").then(
      (app) => {
        if (!told) {
          told = true;
          answer(app);
        }
      },
      () => {
        if (!told) {
          told = true;
          answer(null);
        }
      }
    );
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.removeEventListener("message", receive);
    };
  }, [nested, alone]);
  return role;
}
