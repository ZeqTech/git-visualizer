import type { GitState } from "../gitState";

/**
 * Deep clone the entire GitState to avoid mutations
 */
export function deepCloneGitState(state: GitState): GitState {
  return {
    commits: new Map(state.commits),
    branches: new Map(
      Array.from(state.branches.entries()).map(([name, branch]) => [
        name,
        { ...branch },
      ]),
    ),
    tags: new Map(
      Array.from(state.tags.entries()).map(([name, tag]) => [name, { ...tag }]),
    ),
    currentBranch: state.currentBranch,
    HEAD: state.HEAD,
  };
}
