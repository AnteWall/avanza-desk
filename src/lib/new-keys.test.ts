import { newKeys } from "./new-keys";

test("reports only keys added after the first call, once each", () => {
  const seen = {};
  expect(newKeys(seen, ["a", "b"])).toEqual([]);
  expect(newKeys(seen, ["a", "b", "c"])).toEqual(["c"]);
  expect(newKeys(seen, ["c", "d"])).toEqual(["d"]);
  expect(newKeys(seen, ["a"])).toEqual([]);
});
