import type { ParsedCommand } from "../gitParser";
import type { Branch, GitState } from "../gitState";
import { deepCloneGitState } from "./deepCloneGitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git checkout <branch> or git checkout -b <branch>
 * Switches to an existing branch or creates and switches to a new one
 */
export function executeCheckout(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const branchName = command.branchName;
  const shouldCreate = command.createBranch === true;

  if (!branchName) {
    return {
      success: false,
      message: "Branch name required",
    };
  }

  const newState = deepCloneGitState(state);

  // Check if branch exists
  if (!newState.branches.has(branchName)) {
    if (!shouldCreate) {
      return {
        success: false,
        message: `Branch '${branchName}' does not exist. Use 'git checkout -b ${branchName}' to create it.`,
      };
    }

    // Create new branch at current commit
    const newBranch: Branch = {
      name: branchName,
      headCommitId: state.HEAD,
      createdAt: Date.now(),
    };
    newState.branches.set(branchName, newBranch);
  }

  // Update current branch
  const targetBranch = newState.branches.get(branchName);
  if (targetBranch) {
    newState.currentBranch = branchName;
    newState.HEAD = targetBranch.headCommitId;

    return {
      success: true,
      message: `Switched to branch '${branchName}'`,
      newState,
    };
  }

  return {
    success: false,
    message: `Failed to checkout branch '${branchName}'`,
  };
}
