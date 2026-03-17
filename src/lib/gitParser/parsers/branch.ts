import type { CommandResult } from "../types";

/**
 * Parses 'branch' command
 * Formats: git branch | git branch <name> | git branch -d <name> | git branch -D <name>
 */
export function parseBranch(parts: string[], rawInput: string): CommandResult {
  if (parts.length === 1) {
    // Just 'git branch' - list branches
    return {
      type: "branch-list",
      rawInput,
    };
  }

  const rawFlag = parts[1];
  const flag = rawFlag.toLowerCase();

  if (rawFlag === "-D") {
    if (parts.length < 3) {
      return {
        error: true,
        message: "Branch name required for deletion",
        rawInput,
      };
    }
    return {
      type: "branch-delete",
      branchName: parts[2],
      force: true,
      rawInput,
    };
  }

  if (flag === "-d" || flag === "--delete") {
    if (parts.length < 3) {
      return {
        error: true,
        message: "Branch name required for deletion",
        rawInput,
      };
    }
    return {
      type: "branch-delete",
      branchName: parts[2],
      force: false,
      rawInput,
    };
  }

  // Create new branch
  return {
    type: "branch",
    branchName: flag,
    rawInput,
  };
}
