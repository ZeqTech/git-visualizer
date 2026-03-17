/**
 * Git Parser Types
 * Shared type definitions for git command parsing
 */

export type GitCommandType =
  | "commit"
  | "add"
  | "branch"
  | "branch-delete"
  | "branch-list"
  | "checkout"
  | "switch"
  | "merge"
  | "rebase"
  | "squash"
  | "reset"
  | "tag"
  | "pull"
  | "log"
  | "status";

export interface ParsedCommand {
  type: GitCommandType;
  message?: string;
  branchName?: string;
  targetBranch?: string;
  force?: boolean;
  createBranch?: boolean;
  squash?: boolean;
  paths?: string[];
  remoteName?: string;
  remoteBranch?: string;
  rawInput: string;
}

export interface ParseError {
  error: true;
  message: string;
  rawInput: string;
}

export type CommandResult = ParsedCommand | ParseError;
