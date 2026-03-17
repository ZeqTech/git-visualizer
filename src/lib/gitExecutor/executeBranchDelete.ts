import type { ParsedCommand } from "../gitParser";
import type { GitState } from "../gitState";
import { deepCloneGitState } from "./deepCloneGitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git branch -d <name> or git branch -D <name>
 * Deletes a branch (-d: only if fully merged, -D: force delete)
 */
export function executeBranchDelete(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const branchName = command.branchName;
  const forceDelete = command.force === true;

  if (!branchName) {
    return {
      success: false,
      message: "Branch name required",
    };
  }

  if (branchName === state.currentBranch) {
    return {
      success: false,
      message: `Cannot delete branch '${branchName}' (currently checked out)`,
    };
  }

  if (!state.branches.has(branchName)) {
    return {
      success: false,
      message: `Branch '${branchName}' does not exist`,
    };
  }

  const branchToDelete = state.branches.get(branchName);
  if (!branchToDelete) {
    return {
      success: false,
      message: `Branch '${branchName}' not found`,
    };
  }

  // Only check merge status if not force deleting
  if (!forceDelete) {
    // Check if the branch has been merged into another branch
    // A branch is considered merged if its head commit is reachable from any other branch
    const branchHeadId = branchToDelete.headCommitId;
    let isMerged = false;

    for (const [otherBranchName, otherBranch] of state.branches) {
      if (otherBranchName === branchName) continue;

      // Walk back from other branch head to see if we find this branch's head
      // Use a queue to check all parents (BFS approach)
      const queue: string[] = [otherBranch.headCommitId];
      const visited = new Set<string>();

      while (queue.length > 0 && !isMerged) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;

        visited.add(currentId);
        if (currentId === branchHeadId) {
          isMerged = true;
          break;
        }

        const commit = state.commits.get(currentId);
        if (!commit) continue;

        // Check both parentId and parentIds for merge commits
        const parentIds =
          commit.parentIds || (commit.parentId ? [commit.parentId] : []);

        // Add ALL parents to the queue to check all paths
        for (const parentId of parentIds) {
          if (parentId && !visited.has(parentId)) {
            queue.push(parentId);
          }
        }
      }

      if (isMerged) break;
    }

    if (!isMerged) {
      return {
        success: false,
        message: `error: The branch '${branchName}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${branchName}'.`,
      };
    }
  }

  const newState = deepCloneGitState(state);
  newState.branches.delete(branchName);

  return {
    success: true,
    message: `Deleted branch '${branchName}' ${forceDelete ? "(force)" : ""}`,
    newState,
  };
}
