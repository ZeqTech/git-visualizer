import type { ParsedCommand } from "../gitParser";
import { generateCommitId, type Commit, type GitState } from "../gitState";
import { deepCloneGitState } from "./deepCloneGitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git commit -m "message" [-b branch]
 * Creates a new commit on the current branch or specified branch
 *
 * If there is a pending squash merge, this commit will consume it and become
 * a linear commit (not a merge commit) with a single parent.
 */
export function executeCommit(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const message = command.message || "Unnamed commit";
  const targetBranchName = command.branchName || state.currentBranch;

  // If a specific branch is targeted, validate it exists
  if (command.branchName && !state.branches.has(command.branchName)) {
    return {
      success: false,
      message: `Branch '${command.branchName}' does not exist`,
    };
  }

  const targetBranch = state.branches.get(targetBranchName);
  if (!targetBranch) {
    return {
      success: false,
      message: `Branch '${targetBranchName}' not found`,
    };
  }

  // Allow initial commit even if there's no current commit
  const isInitialCommit = targetBranch.headCommitId === "";
  const parentCommitId = isInitialCommit ? null : targetBranch.headCommitId;

  // Create new commit
  const newCommitId = generateCommitId();
  const newCommit: Commit = {
    id: newCommitId,
    message,
    parentId: parentCommitId,
    author: "You",
    timestamp: Date.now(),
    branch: targetBranchName,
  };

  // Update state
  const newState = deepCloneGitState(state);
  newState.commits.set(newCommitId, newCommit);

  // If there was a pending squash merge on the current branch and we're committing to the current branch
  // consume it (clear the pending squash but don't treat this commit as a merge commit)
  if (
    state.pendingSquash &&
    targetBranchName === state.currentBranch &&
    newState.pendingSquash
  ) {
    newState.pendingSquash = null;
  }

  // Update target branch to point to new commit
  const newTargetBranch = newState.branches.get(targetBranchName);
  if (newTargetBranch) {
    newTargetBranch.headCommitId = newCommitId;
  }

  // Only update HEAD if committing to current branch
  if (targetBranchName === state.currentBranch) {
    newState.HEAD = newCommitId;
  }

  return {
    success: true,
    message: `[${targetBranchName} ${newCommitId}] ${message}`,
    newState,
  };
}
