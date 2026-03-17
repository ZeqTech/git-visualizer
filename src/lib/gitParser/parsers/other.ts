import { CommandResult } from "../types";

/**
 * Parses 'pull' command
 * Formats: git pull origin main
 */
export function parsePull(parts: string[], rawInput: string): CommandResult {
  if (parts.length < 3) {
    return {
      error: true,
      message: "Pull requires a remote and branch (e.g. git pull origin main)",
      rawInput,
    };
  }

  return {
    type: "pull",
    remoteName: parts[1],
    remoteBranch: parts[2],
    rawInput,
  };
}

/**
 * Parses 'rebase' command
 * Format: git rebase <branch>
 */
export function parseRebase(parts: string[], rawInput: string): CommandResult {
  if (parts.length < 2) {
    return {
      error: true,
      message: "Branch name required for rebase",
      rawInput,
    };
  }

  return {
    type: "rebase",
    targetBranch: parts[1],
    rawInput,
  };
}

/**
 * Parses 'squash' command
 * Format: git squash <branch>
 * Squashes all commits since branching from target branch into one commit
 */
export function parseSquash(parts: string[], rawInput: string): CommandResult {
  if (parts.length < 2) {
    return {
      error: true,
      message: "Branch name required for squash",
      rawInput,
    };
  }

  return {
    type: "squash",
    targetBranch: parts[1],
    rawInput,
  };
}

/**
 * Parses 'reset' command
 * Formats: git reset --hard HEAD~1 | git reset --soft HEAD
 */
export function parseReset(parts: string[], rawInput: string): CommandResult {
  if (parts.length < 2) {
    return {
      error: true,
      message: "Reset requires --hard or --soft flag",
      rawInput,
    };
  }

  return {
    type: "reset",
    rawInput,
  };
}

/**
 * Parses 'tag' command
 * Formats: git tag <tag-name>
 */
export function parseTag(parts: string[], rawInput: string): CommandResult {
  if (parts.length < 2) {
    return {
      error: true,
      message: "Tag name required",
      rawInput,
    };
  }

  return {
    type: "tag",
    branchName: parts[1],
    rawInput,
  };
}

/**
 * Parses 'log' command
 * Formats: git log
 */
export function parseLog(parts: string[], rawInput: string): CommandResult {
  return {
    type: "log",
    rawInput,
  };
}

/**
 * Parses 'status' command
 * Formats: git status
 */
export function parseStatus(parts: string[], rawInput: string): CommandResult {
  return {
    type: "status",
    rawInput,
  };
}
