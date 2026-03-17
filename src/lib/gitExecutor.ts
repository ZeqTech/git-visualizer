/**
 * Git Command Executor
 * Executes parsed git commands and updates the git state
 */

import { type ParsedCommand, validateCommand } from "./gitParser";
import { type GitState, getBranchNames } from "./gitState";
import { executeAdd } from "./gitExecutor/executeAdd";
import { executeBranch } from "./gitExecutor/executeBranch";
import { executeBranchDelete } from "./gitExecutor/executeBranchDelete";
import { executeBranchList } from "./gitExecutor/executeBranchList";
import { executeCheckout } from "./gitExecutor/executeCheckout";
import { executeCommit } from "./gitExecutor/executeCommit";
import { executeLog } from "./gitExecutor/executeLog";
import { executeMerge } from "./gitExecutor/executeMerge";
import { executePull } from "./gitExecutor/executePull";
import { executeRebase } from "./gitExecutor/executeRebase";
import { executeReset } from "./gitExecutor/executeReset";
import { executeSquash } from "./gitExecutor/executeSquash";
import { executeStatus } from "./gitExecutor/executeStatus";
import { executeTag } from "./gitExecutor/executeTag";
import type { ExecutionResult } from "./gitExecutor/types";

export type { ExecutionResult } from "./gitExecutor/types";

/**
 * Execute a parsed git command and return the updated state
 */
export function executeCommand(
  command: ParsedCommand,
  currentState: GitState,
  p0: { allowFastForwardMerges: boolean },
): ExecutionResult {
  // Preserve signature for existing call sites
  void p0;

  // Validate command first
  const validation = validateCommand(
    command,
    currentState.currentBranch,
    getBranchNames(currentState),
  );

  if (!validation.valid) {
    return {
      success: false,
      message: validation.reason,
    };
  }

  try {
    switch (command.type) {
      case "commit":
        return executeCommit(command, currentState);
      case "add":
        return executeAdd(command, currentState);
      case "branch":
        return executeBranch(command, currentState);
      case "branch-delete":
        return executeBranchDelete(command, currentState);
      case "checkout":
        return executeCheckout(command, currentState);
      case "switch":
        return executeCheckout(command, currentState);
      case "merge":
        return executeMerge(command, currentState);
      case "pull":
        return executePull(command, currentState);
      case "rebase":
        return executeRebase(command, currentState);
      case "squash":
        return executeSquash(command, currentState);
      case "tag":
        return executeTag(command, currentState);
      case "branch-list":
        return executeBranchList(currentState);
      case "log":
        return executeLog(currentState);
      case "status":
        return executeStatus(currentState);
      case "reset":
        return executeReset();
      default:
        return {
          success: false,
          message: "Unknown command",
        };
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Execution error",
    };
  }
}
