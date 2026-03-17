import { getCommitsForBranch, type GitState } from "../gitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git log
 * Shows commit history
 */
export function executeLog(state: GitState): ExecutionResult {
  const commits = getCommitsForBranch(state, state.currentBranch);

  if (commits.length === 0) {
    return {
      success: true,
      message: "No commits in current branch",
    };
  }

  const log = commits
    .reverse()
    .map((commit) => `${commit.id} - ${commit.message}`)
    .join("\n");

  return {
    success: true,
    message: log,
  };
}
