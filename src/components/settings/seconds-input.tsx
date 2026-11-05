import { Input } from "@/components/ui/input";
import { m } from "@/lib/i18n";

/** A whole-seconds field with an "s" suffix. */
export function SecondsInput({
  label,
  seconds,
  onChange,
}: {
  label: string;
  seconds: number;
  onChange: (seconds: number) => void;
}) {
  return (
    <span className="relative">
      <Input
        type="number"
        min={1}
        aria-label={m.settings.seconds(label)}
        value={seconds}
        onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
        className="num w-24 [appearance:textfield] pr-6 text-right [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs">
        s
      </span>
    </span>
  );
}
