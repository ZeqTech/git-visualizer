/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
TerminalComponent,
type TerminalHandle,
type TerminalOutput,
} from "@/components/TerminalComponent";
import { GitGraphComponent } from "@/components/GitGraphComponent";
import { GitZonesBoard } from "@/components/GitZonesBoard";
import {
type GitState,
createEmptyGitState,
} from "@/lib/gitState";
import { parseGitCommand } from "@/lib/gitParser";
import { executeCommand } from "@/lib/gitExecutor";
import { DEMOS, type DemoType } from "@/lib/demoCommands";
import { gitConfig } from "@/lib/gitGraphConfig";
import { cn } from "@/lib/utils";
import { type GraphSettings, SETTINGS_PRESETS } from "./presetSettings";
import {
GroupedSelect,
type GroupedSelectOption,
} from "@/components/ui/grouped-select";

const SETTINGS_STORAGE_KEY = "git-graph-settings";

export default function GitVisualizerPage() {
    const [gitState, setGitState] = useState<GitState>(createEmptyGitState());
    const terminalRef = useRef<TerminalHandle>(null);
    const [_, setSelectedCommitId] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<"graph" | "architecture">("graph");
    const [demoMode, setDemoMode] = useState(false);
    const [demoIndex, setDemoIndex] = useState(0);
    const [isStacked, setIsStacked] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedDemo, setSelectedDemo] = useState<string>("merge");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [exportStatus, setExportStatus] = useState<string | null>(null);
    const demoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const demoModeRef = useRef(demoMode);
    const spaceResolveRef = useRef<null | (() => void)>(null);
    const exportStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const presentationPresetSettings =
        SETTINGS_PRESETS.find((preset) => preset.key === "presentation")
            ?.settings ?? {};
    const sampleFilePath = "src/demo-file.txt";

    const defaultSettings: GraphSettings = {
        COMMIT_RADIUS: gitConfig.COMMIT_RADIUS,
        NODE_SPACING_X: gitConfig.NODE_SPACING_X,
        NODE_SPACING_Y: gitConfig.NODE_SPACING_Y,
        OFFSET_LEFT: gitConfig.OFFSET_LEFT,
        OFFSET_TOP: gitConfig.OFFSET_TOP,
        ARC_CURVATURE: gitConfig.ARC_CURVATURE,
        LONG_DISTANCE_THRESHOLD: gitConfig.LONG_DISTANCE_THRESHOLD,
        CUBIC_CURVE_CONTROL_POINT: gitConfig.CUBIC_CURVE_CONTROL_POINT,
        INVERT_CUBIC_CURVES: gitConfig.INVERT_CUBIC_CURVES,
        MESSAGE_OFFSET: gitConfig.MESSAGE_OFFSET,
        MESSAGE_WRAP_LENGTH: gitConfig.MESSAGE_WRAP_LENGTH,
        SHOW_TEXT_LABELS: gitConfig.SHOW_TEXT_LABELS,
        COMMIT_HASH_FONT_SIZE: gitConfig.COMMIT_HASH_FONT_SIZE,
        COMMIT_MESSAGE_FONT_SIZE: gitConfig.COMMIT_MESSAGE_FONT_SIZE,
        BRANCH_LABEL_FONT_SIZE: gitConfig.BRANCH_LABEL_FONT_SIZE,
        TAG_LABEL_FONT_SIZE: gitConfig.TAG_LABEL_FONT_SIZE,
        EDGE_WIDTH: gitConfig.EDGE_WIDTH,
        SHOW_MERGE_TYPE_LABELS: gitConfig.SHOW_MERGE_TYPE_LABELS,
        INITIAL_DEMO_DELAY: 0,
        DEMO_STEP_ON_SPACE: false,
        TERMINAL_FONT_SIZE: 14,
        TYPING_DELAY: gitConfig.TYPING_DELAY,
        COMMAND_DELAY: gitConfig.COMMAND_DELAY,
        ACTION_ANIMATION_DELAY: gitConfig.ACTION_ANIMATION_DELAY,
        GRAPH_ANIMATION_DURATION: gitConfig.GRAPH_ANIMATION_DURATION,
        ALLOW_FAST_FORWARD_MERGES: false,
        FOCUS_NODE_TOP_OFFSET: 40,
        FOCUS_NODE_BOTTOM_OFFSET: 40,
        GRAPH_ROTATION: 0,
        ...presentationPresetSettings,
    };

    const [settings, setSettings] = useState<GraphSettings>(defaultSettings);
    const graphConfig = useMemo(
        () => ({ ...gitConfig, ...settings }),
        [settings],
    );

    const currentDemoCommands = useMemo(
        () => DEMOS[selectedDemo as DemoType] || [],
        [selectedDemo],
    );

    const demoProgress = useMemo(() => {
        if (!demoMode || currentDemoCommands.length === 0) return undefined;
        return Math.min(1, demoIndex / Math.max(1, currentDemoCommands.length));
    }, [demoMode, demoIndex, currentDemoCommands.length]);

    const sliderSettings = [
        {
            key: "INITIAL_DEMO_DELAY",
            label: "Initial demo delay",
            min: 0,
            max: 5000,
            step: 100,
        },
        {
            key: "TERMINAL_FONT_SIZE",
            label: "Terminal font size",
            min: 10,
            max: 20,
            step: 1,
        },
        { key: "TYPING_DELAY", label: "Typing delay", min: 0, max: 300, step: 10 },
        {
            key: "COMMAND_DELAY",
            label: "Command delay",
            min: 0,
            max: 2000,
            step: 50,
        },
        {
            key: "ACTION_ANIMATION_DELAY",
            label: "Action delay",
            min: 0,
            max: 2000,
            step: 50,
        },
        {
            key: "GRAPH_ANIMATION_DURATION",
            label: "Graph animation",
            min: 50,
            max: 2000,
            step: 50,
        },
        { key: "COMMIT_RADIUS", label: "Commit radius", min: 6, max: 30, step: 1 },
        { key: "EDGE_WIDTH", label: "Edge width", min: 1, max: 10, step: 1 },
        {
            key: "NODE_SPACING_X",
            label: "Node spacing X",
            min: 0,
            max: 300,
            step: 10,
        },
        {
            key: "NODE_SPACING_Y",
            label: "Node spacing Y",
            min: 0,
            max: 300,
            step: 10,
        },
        { key: "OFFSET_LEFT", label: "Offset left", min: -150, max: 900, step: 5 },
        { key: "OFFSET_TOP", label: "Offset top", min: -150, max: 300, step: 5 },
        {
            key: "FOCUS_NODE_TOP_OFFSET",
            label: "Focus node top offset",
            min: 0,
            max: 200,
            step: 5,
        },
        {
            key: "FOCUS_NODE_BOTTOM_OFFSET",
            label: "Focus node bottom offset",
            min: 0,
            max: 200,
            step: 5,
        },
        {
            key: "ARC_CURVATURE",
            label: "Arc curvature",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "LONG_DISTANCE_THRESHOLD",
            label: "Cubic threshold",
            min: 1,
            max: 6,
            step: 1,
        },
        {
            key: "CUBIC_CURVE_CONTROL_POINT",
            label: "Cubic control point",
            min: 0,
            max: 1.1,
            step: 0.05,
        },
        {
            key: "MESSAGE_OFFSET",
            label: "Message offset",
            min: 0,
            max: 20,
            step: 1,
        },
        {
            key: "MESSAGE_WRAP_LENGTH",
            label: "Message wrap length",
            min: 5,
            max: 50,
            step: 1,
        },
        {
            key: "COMMIT_HASH_FONT_SIZE",
            label: "Commit hash size",
            min: 8,
            max: 18,
            step: 1,
        },
        {
            key: "COMMIT_MESSAGE_FONT_SIZE",
            label: "Commit message size",
            min: 8,
            max: 18,
            step: 1,
        },
        {
            key: "BRANCH_LABEL_FONT_SIZE",
            label: "Branch label size",
            min: 8,
            max: 18,
            step: 1,
        },
        {
            key: "TAG_LABEL_FONT_SIZE",
            label: "Tag label size",
            min: 8,
            max: 18,
            step: 1,
        },
    ] as const;

    const toggleSettings = () => {
        setIsSettingsOpen((prev) => !prev);
    };

    const updateSetting = <K extends keyof GraphSettings>(
        key: K,
        value: GraphSettings[K],
    ) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const exportSettings = async () => {
        const settingsText = JSON.stringify(settings, null, 4);
        const payload = `${settingsText}`;

        try {
            await navigator.clipboard.writeText(payload);
            setExportStatus("Copied");
        } catch {
            window.prompt("Copy settings preset:", payload);
            setExportStatus("Prompted");
        }

        if (exportStatusTimeoutRef.current) {
            clearTimeout(exportStatusTimeoutRef.current);
        }

        exportStatusTimeoutRef.current = setTimeout(() => {
            setExportStatus(null);
        }, 2000);
    };

    const applyPreset = (presetKey: string) => {
        const preset = SETTINGS_PRESETS.find((item) => item.key === presetKey);
        if (!preset) return;
        setSettings((prev) => ({ ...prev, ...preset.settings }));
    };

    const DEMO_OPTIONS: GroupedSelectOption[] = [
        { key: "merges-title", label: "Basic Merges", isGroupTitle: true },
        { key: "merge", label: "Simple Merge" },
        { key: "fast_forward_merge", label: "Fast-Forward Merge" },
        { key: "regular_merge", label: "Regular Merge Commit" },
        { key: "squash_merge", label: "Squash Merge (--squash)" },
        { key: "sep-1", label: "", isSeparator: true },
        {
            key: "complex-merges-title",
            label: "Complex Merges",
            isGroupTitle: true,
        },
        { key: "merge_2", label: "Multiple Merges" },
        { key: "merge_flow", label: "Merge Flow" },
        { key: "merge_flow_6", label: "Merge Flow (6 Branches)" },
        { key: "merge_flow_7", label: "Merge Flow (Varied)" },
        { key: "sep-2", label: "", isSeparator: true },
        { key: "other-title", label: "Other Operations", isGroupTitle: true },
        { key: "branching_2", label: "Simple Branching" },
        { key: "rebasing", label: "Rebase" },
        { key: "tagging", label: "Tagging" },
        { key: "resetting", label: "Reset" },
    ];

    const runGitCommand = async (
        command: string,
        mirrorToTerminal = false,
    ): Promise<TerminalOutput> => {
        const trimmedInput = command.trim();
        const baseCmd = trimmedInput.split(" ")[0]?.toLowerCase() ?? "";

        // Parse the command
        if ( command.trim().toLowerCase() === "clear" ) {
            terminalRef.current?.clearHistory?.();
            const output: TerminalOutput = {
                type: "info",
                text: "Terminal cleared",
                timestamp: Date.now(),
            };
            if ( mirrorToTerminal ) {
                terminalRef.current?.addOutput?.( output );
            }
            return output;
        }

        // 1. Route 'touch' Command
        if (baseCmd === "touch") {
            const filename = trimmedInput.substring(6).trim();
            if (!filename) {
                return {
                    type: "error",
                    text: "touch requires a filename",
                    timestamp: Date.now(),
                };
            }

            const result = executeCommand(
                {
                    type: "touch",
                    paths: [filename],
                    rawInput: command,
                },
                gitState,
                {
                    allowFastForwardMerges: settings.ALLOW_FAST_FORWARD_MERGES,
                },
            );

            if (!result.success) {
                return {
                    type: "error",
                    text: result.message,
                    timestamp: Date.now(),
                };
            }

            if (result.newState) {
                setGitState(result.newState);
            }

            return {
                type: "success",
                text: `Created ${filename}`,
                timestamp: Date.now(),
            };
        }

        // 2. Route 'echo' Command
        if (baseCmd === "echo") {
            const echoRegex = /^echo\s+(?:["']([^"']+)["']|([^>]+?))\s*(>>?)\s*([^\s]+)$/;
            const match = trimmedInput.match(echoRegex);

            if (!match) {
                return {
                    type: "error",
                    text: 'Invalid format. Use: echo "text" > filename.txt',
                    timestamp: Date.now(),
                };
            }

            const content = (match[1] || match[2]).trim();
            const append = match[3] === ">>";
            const filename = match[4].trim();
            const existingContent =
                gitState.tree.workingDirectory.find((file) => file.path === filename)
                    ?.content ?? "";

            const result = executeCommand(
                {
                    type: "echo",
                    paths: [filename],
                    echoContent: content,
                    echoTarget: filename,
                    echoAppend: append,
                    rawInput: command,
                },
                gitState,
                {
                    allowFastForwardMerges: settings.ALLOW_FAST_FORWARD_MERGES,
                },
            );

            if (!result.success) {
                return {
                    type: "error",
                    text: result.message,
                    timestamp: Date.now(),
                };
            }

            if (result.newState) {
                if (append && result.newState.tree.workingDirectory.length > 0) {
                    result.newState.tree.workingDirectory = result.newState.tree.workingDirectory.map((file) =>
                        file.path === filename
                            ? { ...file, content: `${existingContent}${content}` }
                            : file,
                    );
                }
                setGitState(result.newState);
            }

            // Echo with redirection is usually silent in bash.
            return {
                type: "success",
                text: "",
                timestamp: Date.now(),
            };
        }

        const parsed = parseGitCommand(command);

        if ("error" in parsed && parsed.error) {
            return {
                type: "error",
                text: parsed.message,
                timestamp: Date.now(),
            };
        }

        // Execute the command
        // @ts-ignore
        const result = executeCommand(parsed, gitState, {
            allowFastForwardMerges: settings.ALLOW_FAST_FORWARD_MERGES,
        });

        if (!result.success) {
            const output: TerminalOutput = {
                type: "error",
                text: result.message,
                timestamp: Date.now(),
            };
            if (mirrorToTerminal) {
                terminalRef.current?.addOutput?.(output);
            }
            return output;
        }

        // Update git state if command succeeded
        if (result.newState) {
            setGitState(result.newState);
        }

        const output: TerminalOutput = {
            type: "success",
            text: result.message,
            timestamp: Date.now(),
        };
        if (mirrorToTerminal) {
            terminalRef.current?.addOutput?.(output);
        }
        return output;
    };

    const handleCommand = async (command: string): Promise<TerminalOutput> => {
        return runGitCommand(command, false);
    };

    useEffect(() => {
        demoModeRef.current = demoMode;
    }, [demoMode]);

    const waitForSpace = (): Promise<void> => {
        return new Promise((resolve) => {
            spaceResolveRef.current = resolve;
        });
    };

    useEffect(() => {
        if (!demoMode || !settings.DEMO_STEP_ON_SPACE) {
            spaceResolveRef.current = null;
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code === "Space" || event.key === " ") {
                event.preventDefault();
                const resolver = spaceResolveRef.current;
                if (resolver) {
                    spaceResolveRef.current = null;
                    resolver();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [demoMode, settings.DEMO_STEP_ON_SPACE]);

    // Type out a command character by character
    const typeCommand = async (command: string): Promise<void> => {
        return new Promise((resolve) => {
            let index = 0;
            const typeInterval = setInterval(() => {
                if (index <= command.length) {
                    terminalRef.current?.setInput?.(command.substring(0, index));
                    index++;
                } else {
                    clearInterval(typeInterval);
                    resolve();
                }
            }, graphConfig.TYPING_DELAY);
        });
    };

    // Execute demo sequence
    const runDemoCommand = async (
        commandIndex: number,
        demoCommands: string[],
    ) => {
        if (!demoCommands || commandIndex >= demoCommands.length) {
            setDemoMode(false);
            return;
        }

        // Apply initial delay before first command
        if (commandIndex === 0 && settings.INITIAL_DEMO_DELAY > 0) {
            await new Promise((resolve) =>
                setTimeout(resolve, settings.INITIAL_DEMO_DELAY),
            );
        }

        const command = demoCommands[commandIndex];

        if (settings.DEMO_STEP_ON_SPACE) {
            // First space: type the command
            await waitForSpace();
            if (!demoModeRef.current) return;
        }

        // Type the command
        await typeCommand(command);

        if (settings.DEMO_STEP_ON_SPACE) {
            // Second space: execute the command
            await waitForSpace();
            if (!demoModeRef.current) return;
        } else {
            // Wait before executing
            await new Promise((resolve) =>
                setTimeout(resolve, graphConfig.COMMAND_DELAY),
            );
            if (!demoModeRef.current) return;
        }

        // Execute the command
        terminalRef.current?.executeCurrentInput?.();

        // Wait before next command
        demoTimeoutRef.current = setTimeout(() => {
            setDemoIndex(commandIndex + 1);
        }, graphConfig.ACTION_ANIMATION_DELAY);
    };

    // Handle demo mode
    useEffect(() => {
        if (demoMode && currentDemoCommands.length > 0) {
            runDemoCommand(demoIndex, currentDemoCommands);
        }

        return () => {
            if (demoTimeoutRef.current) {
                clearTimeout(demoTimeoutRef.current);
            }
        };
    }, [demoMode, demoIndex, selectedDemo]);

    useEffect(() => {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!stored) return;

        try {
            const parsed = JSON.parse(stored) as Partial<GraphSettings>;
            // Reset to default: ALLOW_FAST_FORWARD_MERGES should be false by default
            // This migrates old settings that may have had it set to true
            setSettings((prev) => ({
                ...prev,
                ...parsed,
                ALLOW_FAST_FORWARD_MERGES: false,
            }));
        } catch {
            // Ignore invalid stored settings
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const startDemo = () => {
        const currentDemoCommands = DEMOS[selectedDemo as DemoType] || [];
        if (!currentDemoCommands || currentDemoCommands.length === 0) return;
        // Don't reset state - just start playing commands
        setDemoIndex(0);
        setDemoMode(true);
    };

    const stopDemo = () => {
        setDemoMode(false);
        if (demoTimeoutRef.current) {
            clearTimeout(demoTimeoutRef.current);
        }
    };

    const resetGit = () => {
        stopDemo();
        setGitState(createEmptyGitState());
        setDemoIndex(0);
        setSelectedCommitId(null);
        terminalRef.current?.clearHistory?.();
    };

    const toggleLayout = () => {
        setIsStacked((prev) => !prev);
    };

    const toggleFullscreen = () => {
        setIsFullscreen((prev) => !prev);
    };

    const createSampleFile = () => void runGitCommand(
        `touch ${sampleFilePath}`,
        true,
    );

    const editSampleFile = () => void runGitCommand(
        `edit ${sampleFilePath}`,
        true,
    );

    const stageAllFiles = () => void runGitCommand("git add .", true);

    const commitStagedFiles = () => void runGitCommand(
        "git commit -m 'Snapshot commit'",
        true,
    );

    const stashFiles = () => void runGitCommand("git stash", true);

    const popStash = () => void runGitCommand("git stash pop", true);

    const restoreStaged = () => void runGitCommand(
        `git restore --staged ${sampleFilePath}`,
        true,
    );

    const discardChanges = () => void runGitCommand(
        `git restore ${sampleFilePath}`,
        true,
    );


    return (
        <div className="flex h-screen w-full bg-slate-900 text-white overflow-hidden flex-col">
            {/* Navigation Header */}
            <div className="border-b border-slate-700 px-6 py-4 bg-slate-900 flex items-center justify-between">
                <div className="flex flex-row flex-wrap gap-4 items-center">
                    <h1 className="text-2xl font-bold">Git Visualizer By ZeqTech</h1>
                    <div className="flex flex-col">
                        <a href="https://www.youtube.com/@ZeqTech" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:underline">Visit ZeqTech on YouTube</a>
                        <a href="https://www.youtube.com/watch?v=x0nLbmVImag&t=140s" target="_blank" rel="noopener noreferrer" className="text-sm text-green-400 hover:underline">Watch Merge Explanation Video</a></div>
                </div>
                <div className="flex gap-2 items-center">
                    <GroupedSelect
                        value={selectedDemo}
                        onChange={(value) => {
                            setSelectedDemo(value);
                            stopDemo();
                            resetGit();
                        }}
                        options={DEMO_OPTIONS}
                        className="min-w-[220px]"
                    />
                    {(DEMOS[selectedDemo as DemoType]?.length ?? 0) > 0 && (
                        // biome-ignore lint/complexity/noUselessFragments: <explanation>
                        <>
                            {!demoMode ? (
                                <button
                                    onClick={startDemo}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium transition-colors"
                                >
                                    ▶ Play Demo
                                </button>
                            ) : (
                                <button
                                    onClick={stopDemo}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
                                >
                                    ⏹ Stop Demo
                                </button>
                            )}
                        </>
                    )}
                    <button
                        onClick={resetGit}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
                    >
                        ↻ Reset
                    </button>
                    <button
                        onClick={toggleLayout}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
                    >
                        ⇵ Toggle Layout
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
                    >
                        {isFullscreen ? "◀ Exit Fullscreen" : "⛶ Fullscreen"}
                    </button>
                    <button
                        onClick={toggleSettings}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
                    >
                        Settings
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div
                className={`flex flex-1 w-full h-full overflow-auto ${isStacked ? "flex-col-reverse" : "flex-row"}`}
            >
                {/* Left Panel - Terminal */}
                <div
                    className={cn(
                        `${isStacked ? "w-full border-t max-h-[50%]" : "w-1/2 border-r"} border-slate-700 p-4 flex flex-col flex-1`,
                    )}
                >
                    <TerminalComponent
                        ref={terminalRef}
                        onCommand={handleCommand}
                        placeholder="git commit -m 'your message'"
                        helpText="Try: touch file.txt | edit file.txt | git add . | git commit -m 'msg' | git stash | git stash pop | git restore --staged file.txt | git restore file.txt"
                        fontSize={settings.TERMINAL_FONT_SIZE}
                        refocusOnEnter={!settings.DEMO_STEP_ON_SPACE}
                    />
                </div>

                {/* Right Panel - Tabbed Content */}
                <div
                    className={cn(
                        `${isStacked ? "w-full max-h-[50%]" : "w-1/2"} flex flex-col p-4 gap-4 flex-1 min-h-0`,
                    )}
                >
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 p-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveView("graph")}
                                className={cn(
                                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                                    activeView === "graph"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white",
                                )}
                            >
                                Git Graph
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveView("architecture")}
                                className={cn(
                                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                                    activeView === "architecture"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white",
                                )}
                            >
                                Internal Architecture
                            </button>
                        </div>
                        <p className="text-xs text-slate-400">
                            {activeView === "graph"
                                ? "Commit tree and branches"
                                : "Working / Index / Repo / Stash"}
                        </p>
                    </div>

                    <div className="flex-1 min-h-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeView}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="h-full min-h-0"
                            >
                                {activeView === "graph" ? (
                                    <GitGraphComponent
                                        gitState={gitState}
                                        onCommitClick={setSelectedCommitId}
                                        config={graphConfig}
                                        demoProgress={demoProgress}
                                        reserveRightColumn={true}
                                        followMainHead={true}
                                    />
                                ) : (
                                    <GitZonesBoard
                                        tree={gitState.tree}
                                        onCreateFile={createSampleFile}
                                        onEditFile={editSampleFile}
                                        onStageFiles={stageAllFiles}
                                        onCommitFiles={commitStagedFiles}
                                        onStashFiles={stashFiles}
                                        onPopStash={popStash}
                                        onRestoreStaged={restoreStaged}
                                        onDiscardChanges={discardChanges}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Fullscreen Overlay */}
            {isFullscreen && (
                <div className="fixed inset-0 top-18.25 z-50 flex flex-col gap-2 bg-slate-950 p-2">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 p-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveView("graph")}
                                className={cn(
                                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                                    activeView === "graph"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white",
                                )}
                            >
                                Git Graph
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveView("architecture")}
                                className={cn(
                                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                                    activeView === "architecture"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white",
                                )}
                            >
                                Internal Architecture
                            </button>
                        </div>
                        <p className="text-xs text-slate-400">
                            {activeView === "graph"
                                ? "Commit tree and branches"
                                : "Working / Index / Repo / Stash"}
                        </p>
                    </div>

                    <div className="flex-1 min-h-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`fullscreen-${activeView}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="h-full min-h-0"
                            >
                                {activeView === "graph" ? (
                                    <GitGraphComponent
                                        gitState={gitState}
                                        onCommitClick={setSelectedCommitId}
                                        config={graphConfig}
                                        demoProgress={demoProgress}
                                        reserveRightColumn={true}
                                        followMainHead={true}
                                    />
                                ) : (
                                    <GitZonesBoard
                                        tree={gitState.tree}
                                        onCreateFile={createSampleFile}
                                        onEditFile={editSampleFile}
                                        onStageFiles={stageAllFiles}
                                        onCommitFiles={commitStagedFiles}
                                        onStashFiles={stashFiles}
                                        onPopStash={popStash}
                                        onRestoreStaged={restoreStaged}
                                        onDiscardChanges={discardChanges}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {isSettingsOpen && (
                <div className="fixed inset-0 z-60 bg-black/50">
                    <div className="absolute right-0 top-0 h-full w-90 bg-slate-900 border-l border-slate-700 flex flex-col">
                        {/* Sticky Header */}
                        <div className="sticky top-0 bg-slate-900 p-4 border-b border-slate-700 z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Graph Settings</h2>
                                <button
                                    onClick={toggleSettings}
                                    className="px-2 py-1 text-slate-300 hover:text-white"
                                >
                                    X
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="mb-6">
                                <p className="text-sm text-slate-300 mb-2">Presets</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {SETTINGS_PRESETS.map((preset) => (
                                        <button
                                            key={preset.key}
                                            onClick={() => applyPreset(preset.key)}
                                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium transition-colors"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        onClick={exportSettings}
                                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium transition-colors"
                                    >
                                        Export Settings
                                    </button>
                                    {exportStatus && (
                                        <span className="text-xs text-slate-400">
                                            {exportStatus}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-4">
                                {sliderSettings.map((item) => {
                                    const value =
                                        (settings[item.key as keyof GraphSettings] as number) ??
                                        (defaultSettings[
                                            item.key as keyof GraphSettings
                                        ] as number);
                                    return (
                                        <div key={item.key}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="text-slate-300">{item.label}</span>
                                                <span className="text-slate-400">{value}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={item.min}
                                                max={item.max}
                                                step={item.step}
                                                value={value}
                                                onChange={(e) =>
                                                    updateSetting(
                                                        item.key as keyof GraphSettings,
                                                        Number(
                                                            e.target.value,
                                                        ) as GraphSettings[keyof GraphSettings],
                                                    )
                                                }
                                                className="w-full"
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 space-y-3">
                                {/* <label className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">Graph rotation</span>
                                    <select
                                        value={settings.GRAPH_ROTATION}
                                        onChange={( e ) =>
                                            updateSetting(
                                                "GRAPH_ROTATION",
                                                Number( e.target.value ) as 0 | 90 | 180 | 270,
                                            )
                                        }
                                        className="bg-slate-800 text-white px-2 py-1 rounded text-sm"
                                    >
                                        <option value={0}>0°</option>
                                        <option value={90}>90°</option>
                                        <option value={180}>180°</option>
                                        <option value={270}>270°</option>
                                    </select>
                                </label> */}
                                <label className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">Invert cubic curves</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.INVERT_CUBIC_CURVES}
                                        onChange={(e) =>
                                            updateSetting("INVERT_CUBIC_CURVES", e.target.checked)
                                        }
                                    />
                                </label>
                                <label className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">Step demo on spacebar</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.DEMO_STEP_ON_SPACE}
                                        onChange={(e) =>
                                            updateSetting("DEMO_STEP_ON_SPACE", e.target.checked)
                                        }
                                    />
                                </label>
                                <label className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">Show text labels</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.SHOW_TEXT_LABELS}
                                        onChange={(e) =>
                                            updateSetting("SHOW_TEXT_LABELS", e.target.checked)
                                        }
                                    />
                                </label>
                                <label className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">Show merge type labels</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.SHOW_MERGE_TYPE_LABELS}
                                        onChange={(e) =>
                                            updateSetting("SHOW_MERGE_TYPE_LABELS", e.target.checked)
                                        }
                                    />
                                </label>
                                <label className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">
                                        Allow fast-forward merges
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={settings.ALLOW_FAST_FORWARD_MERGES}
                                        onChange={(e) =>
                                            updateSetting(
                                                "ALLOW_FAST_FORWARD_MERGES",
                                                e.target.checked,
                                            )
                                        }
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
