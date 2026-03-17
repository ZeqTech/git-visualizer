import type { CommandResult } from "../types";

/**
 * Parses 'checkout' command
 * Formats: git checkout <branch> | git checkout -b <branch>
 */
export function parseCheckout(parts: string[], rawInput: string): CommandResult {
  if (parts.length < 2) {
    return {
      error: true,
      message: "Branch name required for checkout",
      rawInput,
    };
  }

  const flag = parts[1].toLowerCase();

  if (flag === "-b") {
    // Create and checkout new branch
    if (parts.length < 3) {
      return {
        error: true,
        message: "Branch name required for checkout -b",
        rawInput,
      };
    }
    return {
      type: "checkout",
      branchName: parts[2],
      createBranch: true,
      rawInput,
    };
  }

  // Checkout existing branch
  return {
    type: "checkout",
    branchName: flag,
    createBranch: false,
    rawInput,
  };
}
