import { invoke, type Channel } from "@tauri-apps/api/core";

import { tauriFetch } from "./tauri-fetch";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn<typeof invoke>(),
  Channel: class {
    id = 7;
    onmessage = () => {};
  },
}));

test("keeps every Set-Cookie header and the body", async () => {
  vi.mocked(invoke).mockResolvedValue({
    status: 200,
    statusText: "OK",
    headers: [
      ["set-cookie", "a=1; Path=/"],
      ["set-cookie", "b=2; Path=/"],
      ["content-type", "application/json"],
    ],
    body: '{"ok":true}',
  });
  const res = await tauriFetch(new URL("https://www.avanza.se/x"), {
    method: "POST",
    headers: { Accept: "application/json" },
    body: "{}",
  });
  expect(invoke).toHaveBeenCalledWith("avanza_fetch", {
    url: "https://www.avanza.se/x",
    method: "POST",
    headers: [["accept", "application/json"]],
    body: "{}",
  });
  expect(res.ok).toBe(true);
  expect(res.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
  expect(await res.text()).toBe('{"ok":true}');
});

test("throws on a redirect when redirect is error", async () => {
  vi.mocked(invoke).mockResolvedValue({ status: 302, statusText: "", headers: [], body: "" });
  await expect(tauriFetch("https://www.avanza.se/x", { redirect: "error" })).rejects.toThrow(
    TypeError,
  );
});

test("streams a push body over the channel and closes the pipe at its end", async () => {
  vi.mocked(invoke).mockResolvedValue({
    status: 200,
    statusText: "OK",
    headers: [["content-type", "text/event-stream"]],
    body: "",
  });
  const res = await tauriFetch("https://www.avanza.se/_push/x", {
    headers: { Accept: "text/event-stream" },
  });
  const [command, args] = vi.mocked(invoke).mock.calls.at(-1)!;
  expect(command).toBe("avanza_stream");
  const channel = (args as { channel: Channel<ArrayBuffer | string | null> }).channel;

  channel.onmessage(new TextEncoder().encode("data: 1\n\n").buffer);
  channel.onmessage(null);
  expect(await new Response(res.body).text()).toBe("data: 1\n\n");
  expect(invoke).toHaveBeenLastCalledWith("avanza_stream_close", { id: channel.id });
});

test("aborting ends a push body", async () => {
  vi.mocked(invoke).mockResolvedValue({ status: 200, statusText: "OK", headers: [], body: "" });
  const controller = new AbortController();
  const res = await tauriFetch("https://www.avanza.se/_push/x", {
    headers: { Accept: "text/event-stream" },
    signal: controller.signal,
  });
  controller.abort();
  await expect(res.body!.getReader().read()).rejects.toBeDefined();
  expect(invoke).toHaveBeenLastCalledWith("avanza_stream_close", expect.anything());
});
