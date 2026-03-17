import { CommandResult } from "../types";

/**
 * Parses 'merge' command
 * Formats: git merge <branch> | git merge --squash <branch>
 */
export function parseMerge(parts: string[], rawInput: string): CommandResult {
  let squash = false;
  let branchIndex = 1;

  // Check for --squash flag
  if (parts[1] === "--squash") {
    squash = true;
    branchIndex = 2;
  }

  if (parts.length < branchIndex + 1) {
    return {
      error: true,
      message: "Branch name required for merge",
      rawInput,
    };
  }

  return {
    type: "merge",
    targetBranch: parts[branchIndex],
    squash,
    rawInput,
  };
}
