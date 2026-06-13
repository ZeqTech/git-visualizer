import type { ParsedCommand } from "../gitParser";
import type { GitState } from "../gitState";
import { popStashTree, stashTree } from "../gitTreeState";
import { deepCloneGitState } from "./deepCloneGitState";
import type { ExecutionResult } from "./types";

export function executeStash(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const mode = command.stashMode ?? "push";
  const newState = deepCloneGitState(state);

  if (mode === "push") {
    if (newState.tree.workingDirectory.length === 0 && newState.tree.index.length === 0) {
      return {
        success: false,
        message: "Nothing to stash",
      };
    }

    const nextTree = stashTree(newState.tree, "WIP on working tree");
    newState.tree = nextTree;
    return {
      success: true,
      message: "Saved working tree and index state to stash",
      newState,
    };
  }

  if (newState.tree.stashEntries.length === 0) {
    return {
      success: false,
      message: "No stash entries found",
    };
  }

  const nextTree = popStashTree(newState.tree, command.stashRestoreIndex ?? false);
  newState.tree = nextTree;
  return {
    success: true,
    message:
      mode === "apply"
        ? command.stashRestoreIndex
          ? "Applied stash entry with index"
          : "Applied stash entry"
        : "Popped stash entry",
    newState,
  };
}
