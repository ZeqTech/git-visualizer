import { CommandResult } from "../types";

/**
 * Parses 'switch' command
 * Formats: git switch <branch> | git switch -c <branch>
 */
export function parseSwitch(parts: string[], rawInput: string): CommandResult {
  if (parts.length < 2) {
    return {
      error: true,
      message: "Branch name required for switch",
      rawInput,
    };
  }

  const flag = parts[1].toLowerCase();

  if (flag === "-c") {
    if (parts.length < 3) {
      return {
        error: true,
        message: "Branch name required for switch -c",
        rawInput,
      };
    }
    return {
      type: "switch",
      branchName: parts[2],
      createBranch: true,
      rawInput,
    };
  }

  return {
    type: "switch",
    branchName: flag,
    createBranch: false,
    rawInput,
  };
}
