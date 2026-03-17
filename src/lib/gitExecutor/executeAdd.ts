import type { ParsedCommand } from "../gitParser";
import type { GitState } from "../gitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git add .
 * Stages changes (simulated)
 */
export function executeAdd(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const paths = command.paths?.length ? command.paths.join(" ") : ".";
  return {
    success: true,
    message: `Staged changes for ${paths}`,
    newState: state,
  };
}
