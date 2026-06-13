export type GitZone = "WORKING" | "INDEX" | "REPO" | "STASH";

export type GitFileStatus = "U" | "M" | "A";

export interface GitFileRecord {
  path: string;
  name: string;
  status: GitFileStatus;
  zone: GitZone;
  updatedAt: number;
  content?: string;
}

export interface GitCommitSnapshot {
  id: string;
  message: string;
  timestamp: number;
  files: GitFileRecord[];
}

export interface GitStashEntry {
  id: string;
  message: string;
  timestamp: number;
  files: GitFileRecord[];
}

export interface GitTreeState {
  workingDirectory: GitFileRecord[];
  index: GitFileRecord[];
  repoCommits: GitCommitSnapshot[];
  stashEntries: GitStashEntry[];
}

const getFileName = (path: string): string => {
  const trimmed = path.trim().replace(/^\.\//, "");
  if (!trimmed) return path.trim();
  const parts = trimmed.split("/");
  return parts[parts.length - 1] || trimmed;
};

const cloneFiles = (files: GitFileRecord[]): GitFileRecord[] =>
  files.map((file) => ({ ...file }));

const makeFileRecord = (
  path: string,
  status: GitFileStatus,
  zone: GitZone,
  content = "",
): GitFileRecord => ({
  path,
  name: getFileName(path),
  status,
  zone,
  updatedAt: Date.now(),
  content,
});

const toMap = (files: GitFileRecord[]): Map<string, GitFileRecord> =>
  new Map(files.map((file) => [file.path, { ...file }]));

const mapToArray = (map: Map<string, GitFileRecord>): GitFileRecord[] =>
  Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));

const normalizePaths = (paths: string[]): string[] =>
  Array.from(
    new Set(
      paths
        .map((path) => path.trim())
        .filter((path) => path.length > 0 && path !== "."),
    ),
  );

export function createEmptyGitTreeState(): GitTreeState {
  return {
    workingDirectory: [],
    index: [],
    repoCommits: [],
    stashEntries: [],
  };
}

export function cloneGitTreeState(tree: GitTreeState): GitTreeState {
  return {
    workingDirectory: cloneFiles(tree.workingDirectory),
    index: cloneFiles(tree.index),
    repoCommits: tree.repoCommits.map((commit) => ({
      ...commit,
      files: cloneFiles(commit.files),
    })),
    stashEntries: tree.stashEntries.map((stash) => ({
      ...stash,
      files: cloneFiles(stash.files),
    })),
  };
}

export function createOrEditWorkingFile(
  tree: GitTreeState,
  path: string,
  mode: "create" | "edit",
  options?: { content?: string; append?: boolean },
): GitTreeState {
  const nextTree = cloneGitTreeState(tree);
  const nextWorking = toMap(nextTree.workingDirectory);
  const nextIndex = toMap(nextTree.index);
  const normalizedPath = path.trim();

  if (!normalizedPath) return nextTree;

  const existingWorkingFile = nextWorking.get(normalizedPath);
  const nextContent = options?.append
    ? `${existingWorkingFile?.content ?? ""}${options.content ?? ""}`
    : options?.content ?? existingWorkingFile?.content ?? "";

  nextIndex.delete(normalizedPath);
  nextWorking.set(
    normalizedPath,
    makeFileRecord(
      normalizedPath,
      mode === "create" ? "U" : "M",
      "WORKING",
      nextContent,
    ),
  );

  nextTree.workingDirectory = mapToArray(nextWorking);
  nextTree.index = mapToArray(nextIndex);
  return nextTree;
}

export function deleteWorkingFile(tree: GitTreeState, path: string): GitTreeState {
  const nextTree = cloneGitTreeState(tree);
  const normalizedPath = path.trim();
  if (!normalizedPath) return nextTree;

  nextTree.workingDirectory = nextTree.workingDirectory.filter(
    (file) => file.path !== normalizedPath,
  );
  nextTree.index = nextTree.index.filter((file) => file.path !== normalizedPath);
  return nextTree;
}

export function stageFiles(tree: GitTreeState, paths: string[]): GitTreeState {
  const nextTree = cloneGitTreeState(tree);
  const nextWorking = toMap(nextTree.workingDirectory);
  const nextIndex = toMap(nextTree.index);
  const stageAll = paths.some((path) => path === ".");
  const targetPaths = stageAll
    ? Array.from(nextWorking.keys())
    : normalizePaths(paths);

  for (const path of targetPaths) {
    const workingFile = nextWorking.get(path);
    if (!workingFile) continue;

    nextWorking.delete(path);
    nextIndex.set(path, {
      ...workingFile,
      status: workingFile.status === "U" ? "A" : "M",
      zone: "INDEX",
      updatedAt: Date.now(),
    });
  }

  nextTree.workingDirectory = mapToArray(nextWorking);
  nextTree.index = mapToArray(nextIndex);
  return nextTree;
}

export function commitIndexFiles(
  tree: GitTreeState,
  commitId: string,
  message: string,
): GitTreeState {
  const nextTree = cloneGitTreeState(tree);
  const stagedFiles = cloneFiles(nextTree.index);

  if (stagedFiles.length === 0) return nextTree;

  const stagedPaths = new Set(stagedFiles.map((file) => file.path));
  nextTree.workingDirectory = nextTree.workingDirectory.filter(
    (file) => !stagedPaths.has(file.path),
  );
  nextTree.index = [];
  nextTree.repoCommits = [
    {
      id: commitId,
      message,
      timestamp: Date.now(),
      files: stagedFiles.map((file) => ({
        ...file,
        zone: "REPO",
        updatedAt: Date.now(),
      })),
    },
    ...nextTree.repoCommits,
  ];

  return nextTree;
}

export function stashTree(
  tree: GitTreeState,
  message: string,
): GitTreeState {
  const nextTree = cloneGitTreeState(tree);
  const files = [...nextTree.workingDirectory, ...nextTree.index].map((file) => ({
    ...file,
    zone: "STASH" as GitZone,
    updatedAt: Date.now(),
  }));

  if (files.length === 0) return nextTree;

  const stashEntry: GitStashEntry = {
    id: `stash@{${nextTree.stashEntries.length}}`,
    message,
    timestamp: Date.now(),
    files,
  };

  nextTree.workingDirectory = [];
  nextTree.index = [];
  nextTree.stashEntries = [stashEntry, ...nextTree.stashEntries];
  return nextTree;
}

export function popStashTree(
  tree: GitTreeState,
  applyIndex = false,
): GitTreeState {
  const nextTree = cloneGitTreeState(tree);
  const [stashEntry, ...rest] = nextTree.stashEntries;

  if (!stashEntry) return nextTree;

  const restoredFiles = stashEntry.files.map((file) => ({
    ...file,
    zone: (applyIndex ? "INDEX" : "WORKING") as GitZone,
    status: applyIndex ? (file.status === "U" ? "A" : "M") : file.status,
    updatedAt: Date.now(),
  }));

  if (applyIndex) {
    const nextIndex = toMap(nextTree.index);
    for (const file of restoredFiles) {
      nextIndex.set(file.path, file);
    }
    nextTree.index = mapToArray(nextIndex);
  } else {
    const nextWorking = toMap(nextTree.workingDirectory);
    for (const file of restoredFiles) {
      nextWorking.set(file.path, file);
    }
    nextTree.workingDirectory = mapToArray(nextWorking);
  }

  nextTree.stashEntries = rest;
  return nextTree;
}

export function restoreStagedFiles(
  tree: GitTreeState,
  paths: string[],
): GitTreeState {
  const nextTree = cloneGitTreeState(tree);
  const nextIndex = toMap(nextTree.index);
  const nextWorking = toMap(nextTree.workingDirectory);
  const targetPaths = normalizePaths(paths);

  for (const path of targetPaths) {
    const stagedFile = nextIndex.get(path);
    if (!stagedFile) continue;

    nextIndex.delete(path);
    nextWorking.set(path, {
      ...stagedFile,
      zone: "WORKING",
      status: stagedFile.status === "A" ? "U" : "M",
      updatedAt: Date.now(),
    });
  }

  nextTree.index = mapToArray(nextIndex);
  nextTree.workingDirectory = mapToArray(nextWorking);
  return nextTree;
}

export function restoreWorkingFiles(
  tree: GitTreeState,
  paths: string[],
): GitTreeState {
  const nextTree = cloneGitTreeState(tree);
  const targetPaths = normalizePaths(paths);
  const targetSet = new Set(targetPaths);

  nextTree.workingDirectory = nextTree.workingDirectory.filter(
    (file) => !targetSet.has(file.path),
  );

  return nextTree;
}
