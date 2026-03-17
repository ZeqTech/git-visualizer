"use client";

import React, { useRef, useEffect } from "react";

export interface TerminalOutput {
  type: "command" | "success" | "error" | "info";
  text: string;
  timestamp: number;
}

export interface TerminalProps {
  onCommand: (command: string) => Promise<TerminalOutput>;
  placeholder?: string;
  helpText?: string;
  fontSize?: number;
  refocusOnEnter?: boolean;
}

export const TerminalComponent = React.forwardRef<
  TerminalHandle,
  TerminalProps
>(
  (
    {
      onCommand,
      placeholder = "Enter a command...",
      helpText = "Type 'help' for available commands",
      fontSize = 14,
      refocusOnEnter = true,
    },
    ref,
  ) => {
    const [history, setHistory] = React.useState<TerminalOutput[]>([]);
    const [currentCommand, setCurrentCommand] = React.useState("");
    const [commandHistory, setCommandHistory] = React.useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = React.useState<number>(-1);
    const [isLoading, setIsLoading] = React.useState(false);
    const historyEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom when new output appears
    useEffect(() => {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      clearHistory: () => setHistory([]),
      addOutput: (output: TerminalOutput) => {
        setHistory((prev) => [...prev, output]);
      },
      focus: () => inputRef.current?.focus(),
      setInput: (value: string) => setCurrentCommand(value),
      executeCurrentInput: () => {
        if (currentCommand.trim() && !isLoading) {
          handleCommandSubmit(new Event("submit") as any);
        }
      },
    }));

    const handleCommandSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentCommand.trim() || isLoading) return;

      const command = currentCommand.trim();

      // Add command to history display
      setHistory((prev) => [
        ...prev,
        {
          type: "command",
          text: `$ ${command}`,
          timestamp: Date.now(),
        },
      ]);

      // Add to command history for navigation
      setCommandHistory((prev) => [...prev, command]);
      setHistoryIndex(-1);
      setCurrentCommand("");

      // Execute command
      setIsLoading(true);
      try {
        const output = await onCommand(command);
        setHistory((prev) => [...prev, output]);
      } catch (err) {
        setHistory((prev) => [
          ...prev,
          {
            type: "error",
            text: err instanceof Error ? err.message : "Unknown error",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsLoading(false);
        if ( refocusOnEnter ) {
          requestAnimationFrame( () => inputRef.current?.focus() );
        }
      }
    };

    const implementedGitFeatures = [
      "git add <path>",
      "git commit -m 'msg'",
      "git branch, git branch <name>, git branch -d|-D <name>",
      "git checkout <branch>, git checkout -b <branch>",
      "git switch <branch>, git switch -c <branch>",
      "git merge <branch>, git merge --squash <branch>",
      "git rebase <branch>",
      "git squash <branch>",
      "git tag <name>",
      "git log, git log --oneline",
      "git reset --hard|--soft HEAD~<n>",
      "git status",
      "git pull <remote> <branch>",
    ];

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Arrow up: navigate to previous command
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commandHistory.length === 0) return;

        const newIndex =
          historyIndex === -1 ? commandHistory.length - 1 : historyIndex - 1;
        if (newIndex >= 0) {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }

      // Arrow down: navigate to next command
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex === -1) return;

        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand("");
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }

      // Tab: complete command (optional enhancement)
      if (e.key === "Tab") {
        e.preventDefault();
        // Could add autocomplete here
      }
    };

    const getOutputClasses = (type: TerminalOutput["type"]): string => {
      const baseClasses = "font-mono";
      switch (type) {
        case "command":
          return `${baseClasses} text-green-400`;
        case "success":
          return `${baseClasses} text-blue-400`;
        case "error":
          return `${baseClasses} text-red-400`;
        case "info":
          return `${baseClasses} text-slate-400`;
        default:
          return baseClasses;
      }
    };

    return (
      <div className="flex flex-col h-full bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-700 px-4 py-3 bg-slate-900">
          <p className="text-lg font-medium text-slate-300">Terminal</p>
        </div>

        {/* Output Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {history.length === 0 ? (
            <div className="text-slate-500 italic" style={{ fontSize }}>
              {helpText}
            </div>
          ) : (
            history.map((output, idx) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                key={idx}
                className={`${ getOutputClasses( output.type ) } whitespace-pre-wrap`}
                style={{ fontSize }}
              >
                {output.text}
              </div>
            ))
          )}
          <div ref={historyEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700 px-4 py-3 bg-slate-900">
          <form
            onSubmit={handleCommandSubmit}
            className="flex items-center gap-2"
          >
            <span className="text-green-400 font-mono" style={{ fontSize }}>
              $
            </span>
            <input
              ref={inputRef}
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none font-mono disabled:opacity-50"
              style={{ fontSize }}
              // biome-ignore lint/a11y/noAutofocus: <explanation>
              autoFocus
            />
            <div className="relative group">
              <button
                type="button"
                aria-label="Implemented git features"
                title="Implemented git features"
                className="w-8 h-8 rounded border border-slate-600 bg-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors font-semibold"
                style={{ fontSize: Math.max( 12, fontSize - 1 ) }}
              >
                i
              </button>
              <div className="pointer-events-none absolute bottom-10 right-0 z-20 hidden group-hover:block w-104 rounded border border-slate-600 bg-slate-900/95 p-3 shadow-lg">
                <p className="text-xs font-semibold text-slate-200 mb-2">
                  Implemented git features
                </p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                  {implementedGitFeatures.map( ( feature ) => (
                    <li key={feature}>{feature}</li>
                  ) )}
                </ul>
                <p className="mt-2 text-xs font-semibold text-slate-200 mb-2 italic">Note: These might not be perfect but I tried to get them to represent the actual git features as accurately as possible.</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !currentCommand.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontSize }}
            >
              {isLoading ? "..." : "Enter"}
            </button>
          </form>

          {/* Help text with keyboard hints */}
          <p className="text-xs text-slate-500 mt-2">
            Use ↑↓ arrows to navigate history
          </p>
        </div>
      </div>
    );
  },
);

TerminalComponent.displayName = "TerminalComponent";

export interface TerminalHandle {
  clearHistory: () => void;
  addOutput: (output: TerminalOutput) => void;
  focus: () => void;
  setInput?: (value: string) => void;
  executeCurrentInput?: () => void;
}
