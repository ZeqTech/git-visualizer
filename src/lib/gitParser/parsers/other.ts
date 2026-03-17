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
  if (parts.length < 3) {
    return {
      error: true,
      message: "Reset requires mode and target (e.g. git reset --hard HEAD~1)",
      rawInput,
    };
  }

  const mode = parts[1];
  const target = parts[2];

  if (mode !== "--hard" && mode !== "--soft") {
    return {
      error: true,
      message: "Reset mode must be --hard or --soft",
      rawInput,
    };
  }

  return {
    type: "reset",
    resetMode: mode,
    resetTarget: target,
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
    message: parts[1],
    rawInput,
  };
}

/**
 * Parses 'log' command
 * Formats: git log
 */
export function parseLog(parts: string[], rawInput: string): CommandResult {
  if (parts.length === 1) {
    return {
      type: "log",
      oneline: false,
      rawInput,
    };
  }

  if (parts.length === 2 && parts[1] === "--oneline") {
    return {
      type: "log",
      oneline: true,
      rawInput,
    };
  }

  return {
    error: true,
    message: "Unsupported log option. Use 'git log' or 'git log --oneline'",
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
