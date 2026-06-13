/**
 * Git Command Parser
 * Main entry point for parsing user input into structured command objects
 */

export * from "./types";
export * from "./validator";

import type { GitCommandType } from "./types";
import { CommandResult } from "./types";
import { smartSplit } from "./utils";
import { parseAdd } from "./parsers/add";
import { parseCommit } from "./parsers/commit";
import { parseBranch } from "./parsers/branch";
import { parseCheckout } from "./parsers/checkout";
import { parseSwitch } from "./parsers/switch";
import { parseMerge } from "./parsers/merge";
import { parseWorkflowCommand } from "./parsers/workflow";
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
  const parts = smartSplit(trimmed);
  const baseCommand = parts[0]?.toLowerCase() ?? "";

  const allowedStandaloneCommands = new Set([
    "touch",
    "echo",
    "edit",
    "delete",
    "clear",
  ]);

  // Allow Git commands and selected standalone OS-style commands
  if (baseCommand !== "git" && !allowedStandaloneCommands.has(baseCommand)) {
    return {
      error: true,
      message: 'Command must start with "git", "touch", "echo", "edit", "delete", or "clear"',
      rawInput: input,
    };
  }

  if (baseCommand === "clear") {
    return {
      error: true,
      message: "clear is handled by the terminal",
      rawInput: input,
    };
  }

  // Git commands keep the existing `git ` prefix requirement.
  if (baseCommand === "git" && !trimmed.toLowerCase().startsWith("git ")) {
    return {
      error: true,
      message: 'Command must start with "git"',
      rawInput: input,
    };
  }

  // Remove `git ` prefix for Git commands only; standalone commands use the raw input.
  const command = baseCommand === "git" ? trimmed.substring(4).trim() : trimmed;
  const commandParts = baseCommand === "git" ? smartSplit(command) : parts;

  if (commandParts.length === 0) {
    return {
      error: true,
      message: "Empty command",
      rawInput: input,
    };
  }

  const mainCommand = commandParts[0].toLowerCase();
  // Runtime type guard for GitCommandType
  const isValidGitCommand = (cmd: string): cmd is GitCommandType => {
    const validCommands: Set<string> = new Set([
      "commit",
      "add",
      "stash",
      "restore",
      "echo",
      "touch",
      "edit",
      "delete",
      "branch",
      "branch-delete",
      "branch-list",
      "checkout",
      "switch",
      "merge",
      "rebase",
      "squash",
      "reset",
      "tag",
      "pull",
      "log",
      "status",
    ]);
    return validCommands.has(cmd);
  };

  try {
    // Route workflow / OS-like helpers through the workflow parser
    if (["stash", "restore", "touch", "edit", "delete", "echo"].includes(mainCommand)) {
      if (!isValidGitCommand(mainCommand)) {
        return {
          error: true,
          message: `Unsupported command: ${mainCommand}`,
          rawInput: input,
        };
      }
      // mainCommand is now narrowed to GitCommandType by the guard
      return parseWorkflowCommand(mainCommand, commandParts, input);
    }

    switch (mainCommand) {
      case "commit":
        return parseCommit(commandParts, input);
      case "add":
        return parseAdd(commandParts, input);
      case "branch":
        return parseBranch(commandParts, input);
      case "checkout":
        return parseCheckout(commandParts, input);
      case "switch":
        return parseSwitch(commandParts, input);
      case "merge":
        return parseMerge(commandParts, input);
      case "pull":
        return parsePull(commandParts, input);
      case "rebase":
        return parseRebase(commandParts, input);
      case "squash":
        return parseSquash(commandParts, input);
      case "reset":
        return parseReset(commandParts, input);
      case "tag":
        return parseTag(commandParts, input);
      case "log":
        return parseLog(commandParts, input);
      case "status":
        return parseStatus(commandParts, input);
      default:
          // Global fallback routing for OS-like helpers (ensure these are
          // handled even if earlier routing missed them). This sits directly
          // before the Unknown command return so it can intercept touch/echo.
          const trimmedInput = input.trim();
          const baseCmd = trimmedInput.split(" ")[0];

          if (baseCmd === "touch") {
            const filename = trimmedInput.substring(6).trim();
            if (!filename) {
              return {
                error: true,
                message: "touch requires a filename",
                rawInput: input,
              };
            }
            // Delegate to the workflow parser which returns a proper ParsedCommand
            return parseWorkflowCommand("touch", smartSplit(trimmedInput), input);
          }

          if (baseCmd === "echo") {
            const isAppend = trimmedInput.includes(">>");
            const operator = isAppend ? ">>" : ">";

            if (!trimmedInput.includes(operator)) {
              return {
                error: true,
                message: 'Invalid format. Use: echo "text" > file.txt',
                rawInput: input,
              };
            }

            const parts = trimmedInput.split(operator);
            let content = parts[0].replace(/^echo\s+/, "").trim();

            if ((content.startsWith('"') && content.endsWith('"')) ||
                (content.startsWith("'") && content.endsWith("'"))) {
              content = content.substring(1, content.length - 1);
            }

            const filename = (parts[1] || "").trim();
            if (!filename) {
              return {
                error: true,
                message: "Filename is required after redirection operator",
                rawInput: input,
              };
            }

            return {
              type: "echo",
              paths: [filename],
              echoContent: content,
              echoTarget: filename,
              echoAppend: isAppend,
              rawInput: input,
            };
          }

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
