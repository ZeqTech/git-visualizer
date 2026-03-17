import type { ParsedCommand } from "../gitParser";
import type { Branch, GitState } from "../gitState";
import { deepCloneGitState } from "./deepCloneGitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git branch <name>
 * Creates a new branch at the current commit
 */
export function executeBranch(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const branchName = command.branchName;

  if (!branchName) {
    return {
      success: false,
      message: "Branch name required",
    };
  }

  if (state.branches.has(branchName)) {
    return {
      success: false,
      message: `Branch '${branchName}' already exists`,
    };
  }

  const newState = deepCloneGitState(state);
  const newBranch: Branch = {
    name: branchName,
    headCommitId: state.HEAD,
    createdAt: Date.now(),
  };

  newState.branches.set(branchName, newBranch);

  return {
    success: true,
    message: `Created branch '${branchName}'`,
    newState,
  };
}
