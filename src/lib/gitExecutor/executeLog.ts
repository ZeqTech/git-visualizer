import type { ParsedCommand } from "../gitParser";
import type { Commit, GitState } from "../gitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git log
 * Shows commit history
 */
export function executeLog(command: ParsedCommand, state: GitState): ExecutionResult {
  const branch = state.branches.get(state.currentBranch);
  const headId = branch?.headCommitId;

  if (!headId) {
    return {
      success: true,
      message: "No commits in current branch",
    };
  }

  const visited = new Set<string>();
  const stack = [headId];
  const commits: Commit[] = [];

  while (stack.length > 0) {
    const commitId = stack.pop();
    if (!commitId || visited.has(commitId)) continue;

    const commit = state.commits.get(commitId);
    if (!commit) continue;

    visited.add(commitId);
    commits.push(commit);

    const parentIds =
      commit.parentIds && commit.parentIds.length > 0
        ? commit.parentIds
        : commit.parentId
          ? [commit.parentId]
          : [];

    for (const parentId of parentIds) {
      stack.push(parentId);
    }
  }

  commits.sort((a, b) => b.timestamp - a.timestamp);

  if (commits.length === 0) {
    return {
      success: true,
      message: "No commits in current branch",
    };
  }

  const log = command.oneline
    ? commits
        .map((commit) => {
          const isHead = commit.id === state.HEAD;
          const headDecoration = isHead
            ? ` (HEAD -> ${state.currentBranch})`
            : "";
          return `${commit.id}${headDecoration} ${commit.message}`;
        })
        .join("\n")
    : commits
        .map((commit) => {
          const date = new Date(commit.timestamp).toLocaleString();
          return [
            `commit ${commit.id}`,
            `Author: ${commit.author}`,
            `Date:   ${date}`,
            "",
            `    ${commit.message}`,
          ].join("\n");
        })
        .join("\n\n");

  return {
    success: true,
    message: log,
  };
}
