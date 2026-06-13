import type { ParsedCommand, GitCommandType } from "../types";

export function parseWorkflowCommand(
  command: GitCommandType,
  parts: string[],
  rawInput: string,
): ParsedCommand | { error: true; message: string; rawInput: string } {
  switch (command) {
    case "stash": {
      const stashMode = parts[1] === "pop" ? "pop" : parts[1] === "apply" ? "apply" : "push";
      const stashRestoreIndex = parts.includes("--index");
      return {
        type: "stash",
        stashMode,
        stashRestoreIndex,
        rawInput,
      };
    }
    case "restore": {
      const restoreStaged = parts[1] === "--staged";
      const targetIndex = restoreStaged ? 2 : 1;
      const paths = parts.slice(targetIndex);

      if (paths.length === 0) {
        return {
          error: true,
          message: restoreStaged
            ? "Path required for git restore --staged"
            : "Path required for git restore",
          rawInput,
        };
      }

      return {
        type: "restore",
        restoreStaged,
        paths,
        rawInput,
      };
    }
    case "touch":
    case "edit":
    case "delete": {
      const paths = parts.slice(1);
      if (paths.length === 0) {
        return {
          error: true,
          message: `Path required for ${command}`,
          rawInput,
        };
      }

      return {
        type: command,
        paths,
        rawInput,
      };
    }
    case "echo": {
      // Matches: echo "some text" > filename.txt OR echo some text > filename.txt
      const echoRegex = /^echo\s+(?:["']([^"']+)["']|([^>]+?))\s*(>>?)\s*([^\s]+)$/;
      const match = rawInput.trim().match(echoRegex);

      if (!match) {
        return {
          error: true,
          message: 'Invalid format. Use: echo "text" > filename',
          rawInput,
        };
      }

      // match[1] is quoted text, match[2] is unquoted text, match[3] is redirection operator, match[4] is filename
      const content = (match[1] || match[2]).trim();
      const append = match[3] === ">>";
      const filename = match[4].trim();

      return {
        type: "echo",
        paths: [filename],
        echoContent: content,
        echoTarget: filename,
        echoAppend: append,
        rawInput,
      };
    }
    default:
      return {
        error: true,
        message: "Unsupported workflow command",
        rawInput,
      };
  }
}
