import { Channel, invoke } from "@tauri-apps/api/core";

interface ProxyResponse {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
}

/** A body chunk, then `null` when the stream ends or an error message when it fails. */
type StreamMessage = ArrayBuffer | string | null;

/**
 * `fetch` for the avanza-ts SDK, routed through the Rust `avanza_fetch` command. Returns a
 * Response-like object: a real `Response` would drop Set-Cookie, which the SDK needs.
 * Push streams (`Accept: text/event-stream`) go through `avanza_stream`, which speaks the
 * HTTP/2 Avanza requires and hands the body over as it arrives; `init.signal` ends them.
 * shortcut: `init.signal` is ignored for other requests, add cancellation if long ones appear.
 */
export async function tauriFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const request = {
    url: input.toString(),
    method: init.method ?? "GET",
    headers: [...headers.entries()],
    body: typeof init.body === "string" ? init.body : null,
  };
  const stream = headers.get("Accept") === "text/event-stream" ? pushBody(init.signal) : null;
  const res = await (stream
    ? invoke<ProxyResponse>("avanza_stream", { ...request, channel: stream.channel })
    : invoke<ProxyResponse>("avanza_fetch", request));
  if (init.redirect === "error" && res.status >= 300 && res.status < 400) {
    throw new TypeError(`Unexpected redirect from ${input.toString()}`);
  }
  const ok = res.status >= 200 && res.status < 300;
  if (stream && ok) stream.arm();
  return {
    ok,
    status: res.status,
    statusText: res.statusText,
    // A standalone Headers keeps Set-Cookie readable through getSetCookie().
    headers: new Headers(res.headers),
    body: stream && ok ? stream.body : null,
    text: async () => res.body,
  } as Response;
}

/** The body of an `avanza_stream` reply. Made before invoking: chunks can beat the reply. */
function pushBody(signal: AbortSignal | null | undefined) {
  const channel = new Channel<StreamMessage>();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let done = false;
  const close = () => {
    done = true;
    signal?.removeEventListener("abort", abort);
    void invoke("avanza_stream_close", { id: channel.id });
  };
  const abort = () => {
    if (done) return;
    close();
    controller.error(signal?.reason);
  };
  const body = new ReadableStream<Uint8Array>({
    start: (c) => void (controller = c),
    cancel: close,
  });
  channel.onmessage = (message) => {
    if (done) return;
    if (message === null || typeof message === "string") {
      close();
      if (message === null) controller.close();
      else controller.error(new TypeError(message));
    } else controller.enqueue(new Uint8Array(message));
  };
  // Only once the reply is in: the Rust pipe exists from then on, an earlier close would miss it.
  const arm = () => {
    if (signal?.aborted) abort();
    else if (!done) signal?.addEventListener("abort", abort, { once: true });
  };
  return { channel, body, arm };
}
