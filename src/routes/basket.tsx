import { createFileRoute } from "@tanstack/react-router";

import { BasketPage } from "@/components/basket/basket-page";

export const Route = createFileRoute("/basket")({
  component: BasketPage,
});
