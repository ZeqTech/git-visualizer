import type { ParsedCommand } from "../gitParser";
import { getCurrentCommit, type GitState } from "../gitState";
import { deepCloneGitState } from "./deepCloneGitState";
import type { ExecutionResult } from "./types";

/**
 * Execute: git tag <name>
 * Creates a tag at the current commit
 */
export function executeTag(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const tagName = command.message; // Use message field for tag name
  const currentCommit = getCurrentCommit(state);

  if (!tagName) {
    return {
      success: false,
      message: "Tag name required",
    };
  }

  if (!currentCommit) {
    return {
      success: false,
      message: "Cannot create tag without commits",
    };
  }

  const newState = deepCloneGitState(state);

  if (!newState.tags) {
    newState.tags = new Map();
  }

  newState.tags.set(tagName, {
    name: tagName,
    commitId: currentCommit.id,
    createdAt: Date.now(),
  });

  return {
    success: true,
    message: `Created tag '${tagName}' at commit ${currentCommit.id}`,
    newState,
  };
}
