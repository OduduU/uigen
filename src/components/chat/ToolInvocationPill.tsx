"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationPillProps {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  result?: unknown;
}

function getLabel(toolName: string, args: Record<string, unknown>, completed: boolean): string {
  const file = typeof args.path === "string" ? args.path.split("/").pop() ?? args.path : "";
  const command = args.command as string | undefined;

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":       return completed ? `Created ${file}` : `Creating ${file}`;
      case "str_replace":  return completed ? `Edited ${file}` : `Editing ${file}`;
      case "insert":       return completed ? `Edited ${file}` : `Editing ${file}`;
      case "view":         return completed ? `Read ${file}` : `Reading ${file}`;
      case "undo_edit":    return completed ? `Undid edit in ${file}` : `Undoing edit in ${file}`;
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename": return completed ? `Renamed ${file}` : `Renaming ${file}`;
      case "delete": return completed ? `Deleted ${file}` : `Deleting ${file}`;
    }
  }

  return toolName;
}

export function ToolInvocationPill({ toolName, args, state, result }: ToolInvocationPillProps) {
  const completed = state === "output-available" && result != null;
  const label = getLabel(toolName, args, completed);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {completed ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
