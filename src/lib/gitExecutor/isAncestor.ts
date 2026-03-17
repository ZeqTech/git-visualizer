import type { GitState } from "../gitState";

/**
 * Helper: Check if commitId is an ancestor of descendantId
 */
export function isAncestor(
  commitId: string,
  descendantId: string,
  state: GitState,
): boolean {
  if (commitId === descendantId) return true;

  const queue: string[] = [descendantId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) continue;

    visited.add(currentId);
    if (currentId === commitId) return true;

    const commit = state.commits.get(currentId);
    if (!commit) continue;

    const parentIds =
      commit.parentIds || (commit.parentId ? [commit.parentId] : []);
    for (const parentId of parentIds) {
      if (parentId && !visited.has(parentId)) {
        queue.push(parentId);
      }
    }
  }

  return false;
}
