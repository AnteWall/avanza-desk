/** Empty state: one muted sentence ("No open orders."). */
export function Empty({ children }: { children: string }) {
  return <p className="text-muted-foreground p-3">{children}</p>;
}
