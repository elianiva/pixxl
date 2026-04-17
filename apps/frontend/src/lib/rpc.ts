import { createORPCClient } from "@orpc/client";
import { ContractRouterClient } from "@orpc/contract";
import { RPCLink } from "@orpc/client/websocket";
import { routerContract } from "@pixxl/shared";

const searchParams = new URLSearchParams(window.location.search);
const backendPort = searchParams.get("backendPort");
const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsHost = backendPort
  ? `127.0.0.1:${backendPort}`
  : window.location.port === "5173"
    ? "127.0.0.1:3000"
    : window.location.host || "127.0.0.1:3000";
export const WS_BASE = `${wsProtocol}//${wsHost}`;

const RPC_WS_URL = `${WS_BASE}/rpc`;

export type ConnectionState = "connecting" | "open" | "closed" | "error";

let currentState: ConnectionState = "connecting";
const stateListeners = new Set<(state: ConnectionState) => void>();

function emitState(state: ConnectionState) {
  currentState = state;
  for (const listener of stateListeners) {
    listener(state);
  }
}

export function subscribeConnectionState(cb: (state: ConnectionState) => void): () => void {
  stateListeners.add(cb);
  cb(currentState);
  return () => stateListeners.delete(cb);
}

export function getConnectionState(): ConnectionState {
  return currentState;
}

class ResilientWebSocket {
  private _url: string;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxDelay = 30000;
  private explicitClose = false;
  private sendBuffer: (string | Blob | BufferSource)[] = [];

  onopen: ((this: WebSocket, ev: Event) => void) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => void) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => void) | null = null;
  onerror: ((this: WebSocket, ev: Event) => void) | null = null;

  constructor(url: string) {
    this._url = url;
    this._connect();
  }

  private _connect() {
    if (this.explicitClose) return;
    if (this.ws) return;

    emitState("connecting");
    this.ws = new WebSocket(this._url);

    this.ws.onopen = (e) => {
      this.reconnectDelay = 1000;
      emitState("open");
      this._flush();
      this.onopen?.call(this as unknown as WebSocket, e);
    };

    this.ws.onmessage = (e) => {
      this.onmessage?.call(this as unknown as WebSocket, e);
    };

    this.ws.onclose = (e) => {
      this.ws = null;
      emitState("closed");
      this.onclose?.call(this as unknown as WebSocket, e);
      if (!this.explicitClose) {
        this.reconnectTimer = setTimeout(() => this._connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
      }
    };

    this.ws.onerror = (e) => {
      emitState("error");
      this.onerror?.call(this as unknown as WebSocket, e);
    };
  }

  private _flush() {
    while (this.sendBuffer.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(this.sendBuffer.shift()!);
    }
  }

  send(data: string | Blob | BufferSource): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.sendBuffer.push(data);
      if (!this.ws) this._connect();
    }
  }

  close(code?: number, reason?: string): void {
    this.explicitClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close(code, reason);
  }

  get readyState(): number {
    if (this.explicitClose) return WebSocket.CLOSED;
    return this.ws?.readyState ?? WebSocket.CONNECTING;
  }

  get bufferedAmount(): number {
    return this.ws?.bufferedAmount ?? 0;
  }

  get url(): string {
    return this._url;
  }

  get protocol(): string {
    return this.ws?.protocol ?? "";
  }

  get extensions(): string {
    return this.ws?.extensions ?? "";
  }

  get binaryType(): BinaryType {
    return this.ws?.binaryType ?? "blob";
  }

  set binaryType(value: BinaryType) {
    if (this.ws) this.ws.binaryType = value;
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    _options?: boolean | AddEventListenerOptions,
  ): void {
    if (!listener) return;
    const key = `__listener_${type}`;
    const existing = (this as unknown as Record<string, unknown>)[key] as
      | Set<EventListenerOrEventListenerObject>
      | undefined;
    if (!existing) {
      (this as unknown as Record<string, unknown>)[key] = new Set([listener]);
      const orig = this[`on${type}` as keyof this] as ((ev: Event) => void) | null;
      this[`on${type}` as keyof this] = ((ev: Event) => {
        orig?.(ev);
        const set = (this as unknown as Record<string, unknown>)[key] as Set<
          EventListenerOrEventListenerObject
        >;
        for (const l of set) {
          if (typeof l === "function") {
            l(ev);
          } else {
            l.handleEvent(ev);
          }
        }
      }) as unknown as this[keyof this];
    } else {
      existing.add(listener);
    }
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    _options?: boolean | EventListenerOptions,
  ): void {
    if (!listener) return;
    const key = `__listener_${type}`;
    const existing = (this as unknown as Record<string, unknown>)[key] as
      | Set<EventListenerOrEventListenerObject>
      | undefined;
    existing?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    const fn = this[`on${event.type}` as keyof this] as ((ev: Event) => void) | null;
    fn?.(event);
    return !event.defaultPrevented;
  }
}

const websocket = new ResilientWebSocket(RPC_WS_URL);

const link = new RPCLink({
  websocket: websocket as unknown as WebSocket,
});

export const rpc: ContractRouterClient<typeof routerContract> = createORPCClient(link);
