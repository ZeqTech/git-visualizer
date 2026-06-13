import { getCurrentCommit, type GitState } from "../gitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git status
 * Shows repository status
 */
export function executeStatus(state: GitState): ExecutionResult {
  const currentCommit = getCurrentCommit(state);

  let status = `On branch ${state.currentBranch}\n`;
  if (currentCommit) {
    status += `Current commit: ${currentCommit.id} - ${currentCommit.message}\n`;
  }
  status += `Total commits: ${state.commits.size}\n`;
  status += `Total branches: ${state.branches.size}`;
  status += `\nWorking files: ${state.tree.workingDirectory.length}`;
  status += `\nStaged files: ${state.tree.index.length}`;
  status += `\nStash entries: ${state.tree.stashEntries.length}`;

  return {
    success: true,
    message: status,
  };
}
