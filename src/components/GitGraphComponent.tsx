"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitState,
  buildCommitGraph,
  isCommitBranchHead,
  getCommitTags,
  getCurrentCommit,
} from "@/lib/gitState";
import { gitConfig as defaultGitConfig } from "@/lib/gitGraphConfig";

type GitGraphConfigShape = {
  COMMIT_RADIUS: number;
  NODE_SPACING_X: number;
  NODE_SPACING_Y: number;
  OFFSET_LEFT: number;
  OFFSET_TOP: number;
  GRAPH_LEFT_OFFSET: number;
  GRAPH_CENTER_MODE: "auto" | "fixed";
  ARC_CURVATURE: number;
  LONG_DISTANCE_THRESHOLD: number;
  CUBIC_CURVE_CONTROL_POINT: number;
  INVERT_CUBIC_CURVES: boolean;
  MESSAGE_OFFSET: number;
  MESSAGE_WRAP_LENGTH: number;
  SHOW_TEXT_LABELS: boolean;
  COMMIT_HASH_FONT_SIZE: number;
  COMMIT_MESSAGE_FONT_SIZE: number;
  BRANCH_LABEL_FONT_SIZE: number;
  TAG_LABEL_FONT_SIZE: number;
  FIRST_BRANCH_DIRECTION: "left" | "right";
  BRANCH_COLORS: string[];
  ACTIVE_BRANCH_COLOR: string;
  TAG_COLOR: string;
  TEXT_BG_COLOR: string;
  TEXT_BG_OPACITY: number;
  EDGE_COLOR: string;
  EDGE_WIDTH: number;
  COMMIT_HEAD_COLOR: string;
  COMMIT_HEAD_STROKE: string;
  COMMIT_MAIN_BRANCH_COLOR: string;
  COMMIT_MAIN_BRANCH_STROKE: string;
  COMMIT_FEATURE_BRANCH_COLOR: string;
  COMMIT_FEATURE_BRANCH_STROKE: string;
  MAIN_BRANCH_NAME: string;
  SHOW_MERGE_TYPE_LABELS: boolean;
  MERGE_TYPE_LABEL_COLOR: string;
  REBASE_TYPE_LABEL_COLOR: string;
  GRAPH_ANIMATION_DURATION: number;
  FOCUS_NODE_TOP_OFFSET: number;
  FOCUS_NODE_BOTTOM_OFFSET: number;
  GRAPH_ROTATION?: 0 | 90 | 180 | 270;
};

export interface GitGraphProps {
  gitState: GitState;
  onCommitClick?: (commitId: string) => void;
  config?: GitGraphConfigShape;
  predictedGraphContentHeight?: number;
  demoProgress?: number;
  reserveRightColumn?: boolean;
  followMainHead?: boolean;
}

// Get branch color based on branch name
const getBranchColor = (
  branchName: string,
  isActive: boolean,
  config: GitGraphConfigShape,
): string => {
  if (branchName === config.MAIN_BRANCH_NAME)
    return config.COMMIT_MAIN_BRANCH_COLOR;
  const hash = branchName
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return config.BRANCH_COLORS[hash % config.BRANCH_COLORS.length];
};

const getCommitBranchColor = (
  branchName: string | undefined,
  config: GitGraphConfigShape,
): string => {
  if (!branchName) return config.EDGE_COLOR;
  return getBranchColor(branchName, false, config);
};

// Wrap text to fit within a maximum width
const wrapMessageText = (
  message: string,
  maxCharsPerLine: number,
): string[] => {
  const words = message.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + " " + word : word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
};

export const GitGraphComponent: React.FC<GitGraphProps> = ({
  gitState,
  onCommitClick,
  config: configProp,
  predictedGraphContentHeight,
  demoProgress,
  reserveRightColumn = true,
  followMainHead = true,
}) => {
  const MIN_ZOOM = 0.70;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

  const gitConfig = configProp ?? defaultGitConfig;
  const counterRotation = -(gitConfig.GRAPH_ROTATION || 0);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isPanning, setIsPanning] = useState( false );
  const [hasUserDragged, setHasUserDragged] = useState( false );
  const [panOffset, setPanOffset] = useState( { x: 0, y: 0 } );
  const [zoom, setZoom] = useState( 0.9 );
  const zoomRef = useRef( 0.9 );
  const panOffsetRef = useRef( { x: 0, y: 0 } );
  const hasUserDraggedRef = useRef( false );
  const panStartRef = useRef<{ x: number; y: number } | null>( null );
  const pointerStartRef = useRef<{ x: number; y: number } | null>( null );
  const panFrameRef = useRef<number | null>( null );

  useEffect( () =>
  {
    if ( !canvasRef.current ) return;

    const observer = new ResizeObserver( ( entries ) =>
    {
      const entry = entries[0];
      if ( entry ) {
        setContainerWidth( entry.contentRect.width );
        setContainerHeight( entry.contentRect.height );
      }
    } );

    observer.observe( canvasRef.current );

    return () => observer.disconnect();
  }, [] );

  useEffect( () =>
  {
    return () =>
    {
      if ( panFrameRef.current !== null ) {
        cancelAnimationFrame( panFrameRef.current );
      }
    };
  }, [] );

  useEffect( () =>
  {
    zoomRef.current = zoom;
  }, [zoom] );

  const { nodes, edges } = useMemo(() => {
    return buildCommitGraph(gitState, gitConfig.FIRST_BRANCH_DIRECTION);
  }, [gitState, gitConfig.FIRST_BRANCH_DIRECTION]);

  const maxDepth = useMemo(() => {
    if (nodes.length === 0) return 0;
    return Math.max(...nodes.map((n) => n.y));
  }, [nodes]);

  const graphContentHeight = useMemo(() => {
    if (nodes.length === 0) return gitConfig.NODE_SPACING_Y;
    return (
      (maxDepth + 1) * gitConfig.NODE_SPACING_Y + gitConfig.COMMIT_RADIUS * 2
    );
  }, [
    nodes.length,
    maxDepth,
    gitConfig.NODE_SPACING_Y,
    gitConfig.COMMIT_RADIUS,
  ]);

  const maxY = useMemo(() => {
    const baseHeight = graphContentHeight + gitConfig.OFFSET_TOP * 2;
    return containerHeight > 0
      ? Math.max(containerHeight, baseHeight)
      : baseHeight;
  }, [graphContentHeight, containerHeight, gitConfig.OFFSET_TOP]);

  const columnMetrics = useMemo(() => {
    if (nodes.length === 0) {
      return {
        minX: -1,
        maxX: 1,
        columns: 3,
        layoutMinX: -2,
        layoutMaxX: 2,
        layoutColumns: 5,
      };
    }

    let minX = Math.min(...nodes.map((n) => n.x));
    let maxX = Math.max(...nodes.map((n) => n.x));
    let columns = maxX - minX + 1;

    // Ensure at least 3 columns for centered layout
    if (columns < 3) {
      const columnsToAdd = 3 - columns;
      const addLeft = Math.floor(columnsToAdd / 2);
      const addRight = columnsToAdd - addLeft;
      minX -= addLeft;
      maxX += addRight;
      columns = maxX - minX + 1;
    }

    // Add one invisible column on both sides for smoother branch expansion.
    const layoutMinX = minX - 1;
    let layoutMaxX = maxX + 1;
    let layoutColumns = layoutMaxX - layoutMinX + 1;

    // Keep total layout columns odd to preserve stable centering.
    if ( layoutColumns % 2 === 0 ) {
      layoutMaxX += 1;
      layoutColumns += 1;
    }

    return {
      minX,
      maxX,
      columns,
      layoutMinX,
      layoutMaxX,
      layoutColumns,
    };
  }, [nodes, reserveRightColumn]);

  const activeBranchCount = useMemo( () =>
  {
    const uniqueBranches = new Set<string>();

    // Add all branches from nodes that are still in gitState (not merged/deleted)
    for ( const node of nodes ) {
      if ( node.commit.branch && gitState.branches.has( node.commit.branch ) ) {
        uniqueBranches.add( node.commit.branch );
      }
    }

    // Always ensure main is counted if any commits exist
    if ( nodes.length > 0 ) {
      uniqueBranches.add( gitConfig.MAIN_BRANCH_NAME );
    }

    return Math.max( uniqueBranches.size, 1 );
  }, [nodes, gitState.branches, gitConfig.MAIN_BRANCH_NAME] );

  const computedAutoZoom = useMemo( () =>
  {
    if ( activeBranchCount <= 3 ) return 1.0;
    const zoomOut = ( activeBranchCount - 3 ) * 0.25;
    return Math.max( MIN_ZOOM, 1.0 - zoomOut );
  }, [activeBranchCount] );

  useEffect( () =>
  {
    setZoom( computedAutoZoom );
    zoomRef.current = computedAutoZoom;
  }, [computedAutoZoom] );

  // Calculate center offset for negative x values
  const centerOffsetX = useMemo(() => {
    return -columnMetrics.layoutMinX;
  }, [columnMetrics.layoutMinX] );

  // Calculate graph content width
  const graphContentWidth = useMemo( () =>
  {
    return (
      ( columnMetrics.layoutColumns - 1 ) * gitConfig.NODE_SPACING_X +
      gitConfig.COMMIT_RADIUS * 2
    );
  }, [
    columnMetrics,
    gitConfig.NODE_SPACING_X,
    gitConfig.COMMIT_RADIUS,
  ]);

  const maxX = useMemo( () =>
  {
    const isVerticalGraph = Math.abs( counterRotation ) % 180 === 0;

    if ( isVerticalGraph && containerWidth > 0 ) {
      return containerWidth;
    }

    return graphContentWidth + gitConfig.OFFSET_LEFT * 2;
  }, [
    graphContentWidth,
    containerWidth,
    counterRotation,
    gitConfig.OFFSET_LEFT,
  ] );

  const rightColumnAnchor = useMemo(() => {
    if ( nodes.length === 0 ) return null;
    const maxY = Math.max(...nodes.map((n) => n.y));
    return { x: columnMetrics.layoutMaxX, y: maxY };
  }, [nodes, columnMetrics.layoutMaxX] );

  const leftColumnAnchor = useMemo(() => {
    if ( nodes.length === 0 ) return { x: columnMetrics.layoutMinX, y: 0 };
    const maxY = Math.max(...nodes.map((n) => n.y));
    return { x: columnMetrics.layoutMinX, y: maxY };
  }, [nodes, columnMetrics.layoutMinX] );

  const verticalOffset = useMemo(() => {
    const availableHeight = maxY;
    const contentHeight = graphContentHeight;
    return Math.max(
      gitConfig.OFFSET_TOP,
      (availableHeight - contentHeight) / 2,
    );
  }, [maxY, graphContentHeight, gitConfig.OFFSET_TOP]);

  const lastTranslateYRef = useRef<number | null>(null);
  const prevMaxDepthRef = useRef<number>(maxDepth);

  // Transform node positions to SVG coordinates
  const getNodeX = (x: number) =>
    ( x + centerOffsetX ) * gitConfig.NODE_SPACING_X + gitConfig.COMMIT_RADIUS;
  const getNodeY = (y: number) =>
    maxY - (y * gitConfig.NODE_SPACING_Y + gitConfig.COMMIT_RADIUS);
  const getNodeYForFollow = (y: number) =>
    maxY - (y * gitConfig.NODE_SPACING_Y + gitConfig.COMMIT_RADIUS);

  const currentCommit = getCurrentCommit(gitState);
  const currentCommitNode = useMemo(() => {
    if (!currentCommit) return null;
    return nodes.find((node) => node.commit.id === currentCommit.id) ?? null;
  }, [currentCommit, nodes]);

  const currentBranchHeadNode = useMemo( () =>
  {
    if ( !gitState.currentBranch ) return null;
    const branch = gitState.branches.get( gitState.currentBranch );
    if ( !branch || !branch.headCommitId ) return null;
    return nodes.find( ( node ) => node.commit.id === branch.headCommitId ) ?? null;
  }, [gitState.currentBranch, gitState.branches, nodes] );

  const handleCanvasPointerDown = ( event: React.PointerEvent<HTMLDivElement> ) =>
  {
    if ( event.button !== 0 ) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    panStartRef.current = panOffsetRef.current;
    setIsPanning( true );
    event.currentTarget.setPointerCapture( event.pointerId );
  };

  const handleCanvasPointerMove = ( event: React.PointerEvent<HTMLDivElement> ) =>
  {
    if ( !isPanning || !pointerStartRef.current || !panStartRef.current ) return;

    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;

    if ( !hasUserDraggedRef.current && Math.hypot( deltaX, deltaY ) > 3 ) {
      hasUserDraggedRef.current = true;
      setHasUserDragged( true );
    }

    panOffsetRef.current = {
      x: panStartRef.current.x + deltaX,
      y: panStartRef.current.y + deltaY,
    };

    if ( panFrameRef.current === null ) {
      panFrameRef.current = requestAnimationFrame( () =>
      {
        setPanOffset( panOffsetRef.current );
        panFrameRef.current = null;
      } );
    }
  };

  const handleCanvasPointerEnd = ( event: React.PointerEvent<HTMLDivElement> ) =>
  {
    if ( !isPanning ) return;
    setIsPanning( false );
    if ( panFrameRef.current !== null ) {
      cancelAnimationFrame( panFrameRef.current );
      panFrameRef.current = null;
    }
    setPanOffset( panOffsetRef.current );
    panStartRef.current = null;
    pointerStartRef.current = null;
    if ( event.currentTarget.hasPointerCapture( event.pointerId ) ) {
      event.currentTarget.releasePointerCapture( event.pointerId );
    }
  };

  const applyZoom = ( nextZoom: number ) =>
  {
    const clampedZoom = Math.max( MIN_ZOOM, Math.min( MAX_ZOOM, +nextZoom.toFixed( 2 ) ) );
    const prevZoom = zoomRef.current;

    if ( clampedZoom === prevZoom ) return;

    if ( containerWidth <= 0 || containerHeight <= 0 ) {
      zoomRef.current = clampedZoom;
      setZoom( clampedZoom );
      return;
    }

    const zoomRatio = clampedZoom / prevZoom;
    const viewportCenterX = containerWidth / 2;
    const viewportCenterY = containerHeight / 2;
    const originX = maxX / 2;
    const originY = maxY / 2;

    const currentTranslateX = autoMainCenterTranslateX + ( hasUserDraggedRef.current ? panOffsetRef.current.x : 0 );
    const currentTranslateY = autoGraphTranslateY + panOffsetRef.current.y;

    const nextPan = {
      x: hasUserDraggedRef.current
        ? viewportCenterX -
        autoMainCenterTranslateX -
        originX -
        ( viewportCenterX - currentTranslateX - originX ) * zoomRatio
        : 0,
      y:
        viewportCenterY -
        autoGraphTranslateY -
        originY -
        ( viewportCenterY - currentTranslateY - originY ) * zoomRatio,
    };

    panOffsetRef.current = nextPan;
    setPanOffset( nextPan );
    zoomRef.current = clampedZoom;
    setZoom( clampedZoom );
  };

  const handleZoomIn = () =>
  {
    applyZoom( zoomRef.current + ZOOM_STEP );
  };

  const handleZoomOut = () =>
  {
    applyZoom( zoomRef.current - ZOOM_STEP );
  };

  const handleResetView = () =>
  {
    setZoom( 1 );
    zoomRef.current = 1;
    hasUserDraggedRef.current = false;
    setHasUserDragged( false );
    panOffsetRef.current = { x: 0, y: 0 };
    setPanOffset( { x: 0, y: 0 } );
  };

  const autoMainCenterTranslateX = useMemo( () =>
  {
    const viewportCenterX = containerWidth > 0 ? containerWidth / 2 : maxX / 2;
    const originX = maxX / 2;
    const targetBranchX = currentBranchHeadNode ? currentBranchHeadNode.x : 0;
    const branchNodeX = getNodeX( targetBranchX );

    if ( !currentBranchHeadNode ) {
      return 0;
    }

    const nodeScreenXWithZoom = branchNodeX * zoom;
    const leftBound = -containerWidth * 0.1;
    const rightBound = containerWidth * 1.1;

    const isInViewport = nodeScreenXWithZoom >= leftBound && nodeScreenXWithZoom <= rightBound;

    if ( isInViewport ) {
      return 0;
    }

    return originX + ( viewportCenterX - originX ) / zoom - branchNodeX;
  }, [containerWidth, maxX, zoom, centerOffsetX, gitConfig.NODE_SPACING_X, gitConfig.COMMIT_RADIUS, currentBranchHeadNode] );

  const graphTranslateX = autoMainCenterTranslateX + ( hasUserDragged ? panOffset.x : 0 );
  const autoGraphTranslateY = useMemo( () =>
  {
    const baseTranslate = -verticalOffset;

    if (containerHeight <= 0) {
      lastTranslateYRef.current = null;
      return baseTranslate;
    }

    if (graphContentHeight <= containerHeight) {
      lastTranslateYRef.current = null;
      return baseTranslate;
    }

    const minTranslate = baseTranslate - (graphContentHeight - containerHeight);
    const maxTranslate = baseTranslate;
    const currentTranslate = lastTranslateYRef.current ?? baseTranslate;

    const shouldFocusNewRow = maxDepth > prevMaxDepthRef.current;
    if (shouldFocusNewRow) {
      const targetY = containerHeight * 0.6;
      const newRowY = getNodeYForFollow(maxDepth);
      const focusTranslate = targetY - newRowY;
      const clampedTranslate = Math.max(
        minTranslate,
        Math.min(focusTranslate, maxTranslate),
      );

      lastTranslateYRef.current = clampedTranslate;
      prevMaxDepthRef.current = maxDepth;
      return clampedTranslate;
    }

    prevMaxDepthRef.current = maxDepth;

    if (followMainHead && currentCommitNode) {
      const nodeY = getNodeYForFollow(currentCommitNode.y);
      const screenY = nodeY + currentTranslate;
      const topBound = gitConfig.FOCUS_NODE_TOP_OFFSET;
      const bottomBound = containerHeight - gitConfig.FOCUS_NODE_BOTTOM_OFFSET;
      const isOutOfView = screenY < topBound || screenY > bottomBound;

      if (isOutOfView) {
        const targetY = containerHeight * 0.8;
        const focusTranslate = targetY - nodeY;
        const clampedTranslate = Math.max(
          minTranslate,
          Math.min(focusTranslate, maxTranslate),
        );
        lastTranslateYRef.current = clampedTranslate;
        return clampedTranslate;
      }
    }

    lastTranslateYRef.current = currentTranslate;
    return currentTranslate;
  }, [
    verticalOffset,
    containerHeight,
    graphContentHeight,
    gitConfig.OFFSET_TOP,
    gitConfig.FOCUS_NODE_TOP_OFFSET,
    gitConfig.FOCUS_NODE_BOTTOM_OFFSET,
    maxDepth,
    maxY,
    followMainHead,
    currentCommitNode,
  ]);
  const graphTranslateY = autoGraphTranslateY + panOffset.y;

  return (
    <div className="w-full h-full bg-slate-800 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-700 px-4 py-3 bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-row flex-wrap gap-x-5 items-center">
            <p className="text-lg font-medium text-slate-300">Git Graph</p>
            <p className="text-md text-slate-500">
              {nodes.length} commits • {gitState.branches.size} branches
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              className="px-2 py-1 text-slate-300 border border-slate-600 rounded hover:bg-slate-800 transition-colors"
            >
              -
            </button>
            <span className="text-slate-300 text-sm w-14 text-center">
              {Math.round( zoom * 100 )}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-2 py-1 text-slate-300 border border-slate-600 rounded hover:bg-slate-800 transition-colors"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="px-2 py-1 text-slate-300 border border-slate-600 rounded hover:bg-slate-800 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={canvasRef}
        className={`flex flex-1 overflow-auto scrollbar-hide select-none ${ isPanning ? "cursor-grabbing" : "cursor-grab" }`}
        style={{ touchAction: "none" }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerEnd}
        onPointerLeave={handleCanvasPointerEnd}
        onPointerCancel={handleCanvasPointerEnd}
      >
        {nodes.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-lg">
            No commits yet
          </div>
        ) : (
          <svg
            width={maxX}
            height={maxY}
            className="bg-slate-750 self-center-safe"
            style={{ minWidth: "100%", minHeight: "100%" }}
          >
              <title>SVG</title>
            <defs>
              <style>{`
                  @keyframes pulse {
                      0%, 100% {
                          stroke-width: 2;
                      }
                      50% {
                          stroke-width: 3;
                      }
                  }
              `}</style>
            </defs>
            <motion.g
              initial={false}
              animate={{
                x: graphTranslateX,
                y: graphTranslateY,
                rotate: gitConfig.GRAPH_ROTATION || 0,
                scale: zoom,
              }}
              style={{
                transformOrigin: `${maxX / 2}px ${maxY / 2}px`,
              }}
              transition={{
                duration: isPanning ? 0 : Math.max( 0.25, gitConfig.GRAPH_ANIMATION_DURATION / 1000 ),
                ease: "easeInOut",
              }}
            >
                {rightColumnAnchor && (
                <circle
                  cx={getNodeX(rightColumnAnchor.x)}
                  cy={getNodeY(rightColumnAnchor.y)}
                  r={gitConfig.COMMIT_RADIUS}
                  fill="red"
                  stroke="transparent"
                  opacity="0"
                  pointerEvents="none"
                />
              )}
                <circle
                cx={getNodeX(leftColumnAnchor.x)}
                cy={getNodeY(leftColumnAnchor.y)}
                r={gitConfig.COMMIT_RADIUS}
                fill="red"
                stroke="transparent"
                opacity="0"
                pointerEvents="none"
              />
              {/* Draw edges (commit parent-child relationships) */}
              <AnimatePresence>
                {edges.map((edge) => {
                  const animationDuration =
                    gitConfig.GRAPH_ANIMATION_DURATION / 1000;
                  const x1 = getNodeX(edge.fromX);
                  const y1 = getNodeY(edge.fromY);
                  const x2 = getNodeX(edge.toX);
                  const y2 = getNodeY(edge.toY);

                  // Check if this edge crosses columns (branches) or is a merge
                  const isCrossingBranches = edge.fromX !== edge.toX;

                  // Determine if branch is going left or right
                  const isGoingLeft = edge.toX < edge.fromX;

                  // Check if this is a merge edge (going back to main/parent branch)
                  // Merge: from feature branch back to main (left to center or right to center)
                  const toCommit = gitState.commits.get(edge.toCommitId);
                  const fromCommit = gitState.commits.get(edge.fromCommitId);
                  const isMergeEdge =
                    toCommit?.parentIds && toCommit.parentIds.length > 1;

                  // Helper to get branch name, defaulting to main if branch no longer exists
                  const getValidBranch = (branch: string | undefined) => {
                    if (!branch) return gitConfig.MAIN_BRANCH_NAME;
                    return gitState.branches.has(branch)
                      ? branch
                      : gitConfig.MAIN_BRANCH_NAME;
                  };

                  const mergeSourceBranch =
                    fromCommit?.branch &&
                    fromCommit.branch !== gitConfig.MAIN_BRANCH_NAME
                      ? getValidBranch(fromCommit.branch)
                      : getValidBranch(toCommit?.branch);
                  const edgeColor = isMergeEdge
                    ? getCommitBranchColor(mergeSourceBranch, gitConfig)
                    : getCommitBranchColor(
                        getValidBranch(toCommit?.branch || fromCommit?.branch),
                        gitConfig,
                      );

                  // Create curved path for branch connections
                  let pathD: string;
                  if (isCrossingBranches) {
                    const dx = x2 - x1;
                    const dy = y2 - y1;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Calculate vertical and horizontal distances in levels
                    const verticalLevels = Math.abs(edge.toY - edge.fromY);
                    const horizontalLevels = Math.abs(edge.toX - edge.fromX);

                    // Use cubic bezier for mostly vertical movements that meet threshold
                    // For merge edges: always use cubic if vertical distance is enough
                    // For regular branches: exclude initial branch arcs (where horizontal and vertical movement are equal or horizontal dominates)
                    const isInitialBranchArc =
                      horizontalLevels > 0 &&
                      verticalLevels <= horizontalLevels;
                    const shouldUseMergeCurveTail =
                      isMergeEdge && verticalLevels > 1;
                    const shouldUseBranchCurveTail =
                      isInitialBranchArc &&
                      horizontalLevels > 1 &&
                      !isMergeEdge;
                    const shouldUseCubicCurve =
                      verticalLevels >= gitConfig.LONG_DISTANCE_THRESHOLD &&
                      !shouldUseMergeCurveTail &&
                      !shouldUseBranchCurveTail &&
                      (isMergeEdge || !isInitialBranchArc);

                    if (shouldUseBranchCurveTail) {
                      const direction = Math.sign(dx) || 1;
                      const tailEndX =
                        x2 - direction * gitConfig.NODE_SPACING_X;
                      const controlPointOffset =
                        gitConfig.CUBIC_CURVE_CONTROL_POINT;
                      const tailDx = x2 - tailEndX;
                      const tailDy = y2 - y1;

                      const cp1X = tailEndX + tailDx * controlPointOffset;
                      const cp1Y = y1;

                      const cp2X = x2;
                      const cp2Y = y2 - tailDy * controlPointOffset;

                      pathD = `M ${x1} ${y1} L ${tailEndX} ${y1} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${x2} ${y2}`;
                    } else if (shouldUseMergeCurveTail) {
                      const direction = Math.sign(dy) || 1;
                      const tailStartY =
                        y2 - direction * gitConfig.NODE_SPACING_Y;
                      const tailStartYClamped =
                        direction > 0
                          ? Math.max(y1, tailStartY)
                          : Math.min(y1, tailStartY);
                      const tailDx = x2 - x1;
                      const tailDy = y2 - tailStartYClamped;
                      const controlPointOffset =
                        gitConfig.CUBIC_CURVE_CONTROL_POINT;

                      const cp1X = gitConfig.INVERT_CUBIC_CURVES
                        ? x2 - tailDx * controlPointOffset
                        : x1 + tailDx * controlPointOffset;
                      const cp1Y = gitConfig.INVERT_CUBIC_CURVES
                        ? y2
                        : tailStartYClamped;

                      const cp2X = gitConfig.INVERT_CUBIC_CURVES
                        ? x1 + tailDx * controlPointOffset
                        : x2 - tailDx * controlPointOffset;
                      const cp2Y = gitConfig.INVERT_CUBIC_CURVES
                        ? tailStartYClamped
                        : y2;

                      pathD = `M ${x1} ${y1} L ${x1} ${tailStartYClamped} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${x2} ${y2}`;
                    } else if (shouldUseCubicCurve) {
                      // Cubic bezier with two control points for smoother long-distance curves
                      const controlPointOffset =
                        gitConfig.CUBIC_CURVE_CONTROL_POINT;

                      // First control point: move horizontally from start
                      // Second control point: move horizontally to end
                      // Invert swaps the control point positions
                      const cp1X = gitConfig.INVERT_CUBIC_CURVES
                        ? x2 - dx * controlPointOffset
                        : x1 + dx * controlPointOffset;
                      const cp1Y = gitConfig.INVERT_CUBIC_CURVES ? y2 : y1;

                      const cp2X = gitConfig.INVERT_CUBIC_CURVES
                        ? x1 + dx * controlPointOffset
                        : x2 - dx * controlPointOffset;
                      const cp2Y = gitConfig.INVERT_CUBIC_CURVES ? y1 : y2;

                      pathD = `M ${x1} ${y1} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${x2} ${y2}`;
                    } else {
                      // Use quadratic bezier curve for short distances
                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2;
                      const offset = distance * gitConfig.ARC_CURVATURE;
                      // Calculate perpendicular offset (rotate 90 degrees)
                      // Flip based on direction and whether it's a merge
                      // Merge arcs are flipped 180 degrees from branch arcs
                      // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
                      let perpX, perpY;
                      if (isMergeEdge) {
                        // Flip the arc for merge commits
                        perpX = isGoingLeft
                          ? (-dy / distance) * offset
                          : (dy / distance) * offset;
                        perpY = isGoingLeft
                          ? (dx / distance) * offset
                          : (-dx / distance) * offset;
                      } else {
                        // Normal branch arc
                        perpX = !isGoingLeft
                          ? (-dy / distance) * offset
                          : (dy / distance) * offset;
                        perpY = !isGoingLeft
                          ? (dx / distance) * offset
                          : (-dx / distance) * offset;
                      }
                      const controlX = midX + perpX;
                      const controlY = midY + perpY;
                      pathD = `M ${x1} ${y1} Q ${controlX} ${controlY}, ${x2} ${y2}`;
                    }
                  } else {
                    // Straight line for same column
                    pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
                  }

                  return (
                    <motion.path
                      key={`edge-${edge.fromCommitId}-${edge.toCommitId}`}
                      stroke={edgeColor}
                      strokeWidth={gitConfig.EDGE_WIDTH}
                      fill="none"
                      strokeLinecap="round"
                      initial={{ d: pathD, pathLength: 0, opacity: 0 }}
                      animate={{ d: pathD, pathLength: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: animationDuration,
                        ease: "easeOut",
                      }}
                    />
                  );
                })}
              </AnimatePresence>

              {/* Draw commit nodes */}
              <AnimatePresence>
                {nodes.map((node) => {
                  const animationDuration =
                    gitConfig.GRAPH_ANIMATION_DURATION / 1000;
                  const x = getNodeX(node.x);
                  const y = getNodeY(node.y);

                  const isHead = currentCommit?.id === node.commit.id;
                  const branchHeads = isCommitBranchHead(
                    gitState,
                    node.commit.id,
                  );
                  const tags = getCommitTags(gitState, node.commit.id);
                  const hashFontSize = gitConfig.COMMIT_HASH_FONT_SIZE;
                  const messageFontSize = gitConfig.COMMIT_MESSAGE_FONT_SIZE;
                  const branchFontSize = gitConfig.BRANCH_LABEL_FONT_SIZE;
                  const tagFontSize = gitConfig.TAG_LABEL_FONT_SIZE;
                  const hashPaddingY = 3;
                  const hashHeight = hashFontSize + hashPaddingY * 2;
                  const hashRectY =
                    gitConfig.MESSAGE_OFFSET - hashFontSize - hashPaddingY;
                  const branchLabelHeight = branchFontSize + 6;
                  const branchLabelGap = 2;
                  const branchLabelStartY = hashRectY - branchLabelHeight - 4;
                  const mergeLabelYOffset =
                    branchHeads.length * (branchLabelHeight + branchLabelGap);
                  const messageLineHeight = messageFontSize + 2;
                  const messageStartY = 1 + gitConfig.MESSAGE_OFFSET;
                  const tagHeight = tagFontSize + 6;

                  return (
                    <motion.g
                      key={node.commit.id}
                      initial={{ x: x, y: y, opacity: 0, scale: 0 }}
                      animate={{ x: x, y: y, opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{
                        type: "tween",
                        duration: animationDuration,
                        ease: "easeOut",
                        opacity: { duration: Math.min(0.3, animationDuration) },
                        scale: { duration: Math.min(0.3, animationDuration) },
                      }}
                    >
                      {/* Main commit circle */}
                      {(() => {
                        // If the commit's branch no longer exists, treat it as main branch
                        const commitBranch =
                          node.commit.branch &&
                          gitState.branches.has(node.commit.branch)
                            ? node.commit.branch
                            : gitConfig.MAIN_BRANCH_NAME;
                        const isMainBranch =
                          commitBranch === gitConfig.MAIN_BRANCH_NAME;
                        const branchColor = getCommitBranchColor(
                          commitBranch,
                          gitConfig,
                        );
                        let fillColor: string;
                        let strokeColor: string;

                        if (isHead) {
                          fillColor = gitConfig.COMMIT_HEAD_COLOR;
                          strokeColor = gitConfig.COMMIT_HEAD_STROKE;
                        } else if (isMainBranch) {
                          fillColor = gitConfig.COMMIT_MAIN_BRANCH_COLOR;
                          strokeColor = gitConfig.COMMIT_MAIN_BRANCH_STROKE;
                        } else {
                          fillColor = branchColor;
                          strokeColor = branchColor;
                        }

                        return (
                          // biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
                          <circle
                            cx={0}
                            cy={0}
                            r={gitConfig.COMMIT_RADIUS}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2"
                            cursor="pointer"
                            onClick={() => onCommitClick?.(node.commit.id)}
                            className="hover:opacity-80 transition-opacity"
                          />
                        );
                      })()}

                      {gitConfig.SHOW_TEXT_LABELS && (
                        <>
                          {/* Commit hash background */}
                          <rect
                            x={gitConfig.COMMIT_RADIUS + 8}
                            y={hashRectY}
                            width={50}
                            height={hashHeight}
                            fill={gitConfig.TEXT_BG_COLOR}
                            rx="2"
                            opacity={gitConfig.TEXT_BG_OPACITY.toString()}
                          />

                          {/* Commit hash text (abbreviated) */}
                          <text
                            x={gitConfig.COMMIT_RADIUS + 12}
                            y={gitConfig.MESSAGE_OFFSET}
                            fill="#e2e8f0"
                            fontSize={hashFontSize}
                            fontFamily="monospace"
                            className="pointer-events-none select-none"
                            transform={`rotate(${counterRotation} ${gitConfig.COMMIT_RADIUS + 12} ${gitConfig.MESSAGE_OFFSET})`}
                          >
                            {node.commit.id.substring(0, 6)}
                          </text>
                        </>
                      )}

                      {/* Branch labels - positioned above message */}
                      {gitConfig.SHOW_TEXT_LABELS &&
                        branchHeads.map((branchName, idx) => (
                          <g key={`branch-${branchName}`}>
                            {(() => {
                              const branchLabelY =
                                branchLabelStartY -
                                idx * (branchLabelHeight + branchLabelGap);
                              const bN =
                                branchName === gitState.currentBranch
                                  ? `* ${branchName}`
                                  : branchName;
                              return (
                                <>
                                  <rect
                                    x={gitConfig.COMMIT_RADIUS + 8}
                                    y={branchLabelY}
                                    width={Math.max(40, bN.length * 7)}
                                    height={branchLabelHeight}
                                    fill={getBranchColor(
                                      branchName,
                                      branchName === gitState.currentBranch,
                                      gitConfig,
                                    )}
                                    rx="3"
                                    opacity="0.8"
                                  />
                                  <text
                                    x={gitConfig.COMMIT_RADIUS + 12}
                                    y={branchLabelY + branchFontSize + 2}
                                    fill="white"
                                    fontSize={branchFontSize}
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                    className="pointer-events-none select-none"
                                    transform={`rotate(${counterRotation} ${gitConfig.COMMIT_RADIUS + 12} ${branchLabelY + branchFontSize + 2})`}
                                  >
                                    {bN}
                                  </text>
                                </>
                              );
                            })()}
                          </g>
                        ))}

                      {/* Merge type label - positioned after branch labels */}
                      {gitConfig.SHOW_TEXT_LABELS &&
                        gitConfig.SHOW_MERGE_TYPE_LABELS &&
                        node.commit.mergeType &&
                        (() => {
                          const branchLabelOffset = mergeLabelYOffset;
                          let labelColor: string;
                          let labelText: string;

                          switch (node.commit.mergeType) {
                            case "merge":
                              labelColor = gitConfig.MERGE_TYPE_LABEL_COLOR;
                              labelText = "MERGE";
                              break;
                            case "rebase":
                              labelColor = gitConfig.REBASE_TYPE_LABEL_COLOR;
                              labelText = "REBASE";
                              break;
                            default:
                              // Only "merge" and "rebase" can be commit labels
                              // Squash merges do not create labeled commits
                              return null;
                          }

                          return (
                            <g>
                              <rect
                                x={gitConfig.COMMIT_RADIUS + 8}
                                y={branchLabelStartY - branchLabelOffset}
                                width={Math.max(50, labelText.length * 5 + 8)}
                                height={branchLabelHeight}
                                fill={labelColor}
                                rx="3"
                                opacity="0.9"
                              />
                              <text
                                x={gitConfig.COMMIT_RADIUS + 12}
                                y={
                                  branchLabelStartY -
                                  branchLabelOffset +
                                  branchFontSize +
                                  2
                                }
                                fill="white"
                                fontSize={branchFontSize}
                                fontFamily="monospace"
                                fontWeight="bold"
                                className="pointer-events-none select-none"
                                transform={`rotate(${counterRotation} ${gitConfig.COMMIT_RADIUS + 12} ${branchLabelStartY - branchLabelOffset + branchFontSize + 2})`}
                              >
                                {labelText}
                              </text>
                            </g>
                          );
                        })()}

                      {gitConfig.SHOW_TEXT_LABELS && (
                        <>
                          {/* Commit message background - sized for wrapped text */}
                          {(() => {
                            const lines = wrapMessageText(
                              node.commit.message,
                              gitConfig.MESSAGE_WRAP_LENGTH,
                            );
                            const bgHeight = Math.max(
                              messageLineHeight + 4,
                              lines.length * messageLineHeight + 4,
                            );
                            // Calculate width based on longest line
                            const maxLineLength = Math.max(
                              ...lines.map((l) => l.length),
                            );
                            const averageCharWidth = messageFontSize * 0.6;
                            const bgWidth = Math.max(
                              60,
                              Math.ceil(maxLineLength * averageCharWidth) + 8,
                            );
                            return (
                              <rect
                                x={gitConfig.COMMIT_RADIUS + 8}
                                y={messageStartY}
                                width={bgWidth}
                                height={bgHeight}
                                fill={gitConfig.TEXT_BG_COLOR}
                                rx="2"
                                opacity={gitConfig.TEXT_BG_OPACITY.toString()}
                              />
                            );
                          })()}

                          {/* Commit message with wrapping */}
                          {(() => {
                            const lines = wrapMessageText(
                              node.commit.message,
                              gitConfig.MESSAGE_WRAP_LENGTH,
                            );
                            return (
                              <text
                                x={gitConfig.COMMIT_RADIUS + 12}
                                y={messageStartY + messageFontSize}
                                fill="#cbd5e1"
                                fontSize={messageFontSize}
                                fontFamily="monospace"
                                className="pointer-events-none select-none"
                                transform={`rotate(${counterRotation} ${gitConfig.COMMIT_RADIUS + 12} ${messageStartY + messageFontSize})`}
                              >
                                {lines.map((line, idx) => (
                                  <tspan
                                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                                    key={idx}
                                    x={gitConfig.COMMIT_RADIUS + 12}
                                    dy={idx === 0 ? 0 : messageLineHeight}
                                  >
                                    {line}
                                  </tspan>
                                ))}
                              </text>
                            );
                          })()}
                        </>
                      )}

                      {/* Tag labels - positioned below message */}
                      {gitConfig.SHOW_TEXT_LABELS &&
                        tags.map((tag, idx) => {
                          const messageLines = wrapMessageText(
                            node.commit.message,
                            gitConfig.MESSAGE_WRAP_LENGTH,
                          );
                          const messageHeight = Math.max(
                            messageLineHeight + 4,
                            messageLines.length * messageLineHeight + 4,
                          );
                          const tagY =
                            messageStartY +
                            messageHeight +
                            8 +
                            idx * (tagHeight + branchLabelGap);
                          return (
                            <g key={`tag-${tag.name}`}>
                              <rect
                                x={gitConfig.COMMIT_RADIUS + 8}
                                y={tagY}
                                width={Math.max(40, tag.name.length * 5 + 8)}
                                height={tagHeight}
                                fill={gitConfig.TAG_COLOR}
                                rx="3"
                                opacity="0.8"
                              />
                              <text
                                x={gitConfig.COMMIT_RADIUS + 12}
                                y={tagY + tagFontSize + 2}
                                fill="white"
                                fontSize={tagFontSize}
                                fontFamily="monospace"
                                fontWeight="bold"
                                className="pointer-events-none select-none"
                                transform={`rotate(${counterRotation} ${gitConfig.COMMIT_RADIUS + 12} ${tagY + tagFontSize + 2})`}
                              >
                                tag: {tag.name}
                              </text>
                            </g>
                          );
                        })}
                    </motion.g>
                  );
                })}
              </AnimatePresence>

              {/* Floating HEAD indicator that animates smoothly to current HEAD */}
              {currentCommit &&
                (() => {
                  const headNode = nodes.find(
                    (n) => n.commit.id === currentCommit.id,
                  );
                  if (!headNode) return null;
                  const headX = getNodeX(headNode.x);
                  const headY = getNodeY(headNode.y);
                  const animationDuration =
                    gitConfig.GRAPH_ANIMATION_DURATION / 1000;
                  return (
                    <motion.circle
                      cx={headX}
                      cy={headY}
                      r={gitConfig.COMMIT_RADIUS + 6}
                      fill="none"
                      stroke={gitConfig.COMMIT_HEAD_COLOR}
                      strokeWidth="2"
                      strokeDasharray="4,2"
                      opacity="0.6"
                      pointerEvents="none"
                      animate={{ cx: headX, cy: headY }}
                      transition={{
                        type: "tween",
                        duration: animationDuration,
                        ease: "easeOut",
                      }}
                      style={{
                        animation: "pulse 1.5s ease-in-out infinite",
                      }}
                    />
                  );
                })()}
            </motion.g>
          </svg>
        )}
      </div>

      {/* Legend */}
      <div className="border-t border-slate-700 px-4 py-2 bg-slate-900 text-md text-slate-400 space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: gitConfig.COMMIT_HEAD_COLOR }}
          ></div>
          <span>Current HEAD</span>
          {/* <div className="px-2 py-0.5 rounded text-white text-xs ml-4" style={{ backgroundColor: gitConfig.TAG_COLOR }}>
                        tag
                    </div> */}
        </div>
      </div>
    </div>
  );
};
