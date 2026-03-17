import type { ParsedCommand } from "../gitParser";
import {
  generateCommitId,
  getCommitsForBranch,
  type Commit,
  type GitState,
} from "../gitState";
import { deepCloneGitState } from "./deepCloneGitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git squash <branch>
 * Squashes all commits on current branch since diverging from target branch into a single commit
 */
export function executeSquash(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const targetBranchName = command.targetBranch;

  if (!targetBranchName) {
    return {
      success: false,
      message: "Branch name required for squash",
    };
  }

  if (targetBranchName === state.currentBranch) {
    return {
      success: false,
      message: "Cannot squash a branch onto itself",
    };
  }

  const targetBranch = state.branches.get(targetBranchName);
  if (!targetBranch) {
    return {
      success: false,
      message: `Branch '${targetBranchName}' does not exist`,
    };
  }

  const newState = deepCloneGitState(state);
  const currentBranch = newState.branches.get(state.currentBranch);
  if (!currentBranch) {
    return {
      success: false,
      message: "Current branch not found",
    };
  }

  // Get all commits in current branch
  const currentBranchCommits = getCommitsForBranch(state, state.currentBranch);
  if (currentBranchCommits.length === 0) {
    return {
      success: false,
      message: "No commits to squash",
    };
  }

  // Get all commits in target branch
  const targetBranchCommits = getCommitsForBranch(state, targetBranchName);
  const targetBranchCommitIds = new Set(targetBranchCommits.map((c) => c.id));

  // Walk current branch back to the merge base and collect unique commits
  const uniqueCommits: Commit[] = [];
  let baseCommitId: string | null = null;
  let cursorId: string | null = currentBranch.headCommitId;

  while (cursorId) {
    const commit = state.commits.get(cursorId);
    if (!commit) break;

    if (targetBranchCommitIds.has(commit.id)) {
      baseCommitId = commit.id;
      break;
    }

    uniqueCommits.push(commit);
    cursorId = commit.parentId;
  }

  uniqueCommits.reverse();

  if (uniqueCommits.length === 0) {
    return {
      success: true,
      message: `'${state.currentBranch}' is already up to date with '${targetBranchName}'`,
      newState,
    };
  }

  // Create a single squashed commit with all the combined messages
  const squashedCommitId = generateCommitId();
  const combinedMessage = uniqueCommits.map((c) => c.message).join(" -> ");

  const squashedCommit: Commit = {
    id: squashedCommitId,
    message: combinedMessage,
    parentId: baseCommitId || targetBranch.headCommitId,
    author: "You",
    timestamp: Date.now(),
    branch: state.currentBranch,
    mergeType: "squash",
  };

  newState.commits.set(squashedCommitId, squashedCommit);

  // Remove the original unique commits from map (optional, but keeps graph clean)
  // This ensures they don't appear in visualization
  for (const commit of uniqueCommits) {
    newState.commits.delete(commit.id);
  }

  // Update current branch to point to squashed commit
  currentBranch.headCommitId = squashedCommitId;
  newState.HEAD = squashedCommitId;

  return {
    success: true,
    message: `Squashed ${uniqueCommits.length} commit(s) into 1`,
    newState,
  };
}
