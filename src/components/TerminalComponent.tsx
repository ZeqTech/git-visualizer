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
      }
    };

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
                key={idx}
                className={getOutputClasses(output.type)}
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
              autoFocus
            />
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
