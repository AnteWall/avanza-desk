import { AvanzaHttpError } from "avanza-ts";

import { errorMessage } from "./error-message";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn<() => Promise<void>>() }));

const http = (status: number) =>
  Object.assign(Object.create(AvanzaHttpError.prototype) as AvanzaHttpError, {
    status,
    statusText: "",
  });

test("errorMessage explains common failures", () => {
  expect(errorMessage(http(404))).toMatch(/no data/);
  expect(errorMessage(http(503))).toMatch(/problems/);
  expect(errorMessage("error sending request")).toMatch(/connection/);
  expect(errorMessage(new Error("x"))).toMatch(/went wrong/);
});
