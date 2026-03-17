import type { CommandResult } from "../types";

/**
 * Parses 'add' command
 * Formats: git add .
 */
export function parseAdd(parts: string[], rawInput: string): CommandResult {
  if (parts.length < 2) {
    return {
      error: true,
      message: "Path required for add (e.g. git add .)",
      rawInput,
    };
  }

  return {
    type: "add",
    paths: parts.slice(1),
    rawInput,
  };
}
