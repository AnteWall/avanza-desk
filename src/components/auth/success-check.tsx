/** Brand circle and check that draw themselves; static under reduced motion. */
export function SuccessCheck() {
  return (
    <svg viewBox="0 0 52 52" className="text-brand size-16" fill="none" aria-hidden>
      <circle
        cx="26"
        cy="26"
        r="24"
        stroke="currentColor"
        strokeWidth="2"
        pathLength={1}
        strokeDasharray={1}
        className="animate-draw origin-center -rotate-90 [stroke-dashoffset:1] motion-reduce:animate-none motion-reduce:[stroke-dashoffset:0]"
      />
      <path
        d="M16 27l7 7 13-15"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        className="animate-draw-late [stroke-dashoffset:1] motion-reduce:animate-none motion-reduce:[stroke-dashoffset:0]"
      />
    </svg>
  );
}
