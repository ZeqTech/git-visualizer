/**
 * Git State Model
 * Defines the data structures and types for representing git repository state
 */

/**
 * Represents a single commit in the git repository
 */
export interface Commit {
  id: string; // Unique commit hash (SHA-like)
  message: string;
  parentId: string | null; // null for initial commit (deprecated, use parentIds)
  parentIds?: string[]; // Parent commit IDs (supports merge commits with multiple parents)
  author: string;
  timestamp: number; // milliseconds
  branch?: string; // Branch this commit was created on
  mergeType?: "merge" | "rebase" | "squash"; // Type of merge operation
}

/**
 * Represents a branch pointer
 */
export interface Branch {
  name: string;
  headCommitId: string; // Points to the commit this branch is on
  createdAt: number;
}

/**
 * Represents a tag pointing to a specific commit
 */
export interface Tag {
  name: string;
  commitId: string;
  createdAt: number;
}

/**
 * Represents a pending squash merge waiting for commit
 */
export interface PendingSquash {
  sourceBranchName: string;
  sourceBranchHeadId: string;
  combinedMessage: string;
  commitCount: number;
}

/**
 * Represents the complete state of a git repository
 */
export interface GitState {
  commits: Map<string, Commit>; // commitId -> Commit
  branches: Map<string, Branch>; // branchName -> Branch
  tags: Map<string, Tag>; // tagName -> Tag
  currentBranch: string; // Name of currently checked out branch
  HEAD: string; // Current commit id
  pendingSquash?: PendingSquash | null;
}

/**
 * Represents a visual position of a commit in the graph
 */
export interface CommitNode {
  commit: Commit;
  x: number; // Horizontal position (branch column)
  y: number; // Vertical position (commit depth/time)
  branch: string;
}

/**
 * Represents a line connecting commits (parent-child relationship)
 */
export interface CommitEdge {
  fromCommitId: string;
  toCommitId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

/**
 * Initialize a new git repository with initial commit
 */
export function createInitialGitState(): GitState {
  const initialCommitId = generateCommitId();
  const initialCommit: Commit = {
    id: initialCommitId,
    message: "Initial commit",
    parentId: null,
    author: "You",
    timestamp: Date.now(),
    branch: "main",
  };

  const mainBranch: Branch = {
    name: "main",
    headCommitId: initialCommitId,
    createdAt: Date.now(),
  };

  return {
    commits: new Map([[initialCommitId, initialCommit]]),
    branches: new Map([["main", mainBranch]]),
    tags: new Map(),
    currentBranch: "main",
    HEAD: initialCommitId,
    pendingSquash: null,
  };
}

/**
 * Initialize a new empty git repository with no commits
 * User must create the first commit manually
 */
export function createEmptyGitState(): GitState {
  const mainBranch: Branch = {
    name: "main",
    headCommitId: "", // No commit yet
    createdAt: Date.now(),
  };

  return {
    commits: new Map(),
    branches: new Map([["main", mainBranch]]),
    tags: new Map(),
    currentBranch: "main",
    HEAD: "", // No HEAD until first commit
    pendingSquash: null,
  };
}

/**
 * Generate a commit-like ID (simplified SHA)
 */
export function generateCommitId(): string {
  return Math.random().toString(16).substring(2, 10).toUpperCase();
}

/**
 * Get all commits in topological order (parents before children)
 */
export function getCommitsInOrder(state: GitState): Commit[] {
  const commits = Array.from(state.commits.values());
  return commits.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get all branch names
 */
export function getBranchNames(state: GitState): string[] {
  return Array.from(state.branches.keys());
}

/**
 * Get current commit
 */
export function getCurrentCommit(state: GitState): Commit | undefined {
  return state.commits.get(state.HEAD);
}

/**
 * Get current branch
 */
export function getCurrentBranch(state: GitState): Branch | undefined {
  return state.branches.get(state.currentBranch);
}

/**
 * Get all commits for a specific branch (commits reachable from branch HEAD)
 */
export function getCommitsForBranch(state: GitState, branchName: string): Commit[] {
  const branch = state.branches.get(branchName);
  if (!branch) return [];

  const commits: Commit[] = [];
  let currentId: string | null = branch.headCommitId;

  while (currentId) {
    const commit = state.commits.get(currentId);
    if (!commit) break;
    commits.push(commit);
    currentId = commit.parentId;
  }

  return commits.reverse(); // Return in chronological order
}

/**
 * Build the commit graph for visualization
 * Returns nodes positioned and edges connecting them
 * Branches alternate left/right positioning
 */
export function buildCommitGraph(state: GitState, firstBranchDirection: 'left' | 'right' = 'right'): {
  nodes: CommitNode[];
  edges: CommitEdge[];
} {
  const nodes: CommitNode[] = [];
  const edges: CommitEdge[] = [];

  // Get commits in chronological order
  const commits = getCommitsInOrder(state);

  // Map branch names to column positions
  const branchColumns: Map<string, number> = new Map();

  // Sort branches by creation time to ensure consistent ordering
  const sortedBranches = Array.from(state.branches.values()).sort(
    (a, b) => a.createdAt - b.createdAt
  );

  const getParentIds = (commit: Commit): string[] => {
    if (commit.parentIds && commit.parentIds.length > 0) return commit.parentIds;
    return commit.parentId ? [commit.parentId] : [];
  };

  const headToBranch: Map<string, string> = new Map();
  for (const branch of sortedBranches) {
    if (branch.name === "main") continue;
    if (!branch.headCommitId) continue;
    headToBranch.set(branch.headCommitId, branch.name);
  }

  const mergedAtByBranch: Map<string, number> = new Map();
  for (const commit of commits) {
    const parentIds = getParentIds(commit);
    for (const parentId of parentIds) {
      const branchName = headToBranch.get(parentId);
      if (!branchName) continue;
      if (!mergedAtByBranch.has(branchName)) {
        mergedAtByBranch.set(branchName, commit.timestamp);
      }
    }
  }

  const mergeReleaseQueue = Array.from(mergedAtByBranch.entries())
    .map(([branchName, mergedAt]) => ({ branchName, mergedAt }))
    .sort((a, b) => a.mergedAt - b.mergedAt);

  // Generate a sequence of column positions based on direction
  // This allows us to reuse positions as branches are deleted
  const generateColumnPosition = (index: number, direction: 'left' | 'right'): number => {
    if (index === 0) return 0; // Main branch always at center

    // Generate alternating positions: direction goes first, then opposite
    const level = Math.ceil(index / 2);
    const isSecondHalf = index % 2 === 0;

    if (direction === 'right') {
      return isSecondHalf ? -level : level;
    } else {
      return isSecondHalf ? level : -level;
    }
  };

  // Assign columns to branches in creation order
  // Merged branches release their slot so new branches can reuse it
  const availableSlotIndices: number[] = [];
  const branchSlotIndex: Map<string, number> = new Map();
  let nextSlotIndex = 1;
  let releaseIndex = 0;

  sortedBranches.forEach((branch) => {
    while (
      releaseIndex < mergeReleaseQueue.length &&
      mergeReleaseQueue[releaseIndex].mergedAt < branch.createdAt
    ) {
      const releaseBranchName = mergeReleaseQueue[releaseIndex].branchName;
      const slotToRelease = branchSlotIndex.get(releaseBranchName);
      if (slotToRelease !== undefined) {
        availableSlotIndices.push(slotToRelease);
        availableSlotIndices.sort((a, b) => a - b);
      }
      releaseIndex += 1;
    }

    let slotIndex = 0;
    if (branch.name !== "main") {
      slotIndex = availableSlotIndices.shift() ?? nextSlotIndex;
      if (slotIndex === nextSlotIndex) nextSlotIndex += 1;
    }

    branchSlotIndex.set(branch.name, slotIndex);
    const columnPosition = generateColumnPosition(slotIndex, firstBranchDirection);
    branchColumns.set(branch.name, columnPosition);
  });

  // Create nodes with positions
  const commitIdToNode: Map<string, CommitNode> = new Map();
  const depthCache: Map<string, number> = new Map();

  const getCommitDepthInternal = (commitId: string): number => {
    const cached = depthCache.get(commitId);
    if (cached !== undefined) return cached;

    const commit = state.commits.get(commitId);
    if (!commit) return 0;

    const parentIds = getParentIds(commit);
    if (parentIds.length === 0) {
      depthCache.set(commitId, 0);
      return 0;
    }

    const maxParentDepth = Math.max(
      ...parentIds.map((parentId) => getCommitDepthInternal(parentId))
    );
    const depth = maxParentDepth + 1;
    depthCache.set(commitId, depth);
    return depth;
  };

  // Build a map of which commits belong to which existing branches
  // by walking back from each branch head (first-parent only)
  const commitToBranch: Map<string, string> = new Map();
  for (const branch of sortedBranches) {
    let currentId: string | null = branch.headCommitId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      // Only assign if not already assigned (first branch wins)
      if (!commitToBranch.has(currentId)) {
        commitToBranch.set(currentId, branch.name);
      }

      const commit = state.commits.get(currentId);
      if (!commit) break;

      const parentId = commit.parentId ?? commit.parentIds?.[0] ?? null;
      currentId = parentId;
    }
  }

  // Calculate y position based on max parent depth
  for (const commit of commits) {
    // Use the computed branch ownership, fallback to stored branch, then current branch
    const branchName = commitToBranch.get(commit.id) || commit.branch || state.currentBranch;
    const xPosition = branchColumns.get(branchName) || 0;
    const yPosition = getCommitDepthInternal(commit.id);

    const node: CommitNode = {
      commit,
      x: xPosition,
      y: yPosition,
      branch: branchName,
    };

    nodes.push(node);
    commitIdToNode.set(commit.id, node);
  }

  // Create edges connecting parent to child
  for (const node of nodes) {
    // Support both old parentId and new parentIds array
    const parentIds = node.commit.parentIds || (node.commit.parentId ? [node.commit.parentId] : []);

    for (const parentId of parentIds) {
      const parentNode = commitIdToNode.get(parentId);
      if (parentNode) {
        edges.push({
          fromCommitId: parentId,
          toCommitId: node.commit.id,
          fromX: parentNode.x,
          fromY: parentNode.y,
          toX: node.x,
          toY: node.y,
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Check if a commit is the HEAD of any branch
 */
export function isCommitBranchHead(state: GitState, commitId: string): string[] {
  const branches: string[] = [];
  for (const [branchName, branch] of state.branches) {
    if (branch.headCommitId === commitId) {
      branches.push(branchName);
    }
  }
  return branches;
}

/**
 * Check if a commit has a tag
 */
export function getCommitTags(state: GitState, commitId: string): Tag[] {
  return Array.from(state.tags.values()).filter((tag) => tag.commitId === commitId);
}

/**
 * Calculate the depth of a commit (distance from initial commit)
 */
export function getCommitDepth(state: GitState, commitId: string): number {
  let depth = 0;
  let currentId: string | null = commitId;

  while (currentId) {
    const commit = state.commits.get(currentId);
    if (!commit) break;
    currentId = commit.parentId;
    if (currentId) depth++;
  }

  return depth;
}
/**
 * Validate squash merge constraints
 *
 * Rules:
 * 1. No commits should have mergeType "squash" (squash merges create no commit node)
 * 2. A squash operation must be finalized by exactly one commit
 * 3. Squash commits must be linear (single parent)
 *
 * Returns validation result with any errors found
 */
export function validateSquashMerges(state: GitState): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check 1: No commits should have mergeType "squash"
  for (const commit of state.commits.values()) {
    if (commit.mergeType === "squash") {
      errors.push(
        `ERROR: Squash merge commit found (id: ${commit.id}). ` +
        `Squash merges must not create labeled commit nodes.`
      );
    }
  }

  // Check 2: Pending squash must be finalized by next commit
  // This is enforced by executeCommit, so just warn if pending exists
  if (state.pendingSquash) {
    errors.push(
      `WARNING: Pending squash merge staged but not yet committed. ` +
      `Run "git commit" to finalize the squash merge.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
