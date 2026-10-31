import { render, screen } from "@testing-library/react";

import { Flash } from "./flash";

test("flashes up or down only when the value changes", () => {
  const { rerender } = render(<Flash value={10}>price</Flash>);
  const span = () => screen.getByText("price");
  expect(span().className).not.toMatch(/flash/);
  rerender(<Flash value={11}>price</Flash>);
  expect(span().className).toMatch(/flash-up/);
  rerender(<Flash value={9}>price</Flash>);
  expect(span().className).toMatch(/flash-down/);
});
