import { cn } from "cn";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { useShortcutBindings } from "@/components/layout/use-shortcuts";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { m } from "@/lib/i18n";
import {
  bindingFromEvent,
  bindingKeys,
  boundTo,
  getBinding,
  getShortcutOverrides,
  setBinding,
  type ShortcutAction,
} from "@/lib/shortcuts";

/**
 * One action's keys: click, press the new key or combination (Esc or a second click cancels).
 * Says what happened under the button: waiting, refused, or which action lost the keys.
 */
export function ShortcutRecorder({ action }: { action: ShortcutAction }) {
  useShortcutBindings();
  const [recording, setRecording] = useState(false);
  const [note, setNote] = useState<{ text: string; warn?: boolean }>();
  const keys = bindingKeys(getBinding(action));
  const changed = action in getShortcutOverrides();

  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      // Capture phase on window: runs before the app's shortcuts, which then never see it.
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecording(false);
        setNote(undefined);
        return;
      }
      const binding = bindingFromEvent(e);
      if (binding === "modifier") return;
      if (binding === "taken") {
        setNote({ text: m.settings.shortcuts.recorder.taken, warn: true });
        return;
      }
      const moved = boundTo(binding, action)?.label;
      setBinding(action, binding);
      setRecording(false);
      setNote(moved ? { text: m.settings.shortcuts.recorder.moved(moved), warn: true } : undefined);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, action]);

  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={recording}
          className={cn("min-w-32 justify-center", recording && "ring-ring ring-2")}
          aria-label={
            recording
              ? m.settings.shortcuts.recorder.recording
              : m.settings.shortcuts.recorder.change
          }
          onClick={() => {
            setNote(undefined);
            setRecording((r) => !r);
          }}
        >
          {recording ? (
            <span className="text-brand text-xs">{m.settings.shortcuts.recorder.pressKeys}</span>
          ) : keys.length ? (
            <KbdGroup>
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </KbdGroup>
          ) : (
            <span className="text-muted-foreground text-xs">
              {m.settings.shortcuts.recorder.none}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.settings.shortcuts.recorder.restore}
          title={m.settings.shortcuts.recorder.restore}
          disabled={!changed}
          onClick={() => {
            setNote(undefined);
            setBinding(action, null);
          }}
        >
          <RotateCcw />
        </Button>
      </span>
      {(recording || note) && (
        <span className={cn("text-xs", note?.warn ? "text-warning" : "text-muted-foreground")}>
          {note?.text ?? m.settings.shortcuts.recorder.escToCancel}
        </span>
      )}
    </span>
  );
}
