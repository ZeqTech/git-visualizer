import { CommandResult } from "../types";

/**
 * Parses 'commit' command
 * Formats: git commit -m "message" | git commit "message" | git commit -m "message" -b <branch>
 */
export function parseCommit(parts: string[], rawInput: string): CommandResult {
  let message = "";
  let branchName: string | undefined;

  // Look for -m flag
  const mIndex = parts.findIndex((p) => p === "-m");
  if (mIndex !== -1 && mIndex + 1 < parts.length) {
    message = parts[mIndex + 1];
  } else if (parts.length > 1) {
    // If no -m flag, treat second part as message
    message = parts.slice(1).join(" ");
  }

  // Look for -b flag (optional branch target)
  const bIndex = parts.findIndex((p) => p === "-b");
  if (bIndex !== -1 && bIndex + 1 < parts.length) {
    branchName = parts[bIndex + 1];
  }

  if (!message) {
    return {
      error: true,
      message: 'Commit requires a message: git commit -m "your message"',
      rawInput,
    };
  }

  return {
    type: "commit",
    message,
    branchName,
    rawInput,
  };
}
