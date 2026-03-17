import type { GitState } from "../gitState";

/**
 * Helper: Find merge base (common ancestor) of two commits
 */
export function findMergeBase(
  commit1Id: string,
  commit2Id: string,
  state: GitState,
): string | null {
  // Get all ancestors of commit1
  const ancestors1 = new Set<string>();
  const queue1: string[] = [commit1Id];

  while (queue1.length > 0) {
    const currentId = queue1.shift();
    if (!currentId || ancestors1.has(currentId)) continue;

    ancestors1.add(currentId);
    const commit = state.commits.get(currentId);
    if (!commit) continue;

    const parentIds =
      commit.parentIds || (commit.parentId ? [commit.parentId] : []);
    queue1.push(...parentIds.filter((p) => p));
  }

  // Walk back from commit2 and find first ancestor in common
  const queue2: string[] = [commit2Id];
  const visited2 = new Set<string>();

  while (queue2.length > 0) {
    const currentId = queue2.shift();
    if (!currentId || visited2.has(currentId)) continue;

    visited2.add(currentId);
    if (ancestors1.has(currentId)) return currentId;

    const commit = state.commits.get(currentId);
    if (!commit) continue;

    const parentIds =
      commit.parentIds || (commit.parentId ? [commit.parentId] : []);
    queue2.push(...parentIds.filter((p) => p));
  }

  return null;
}
