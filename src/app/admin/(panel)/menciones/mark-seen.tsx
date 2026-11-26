"use client";

import { useEffect } from "react";
import { markMentionsSeen } from "@/app/admin/comment-actions";

/** Opening the mentions page counts them as seen, so the bell's badge clears. */
export function MarkMentionsSeen() {
  useEffect(() => {
    markMentionsSeen().catch(() => undefined);
  }, []);
  return null;
}
