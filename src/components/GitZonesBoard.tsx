"use client";

import React from "react";
import type { GitTreeState } from "@/lib/gitTreeState";

interface GitZonesBoardProps {
  tree: GitTreeState;
  onCreateFile?: () => void;
  onEditFile?: () => void;
  onStageFiles?: () => void;
  onCommitFiles?: () => void;
  onStashFiles?: () => void;
  onPopStash?: () => void;
  onRestoreStaged?: () => void;
  onDiscardChanges?: () => void;
}

const statusClass: Record<string, string> = {
  U: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  M: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  A: "bg-sky-500/20 text-sky-300 border-sky-500/30",
};

const zoneCardClass =
  "rounded-xl border border-slate-700 bg-slate-900/80 shadow-lg shadow-black/20";

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass[status] ?? "bg-slate-700 text-slate-300 border-slate-600"
        }`}
    >
      {status}
    </span>
  );
}

function ZoneHeader({
  title,
  count,
  subtitle,
}: {
  title: string;
  count: number;
  subtitle: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
        {count}
      </span>
    </div>
  );
}

export function GitZonesBoard({
  tree,
  onCreateFile,
  onEditFile,
  onStageFiles,
  onCommitFiles,
  onStashFiles,
  onPopStash,
  onRestoreStaged,
  onDiscardChanges,
}: GitZonesBoardProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Git Architecture</h2>
          <p className="text-sm text-slate-400">
            Working Directory → Index → Local Repository → Stash
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700" onClick={onCreateFile} type="button">
            Create file
          </button>
          <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700" onClick={onEditFile} type="button">
            Edit file
          </button>
          <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700" onClick={onStageFiles} type="button">
            git add
          </button>
          <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700" onClick={onCommitFiles} type="button">
            git commit
          </button>
          <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700" onClick={onStashFiles} type="button">
            git stash
          </button>
          <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700" onClick={onPopStash} type="button">
            stash pop
          </button>
          <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700" onClick={onRestoreStaged} type="button">
            restore --staged
          </button>
          <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700" onClick={onDiscardChanges} type="button">
            restore
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
        <section className={zoneCardClass}>
          <ZoneHeader
            title="Working Directory"
            count={tree.workingDirectory.length}
            subtitle="Untracked and modified files"
          />
          <div className="max-h-56 space-y-2 overflow-auto p-4">
            {tree.workingDirectory.length === 0 ? (
              <p className="text-sm text-slate-500">No local changes</p>
            ) : (
              tree.workingDirectory.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">{file.name}</p>
                    <p className="text-xs text-slate-500">{file.path}</p>
                  </div>
                  <StatusChip status={file.status} />
                </div>
              ))
            )}
          </div>
        </section>

        <section className={zoneCardClass}>
          <ZoneHeader
            title="Staging Area / Index"
            count={tree.index.length}
            subtitle="Ready for the next commit"
          />
          <div className="max-h-56 space-y-2 overflow-auto p-4">
            {tree.index.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing staged</p>
            ) : (
              tree.index.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">{file.name}</p>
                    <p className="text-xs text-slate-500">{file.path}</p>
                  </div>
                  <StatusChip status={file.status} />
                </div>
              ))
            )}
          </div>
        </section>

        <section className={zoneCardClass}>
          <ZoneHeader
            title="Local Repository"
            count={tree.repoCommits.length}
            subtitle="Committed snapshots"
          />
          <div className="max-h-56 space-y-2 overflow-auto p-4">
            {tree.repoCommits.length === 0 ? (
              <p className="text-sm text-slate-500">No commits yet</p>
            ) : (
              tree.repoCommits.map((commit) => (
                <div
                  key={commit.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{commit.message}</p>
                      <p className="text-xs text-slate-500">{commit.id}</p>
                    </div>
                    <span className="rounded-full bg-indigo-500/15 px-2 py-1 text-[11px] font-semibold text-indigo-300">
                      {commit.files.length} files
                    </span>
                  </div>
                  {commit.files.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {commit.files.map((file) => (
                        <span
                          key={`${commit.id}-${file.path}`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300"
                        >
                          <StatusChip status={file.status} />
                          {file.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className={zoneCardClass}>
          <ZoneHeader
            title="Stash Area"
            count={tree.stashEntries.length}
            subtitle="Shelved working tree snapshots"
          />
          <div className="max-h-56 space-y-2 overflow-auto p-4">
            {tree.stashEntries.length === 0 ? (
              <p className="text-sm text-slate-500">No stash entries</p>
            ) : (
              tree.stashEntries.map((stash) => (
                <div
                  key={stash.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{stash.message}</p>
                      <p className="text-xs text-slate-500">{stash.id}</p>
                    </div>
                    <span className="rounded-full bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-300">
                      {stash.files.length} files
                    </span>
                  </div>
                  {stash.files.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {stash.files.map((file) => (
                        <span
                          key={`${stash.id}-${file.path}`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300"
                        >
                          <StatusChip status={file.status} />
                          {file.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
