import type { ParsedCommand } from "../gitParser";
import type { GitState } from "../gitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git pull origin main
 * Fetches and merges remote changes (simulated)
 */
export function executePull(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const remoteName = command.remoteName || "origin";
  const remoteBranch = command.remoteBranch || "main";

  return {
    success: true,
    message: `Already up to date with '${remoteName}/${remoteBranch}'`,
    newState: state,
  };
}
