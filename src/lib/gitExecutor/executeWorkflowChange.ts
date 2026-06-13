import type { ParsedCommand } from "../gitParser";
import type { GitState } from "../gitState";
import {
  createOrEditWorkingFile,
  deleteWorkingFile,
} from "../gitTreeState";
import { deepCloneGitState } from "./deepCloneGitState";
import type { ExecutionResult } from "./types";

export function executeWorkflowChange(
  command: ParsedCommand,
  state: GitState,
): ExecutionResult {
  const paths = command.paths ?? [];
  if (paths.length === 0) {
    return {
      success: false,
      message: "Path required",
    };
  }

  const newState = deepCloneGitState(state);

  for (const path of paths) {
    if (command.type === "touch") {
      newState.tree = createOrEditWorkingFile(newState.tree, path, "create");
    } else if (command.type === "edit") {
      newState.tree = createOrEditWorkingFile(newState.tree, path, "edit");
    } else if (command.type === "echo") {
      newState.tree = createOrEditWorkingFile(newState.tree, path, "edit", {
        content: command.echoAppend
          ? `${newState.tree.workingDirectory.find((file) => file.path === path)?.content ?? ""}${command.echoContent ?? ""}`
          : command.echoContent,
        append: command.echoAppend,
      });
    } else if (command.type === "delete") {
      newState.tree = deleteWorkingFile(newState.tree, path);
    }
  }

  return {
    success: true,
    message:
      command.type === "touch"
          ? `Created ${paths.join(", ")}`
          : command.type === "edit"
            ? `Modified ${paths.join(", ")}`
            : command.type === "echo"
              ? `${command.echoAppend ? "Appended" : "Wrote"} ${command.echoContent ?? "content"} to ${command.echoTarget ?? paths.join(", ")}`
              : `Removed ${paths.join(", ")}`,
    newState,
  };
}
