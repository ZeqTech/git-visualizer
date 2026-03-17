import { ParsedCommand } from "./types";

/**
 * Validates if a command can be executed given current git state
 * Used to provide user feedback before executing
 */
export function validateCommand(
  command: ParsedCommand,
  currentBranch: string,
  existingBranches: string[]
): { valid: true } | { valid: false; reason: string } {
  switch (command.type) {
    case "add":
      if (!command.paths || command.paths.length === 0) {
        return { valid: false, reason: "Path required for add" };
      }
      return { valid: true };

    case "checkout":
    case "switch": {
      if (!command.branchName) {
        return { valid: false, reason: "Branch name required" };
      }

      if (command.createBranch) {
        if (existingBranches.includes(command.branchName)) {
          return {
            valid: false,
            reason: `Branch '${command.branchName}' already exists`,
          };
        }
        return { valid: true };
      }

      if (!existingBranches.includes(command.branchName)) {
        return {
          valid: false,
          reason: `Branch '${command.branchName}' does not exist`,
        };
      }

      return { valid: true };
    }

    case "merge":
      if (command.targetBranch === currentBranch) {
        return {
          valid: false,
          reason: "Cannot merge a branch into itself",
        };
      }
      if (command.targetBranch && !existingBranches.includes(command.targetBranch)) {
        return {
          valid: false,
          reason: `Branch '${command.targetBranch}' does not exist`,
        };
      }
      return { valid: true };

    case "branch-delete":
      if (command.branchName === currentBranch) {
        return {
          valid: false,
          reason: "Cannot delete the currently checked out branch",
        };
      }
      if (command.branchName && !existingBranches.includes(command.branchName)) {
        return {
          valid: false,
          reason: `Branch '${command.branchName}' does not exist`,
        };
      }
      return { valid: true };

    case "branch":
      if (command.branchName && existingBranches.includes(command.branchName)) {
        return {
          valid: false,
          reason: `Branch '${command.branchName}' already exists`,
        };
      }
      return { valid: true };

    case "rebase":
      if (command.targetBranch === currentBranch) {
        return {
          valid: false,
          reason: "Cannot rebase a branch onto itself",
        };
      }
      if (command.targetBranch && !existingBranches.includes(command.targetBranch)) {
        return {
          valid: false,
          reason: `Branch '${command.targetBranch}' does not exist`,
        };
      }
      return { valid: true };

    case "squash":
      if (command.targetBranch === currentBranch) {
        return {
          valid: false,
          reason: "Cannot squash a branch onto itself",
        };
      }
      if (command.targetBranch && !existingBranches.includes(command.targetBranch)) {
        return {
          valid: false,
          reason: `Branch '${command.targetBranch}' does not exist`,
        };
      }
      return { valid: true };

    case "pull":
      if (!command.remoteName || !command.remoteBranch) {
        return {
          valid: false,
          reason: "Pull requires a remote and branch",
        };
      }
      return { valid: true };

    case "reset":
      if (!command.resetMode || !command.resetTarget) {
        return {
          valid: false,
          reason: "Reset requires mode and target (e.g. git reset --hard HEAD~1)",
        };
      }

      if (command.resetMode !== "--hard" && command.resetMode !== "--soft") {
        return {
          valid: false,
          reason: "Reset mode must be --hard or --soft",
        };
      }

      if (!/^HEAD(~\d+)?$/.test(command.resetTarget)) {
        return {
          valid: false,
          reason: "Only HEAD or HEAD~<n> targets are supported",
        };
      }

      return { valid: true };

    default:
      return { valid: true };
  }
}
