// WebSocket-shaped adapter over the desktop's authenticated PureServer transport.
export function remoteSocket(bridge) {
  return class {
    readyState = 0;
    constructor(_url, protocols) {
      this.conn = crypto.randomUUID();
      this.queue = Promise.resolve();
      this.off = bridge.onEvent("collab.frame", (frame) => {
        if (frame.conn !== this.conn || this.readyState === 3) return;
        if (frame.remote === "open") {
          this.readyState = 1;
          this.onopen?.();
        }
        if (frame.remote === "message") this.onmessage?.({ data: frame.data });
        if (frame.remote === "error") this.onerror?.();
        if (frame.remote === "close") {
          this.readyState = 3;
          this.off();
          this.onclose?.();
        }
      });
      bridge
        .call("collab.remote", [
          { op: "connect", conn: this.conn, token: protocols[1] },
        ])
        .catch(() => {
          this.onerror?.();
          this.close();
        });
    }
    send(data) {
      this.queue = this.queue
        .then(() =>
          bridge.call("collab.remote", [{ op: "send", conn: this.conn, data }])
        )
        .catch(() => {
          this.onerror?.();
          this.close();
        });
    }
    close() {
      if (this.readyState === 3) return;
      this.readyState = 3;
      this.off();
      void this.queue
        .finally(() =>
          bridge.call("collab.remote", [{ op: "leave", conn: this.conn }])
        )
        .catch(() => {});
      this.onclose?.();
    }
  };
}
