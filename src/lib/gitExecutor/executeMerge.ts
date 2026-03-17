import type { ParsedCommand } from "../gitParser";
import { gitConfig } from "../gitGraphConfig";
import { generateCommitId, type Commit, type GitState } from "../gitState";
import { deepCloneGitState } from "./deepCloneGitState";
import { executeSquashMerge } from "./executeSquashMerge";
import { isAncestor } from "./isAncestor";
import type { ExecutionResult } from "./types";

/**
 * Execute: git merge <branch> | git merge --squash <branch>
 * Merges another branch into the current branch
 */
export function executeMerge(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const sourceBranchName = command.targetBranch;

  if (!sourceBranchName) {
    return {
      success: false,
      message: "Branch name required for merge",
    };
  }

  if (sourceBranchName === state.currentBranch) {
    return {
      success: false,
      message: "Cannot merge a branch into itself",
    };
  }

  const sourceBranch = state.branches.get(sourceBranchName);
  if (!sourceBranch) {
    return {
      success: false,
      message: `Branch '${sourceBranchName}' does not exist`,
    };
  }

  const newState = deepCloneGitState(state);

  // Check if this can be a fast-forward merge
  // Fast-forward: current branch is an ancestor of source branch
  const canFastForward = isAncestor(
    state.HEAD,
    sourceBranch.headCommitId,
    state,
  );

  // Handle squash merge
  if (command.squash) {
    return executeSquashMerge(sourceBranchName, sourceBranch, state, newState);
  }

  // Handle fast-forward merge
  if (canFastForward) {
    const currentBranch = newState.branches.get(state.currentBranch);
    if (currentBranch) {
      currentBranch.headCommitId = sourceBranch.headCommitId;
    }
    newState.HEAD = sourceBranch.headCommitId;

    return {
      success: true,
      message: `Fast-forward merged '${sourceBranchName}' into '${state.currentBranch}'`,
      newState,
    };
  }

  // Create a regular merge commit
  const mergeCommitId = generateCommitId();
  const mergeCommit: Commit = {
    id: mergeCommitId,
    message: `Merge branch '${sourceBranchName}' into '${state.currentBranch}'`,
    parentId: state.HEAD, // Keep for backwards compatibility
    parentIds: [state.HEAD, sourceBranch.headCommitId], // Store both parents for merge visualization
    author: "You",
    timestamp: Date.now(),
    branch: state.currentBranch,
    mergeType: gitConfig.MERGE_TYPE,
  };

  newState.commits.set(mergeCommitId, mergeCommit);

  // Update current branch to point to merge commit
  const currentBranch = newState.branches.get(state.currentBranch);
  if (currentBranch) {
    currentBranch.headCommitId = mergeCommitId;
  }

  newState.HEAD = mergeCommitId;

  return {
    success: true,
    message: `Merged '${sourceBranchName}' into '${state.currentBranch}'`,
    newState,
  };
}
