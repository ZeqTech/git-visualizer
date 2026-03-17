import type { ParsedCommand } from "../gitParser";
import { getCommitsForBranch, type Commit, type GitState } from "../gitState";
import { deepCloneGitState } from "./deepCloneGitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git rebase <branch>
 * Rebases the current branch onto another branch
 * This moves all commits from the current branch on top of the target branch
 */
export function executeRebase(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const targetBranchName = command.targetBranch;

  if (!targetBranchName) {
    return {
      success: false,
      message: "Branch name required for rebase",
    };
  }

  if (targetBranchName === state.currentBranch) {
    return {
      success: false,
      message: "Cannot rebase a branch onto itself",
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
      message: `Current branch not found`,
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

  void baseCommitId;

  uniqueCommits.reverse();

  if (uniqueCommits.length === 0) {
    return {
      success: true,
      message: `'${state.currentBranch}' is already up to date with '${targetBranchName}'`,
      newState,
    };
  }

  // Rewrite parent references of unique commits to be on top of target branch
  let newParentId = targetBranch.headCommitId;

  for (const commit of uniqueCommits) {
    const updatedCommit = newState.commits.get(commit.id);
    if (updatedCommit) {
      updatedCommit.parentId = newParentId;
      updatedCommit.branch = state.currentBranch;
      updatedCommit.mergeType = "rebase";
      newParentId = commit.id;
    }
  }

  // Update current branch to point to the last rebased commit
  currentBranch.headCommitId = uniqueCommits[uniqueCommits.length - 1].id;
  newState.HEAD = uniqueCommits[uniqueCommits.length - 1].id;

  return {
    success: true,
    message: `Rebased '${state.currentBranch}' onto '${targetBranchName}'`,
    newState,
  };
}
