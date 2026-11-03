"use client";

import type { KeyboardEvent, TextareaHTMLAttributes } from "react";

/** Textarea that starts a new "- " item on Enter; Enter on an empty item ends the list. Shift+Enter is a plain line break. */
export function NoteField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    const { value, selectionStart: start, selectionEnd: end } = el;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const line = value.slice(lineStart, start);
    e.preventDefault();

    if (line.trim() === "-") {
      el.setRangeText("", lineStart, end, "end");
    } else {
      // The first line becomes an item too, unless it is a heading like "Iluminación:".
      const prefixFirst = line.trim() && !line.startsWith("- ") && !line.trimEnd().endsWith(":") && lineStart === 0 && !value.includes("\n");
      el.setRangeText("\n- ", start, end, "end");
      if (prefixFirst) el.setRangeText("- ", 0, 0, "preserve");
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };

  return <textarea rows={1} {...props} onKeyDown={onKeyDown} className={`field-sizing-content ${props.className ?? ""}`} />;
}
