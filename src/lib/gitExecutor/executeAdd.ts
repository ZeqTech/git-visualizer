import type { ParsedCommand } from "../gitParser";
import type { GitState } from "../gitState";
import { stageFiles } from "../gitTreeState";
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
  const newState = {
    ...state,
    tree: stageFiles(state.tree, command.paths ?? ["."]),
  };

  return {
    success: true,
    message: `Staged changes for ${paths}`,
    newState,
  };
}
