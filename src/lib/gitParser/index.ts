/**
 * Git Command Parser
 * Main entry point for parsing user input into structured command objects
 */

export * from "./types";
export * from "./validator";

import { CommandResult } from "./types";
import { smartSplit } from "./utils";
import { parseAdd } from "./parsers/add";
import { parseCommit } from "./parsers/commit";
import { parseBranch } from "./parsers/branch";
import { parseCheckout } from "./parsers/checkout";
import { parseSwitch } from "./parsers/switch";
import { parseMerge } from "./parsers/merge";
import {
  parsePull,
  parseRebase,
  parseSquash,
  parseReset,
  parseTag,
  parseLog,
  parseStatus,
} from "./parsers/other";

/**
 * Parses a git command string into a structured command object
 * @example
 * parseGitCommand('git commit -m "Initial commit"')
 * // Returns: { type: 'commit', message: 'Initial commit', rawInput: '...' }
 */
export function parseGitCommand(input: string): CommandResult {
  const trimmed = input.trim();

  // Check if input starts with 'git'
  if (!trimmed.toLowerCase().startsWith("git ")) {
    return {
      error: true,
      message: 'Command must start with "git"',
      rawInput: input,
    };
  }

  // Remove 'git ' prefix
  const command = trimmed.substring(4).trim();
  const parts = smartSplit(command);

  if (parts.length === 0) {
    return {
      error: true,
      message: "Empty command",
      rawInput: input,
    };
  }

  const mainCommand = parts[0].toLowerCase();

  try {
    switch (mainCommand) {
      case "commit":
        return parseCommit(parts, input);
      case "add":
        return parseAdd(parts, input);
      case "branch":
        return parseBranch(parts, input);
      case "checkout":
        return parseCheckout(parts, input);
      case "switch":
        return parseSwitch(parts, input);
      case "merge":
        return parseMerge(parts, input);
      case "pull":
        return parsePull(parts, input);
      case "rebase":
        return parseRebase(parts, input);
      case "squash":
        return parseSquash(parts, input);
      case "reset":
        return parseReset(parts, input);
      case "tag":
        return parseTag(parts, input);
      case "log":
        return parseLog(parts, input);
      case "status":
        return parseStatus(parts, input);
      default:
        return {
          error: true,
          message: `Unknown command: ${mainCommand}`,
          rawInput: input,
        };
    }
  } catch (err) {
    return {
      error: true,
      message: err instanceof Error ? err.message : "Parse error",
      rawInput: input,
    };
  }
}
