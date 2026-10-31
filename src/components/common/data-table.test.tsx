import { fireEvent, render, screen } from "@testing-library/react";

import { DataTable, dataTableColumns } from "./data-table";

const rows = [
  { id: "a", name: "Alpha", price: 1 },
  { id: "b", name: "Beta", price: 2 },
];
const col = dataTableColumns<(typeof rows)[number]>();
const columns = col.columns([
  col.accessor("name", { header: "Name" }),
  col.accessor("price", { header: "Price", meta: { align: "end", className: "num" } }),
]);

test("renders rows, aligns end columns and marks the selected row", () => {
  render(<DataTable columns={columns} data={rows} getRowId={(r) => r.id} selectedRowId="b" />);

  expect(screen.getByRole("columnheader", { name: "Price" }).className).toContain("text-right");
  expect(screen.getByRole("cell", { name: "2" }).className).toMatch(/text-right.*num/);
  expect(screen.getByRole("row", { name: /Beta/ }).dataset.selected).toBe("true");
  expect(screen.getByRole("row", { name: /Alpha/ }).dataset.selected).toBe("false");
});

test("arrow keys and j/k move focus between clickable rows", async () => {
  const col = dataTableColumns<{ id: string }>();
  const columns = col.columns([col.accessor("id", { header: "Id" })]);
  render(
    <DataTable
      columns={columns}
      data={[{ id: "a" }, { id: "b" }]}
      getRowId={(r) => r.id}
      onRowClick={() => {}}
    />,
  );
  const [a, b] = screen.getAllByRole("row").slice(1);
  a!.focus();
  fireEvent.keyDown(a!, { key: "j" });
  expect(document.activeElement).toBe(b);
  fireEvent.keyDown(b!, { key: "ArrowUp" });
  expect(document.activeElement).toBe(a);
});
