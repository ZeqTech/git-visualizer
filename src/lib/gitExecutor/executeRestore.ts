import type { ParsedCommand } from "../gitParser";
import type { GitState } from "../gitState";
import { restoreStagedFiles, restoreWorkingFiles } from "../gitTreeState";
import { deepCloneGitState } from "./deepCloneGitState";
import type { ExecutionResult } from "./types";

export function executeRestore(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const paths = command.paths ?? [];
  const newState = deepCloneGitState(state);

  if (command.restoreStaged) {
    const nextTree = restoreStagedFiles(newState.tree, paths);
    newState.tree = nextTree;
    return {
      success: true,
      message: `Unstaged ${paths.join(", ")}`,
      newState,
    };
  }

  const nextTree = restoreWorkingFiles(newState.tree, paths);
  newState.tree = nextTree;
  return {
    success: true,
    message: `Discarded local changes for ${paths.join(", ")}`,
    newState,
  };
}
