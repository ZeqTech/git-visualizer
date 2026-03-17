import type { GitState } from "../gitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git branch
 * Lists all branches
 */
export function executeBranchList(state: GitState): ExecutionResult {
  const branches = Array.from(state.branches.keys());
  const branchList = branches
    .map((name) => (name === state.currentBranch ? `* ${name}` : `  ${name}`))
    .join("\n");

  return {
    success: true,
    message: branchList || "No branches",
  };
}
