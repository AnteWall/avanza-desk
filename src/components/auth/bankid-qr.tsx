import { useMemo } from "react";
import { encode } from "uqr";

/**
 * BankID QR code. Always dark modules on a white tile, in both themes: phone scanners
 * expect dark-on-light. Swaps without animation since the payload changes every second.
 */
export function BankIdQr({ payload }: { payload: string }) {
  const { size, path } = useMemo(() => {
    const { data, size } = encode(payload, { border: 0, ecc: "M" });
    let path = "";
    data.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) path += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { size, path };
  }, [payload]);

  return (
    <div className="rounded-xl bg-white p-4">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-48 fill-black"
        shapeRendering="crispEdges"
        role="img"
        aria-label="BankID QR code"
      >
        <path d={path} />
      </svg>
    </div>
  );
}
