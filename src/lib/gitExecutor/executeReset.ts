import type { ParsedCommand } from "../gitParser";
import type { GitState } from "../gitState";
import { deepCloneGitState } from "./deepCloneGitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git reset --hard|--soft HEAD~N
 */
export function executeReset(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const mode = command.resetMode;
  const target = command.resetTarget;

  if (!mode || !target) {
    return {
      success: false,
      message: "Reset requires mode and target (e.g. git reset --hard HEAD~1)",
    };
  }

  const currentBranch = state.branches.get(state.currentBranch);
  if (!currentBranch || !currentBranch.headCommitId) {
    return {
      success: false,
      message: "Cannot reset: current branch has no commits",
    };
  }

  const match = /^HEAD(?:~(\d+))?$/.exec(target);
  if (!match) {
    return {
      success: false,
      message: "Only HEAD or HEAD~<n> targets are supported",
    };
  }

  const steps = match[1] ? Number.parseInt(match[1], 10) : 0;
  let nextHeadId: string | null = currentBranch.headCommitId;

  for (let i = 0; i < steps; i += 1) {
    // @ts-ignore
    const commit = nextHeadId ? state.commits.get(nextHeadId) : undefined;
    if (!commit) {
      nextHeadId = null;
      break;
    }
    nextHeadId = commit.parentId ?? commit.parentIds?.[0] ?? null;
  }

  if (!nextHeadId) {
    return {
      success: false,
      message: `Cannot reset ${target}: target commit does not exist`,
    };
  }

  const newState = deepCloneGitState(state);
  const branchToMove = newState.branches.get(newState.currentBranch);

  if (!branchToMove) {
    return {
      success: false,
      message: "Current branch not found",
    };
  }

  branchToMove.headCommitId = nextHeadId;
  newState.HEAD = nextHeadId;

  if (mode === "--hard") {
    const reachable = new Set<string>();
    const stack: string[] = [];

    for (const branch of newState.branches.values()) {
      if (branch.headCommitId) stack.push(branch.headCommitId);
    }
    for (const tag of newState.tags.values()) {
      if (tag.commitId) stack.push(tag.commitId);
    }

    while (stack.length > 0) {
      const commitId = stack.pop();
      if (!commitId || reachable.has(commitId)) continue;
      const commit = newState.commits.get(commitId);
      if (!commit) continue;

      reachable.add(commitId);
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

    newState.commits = new Map(
      Array.from(newState.commits.entries()).filter(([id]) => reachable.has(id)),
    );

    newState.tags = new Map(
      Array.from(newState.tags.entries()).filter(([, tag]) =>
        newState.commits.has(tag.commitId),
      ),
    );
  }

  return {
    success: true,
    message: `Reset current branch to ${target} (${mode})`,
    newState,
  };
}
