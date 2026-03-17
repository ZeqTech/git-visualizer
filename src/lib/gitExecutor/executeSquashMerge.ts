import type { Branch, Commit, GitState } from "../gitState";
import { findMergeBase } from "./findMergeBase";
import type { ExecutionResult } from "./types";

/**
 * Helper: Execute squash merge (without committing)
 *
 * A squash merge does NOT create a commit immediately.
 * Instead, it stages the changes and stores the squash information.
 * The commit will be created when the user runs the next "git commit" command.
 */
export function executeSquashMerge(
  sourceBranchName: string,
  sourceBranch: Branch,
  state: GitState,
  newState: GitState,
): ExecutionResult {
  // Find merge base (common ancestor)
  const mergeBase = findMergeBase(state.HEAD, sourceBranch.headCommitId, state);

  // Collect all commits from source branch since merge base
  const commitsToSquash: Commit[] = [];
  const queue: string[] = [sourceBranch.headCommitId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) continue;
    if (currentId === mergeBase) continue;

    visited.add(currentId);
    const commit = state.commits.get(currentId);
    if (!commit) continue;

    commitsToSquash.push(commit);

    const parentIds =
      commit.parentIds || (commit.parentId ? [commit.parentId] : []);
    for (const parentId of parentIds) {
      if (parentId && !visited.has(parentId)) {
        queue.push(parentId);
      }
    }
  }

  if (commitsToSquash.length === 0) {
    return {
      success: true,
      message: `Already up to date with '${sourceBranchName}'`,
      newState,
    };
  }

  // Store pending squash - do NOT create a commit
  // The commit will be created when the user runs the next "git commit" command
  newState.pendingSquash = {
    sourceBranchName,
    sourceBranchHeadId: sourceBranch.headCommitId,
    combinedMessage: commitsToSquash
      .reverse()
      .map((c) => c.message)
      .join(" -> "),
    commitCount: commitsToSquash.length,
  };

  return {
    success: true,
    message: `Squash merged '${sourceBranchName}' into '${state.currentBranch}' (${commitsToSquash.length} commit${commitsToSquash.length > 1 ? "s" : ""} staged for commit)`,
    newState,
  };
}
