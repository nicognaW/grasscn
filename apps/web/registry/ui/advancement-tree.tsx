"use client";

import * as React from "react";

import { Badge } from "./badge";
import { advancementBackground } from "./minecraft-advancement-assets";
import { minecraftBadgeAssets } from "./minecraft-badge-assets";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./tooltip";

import "./minecraft-advancement-tree.css";

interface AdvancementTreeScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

interface AdvancementNode {
  id: string;
  parentId?: string;
  x: number;
  y: number;
  title: string;
  description?: string;
  kind?: "task" | "goal" | "challenge";
  completed?: boolean;
  hidden?: boolean;
  icon?: React.ReactNode;
}

interface AdvancementPan {
  x: number;
  y: number;
}

type AdvancementTreeProps = React.ComponentProps<"div"> & {
  nodes: readonly AdvancementNode[];
  scale?: 1 | 2 | 3;
  selectedId?: string;
  defaultSelectedId?: string;
  onSelectedIdChange?: (id: string) => void;
  pan?: AdvancementPan;
  defaultPan?: AdvancementPan;
  onPanChange?: (pan: AdvancementPan) => void;
  width?: number;
  height?: number;
  background?: string;
};

const AdvancementTree = ({
  nodes,
  scale = 2,
  selectedId,
  defaultSelectedId,
  onSelectedIdChange,
  pan,
  defaultPan,
  onPanChange,
  width = 234,
  height = 113,
  background = advancementBackground,
  className,
  style,
  ref: forwardedRef,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onClickCapture,
  onDragStart,
  ...props
}: AdvancementTreeProps) => {
  const ids = new Set<string>();

  for (const node of nodes) {
    if (ids.has(node.id)) {
      throw new Error(`Duplicate advancement id: ${node.id}`);
    }

    ids.add(node.id);

    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      throw Error("Advancement positions must be finite");
    }
  }

  const points = nodes.map((node) => ({
    ...node,
    px: Math.floor(Math.fround(node.x * 28)),
    py: Math.floor(Math.fround(node.y * 27)),
  }));

  const positions = new Map(points.map((node) => [node.id, node]));

  for (const node of nodes) {
    if (node.parentId && !ids.has(node.parentId)) {
      throw new Error(`Missing advancement parent: ${node.parentId}`);
    }

    const visited = new Set([node.id]);
    let parent = node.parentId;

    while (parent) {
      if (visited.has(parent)) {
        throw new Error("Advancement parents must not form a cycle");
      }

      visited.add(parent);
      parent = positions.get(parent)?.parentId;
    }
  }

  const initial = () => {
    if (defaultPan) {
      return defaultPan;
    }

    if (!points.length) {
      return { x: 0, y: 0 };
    }

    return {
      x:
        Math.floor(width / 2) -
        Math.trunc(
          (Math.min(...points.map((n) => n.px)) +
            Math.max(...points.map((n) => n.px + 28))) /
            2
        ),
      y:
        Math.floor(height / 2) -
        Math.trunc(
          (Math.min(...points.map((n) => n.py)) +
            Math.max(...points.map((n) => n.py + 27))) /
            2
        ),
    };
  };

  const [offset, setOffset] = React.useState<AdvancementPan>(initial);
  const [selection, setSelection] = React.useState(defaultSelectedId);
  const root = React.useRef<HTMLDivElement>(null);

  const drag = React.useRef<{
    x: number;
    y: number;
    pan: AdvancementPan;
    id: number;
  } | null>(null);

  const suppressClick = React.useRef(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [tooltipId, setTooltipId] = React.useState<string | null>(null);

  React.useImperativeHandle(forwardedRef, () => root.current!, []);

  const position = pan ?? offset;
  const current = selectedId ?? selection;

  const updatePan = (next: AdvancementPan) => {
    const value = { x: Math.floor(next.x), y: Math.floor(next.y) };

    if (!pan) {
      setOffset(value);
    }

    onPanChange?.(value);
  };

  const choose = (id: string) => {
    if (selectedId === undefined) {
      setSelection(id);
    }

    onSelectedIdChange?.(id);
  };

  const visible = points.filter((node) => !node.hidden || node.completed);

  const paths = (outline: boolean) =>
    visible.flatMap((node) => {
      const parent = node.parentId && positions.get(node.parentId);

      if (!parent) {
        return [];
      }

      const ax = parent.px + 13;
      const bx = parent.px + 30;
      const ay = parent.py + 13;
      const cx = node.px + 13;
      const cy = node.py + 13;

      return outline
        ? [
            {
              h: 1,
              w: Math.abs(bx + 1 - ax) + 1,
              x: Math.min(bx + 1, ax),
              y: ay,
            },
            {
              h: 3,
              w: Math.abs(bx - ax) + 1,
              x: Math.min(bx, ax),
              y: ay - 1,
            },
            {
              h: 3,
              w: Math.abs(cx - (bx - 1)) + 1,
              x: Math.min(cx, bx - 1),
              y: cy - 1,
            },
            {
              h: Math.max(0, Math.abs(cy - ay) - 1),
              w: 3,
              x: bx - 1,
              y: Math.min(cy, ay) + 1,
            },
          ]
        : [
            { h: 1, w: Math.abs(bx - ax) + 1, x: Math.min(bx, ax), y: ay },
            { h: 1, w: Math.abs(cx - bx) + 1, x: Math.min(cx, bx), y: cy },
            {
              h: Math.max(0, Math.abs(cy - ay) - 1),
              w: 1,
              x: bx,
              y: Math.min(cy, ay) + 1,
            },
          ];
    });

  return (
    <TooltipProvider>
      <div
        {...props}
        ref={root}
        data-slot="advancement-tree"
        className={cn(`mc-advancement-tree`, className)}
        role={props.role ?? "group"}
        aria-label={props["aria-label"] ?? "Advancement tree"}
        style={minecraftStyle(style, (__style): AdvancementTreeScaleStyle => ({
          "--mc-scale": scale,
          backgroundImage: `url("${background}")`,
          backgroundPosition: `${(Math.floor(position.x) % 16) * scale}px ${(Math.floor(position.y) % 16) * scale}px`,
          backgroundSize: `${16 * scale}px ${16 * scale}px`,
          height: height * scale,
          width: width * scale,
          ...__style,
        }))}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (event.defaultPrevented) {
            return;
          }

          if (event.target === event.currentTarget) {
            const delta = {
              ArrowDown: [0, -16],
              ArrowLeft: [16, 0],
              ArrowRight: [-16, 0],
              ArrowUp: [0, 16],
            }[event.key];

            if (delta) {
              event.preventDefault();
              updatePan({ x: position.x + delta[0], y: position.y + delta[1] });
            }

            if (event.key === "Home") {
              event.preventDefault();
              updatePan(initial());
            }
          }
        }}
        tabIndex={props.tabIndex ?? 0}
        onPointerDown={(event) => {
          onPointerDown?.(event);

          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            !event.isPrimary
          ) {
            return;
          }

          suppressClick.current = false;
          drag.current = {
            id: event.pointerId,
            pan: position,
            x: event.clientX,
            y: event.clientY,
          };
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);

          if (event.defaultPrevented) {
            return;
          }

          const start = drag.current;

          if (!start || event.pointerId !== start.id) {
            return;
          }

          if (event.buttons === 0) {
            drag.current = null;
            setIsDragging(false);

            return;
          }

          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;

          if (!suppressClick.current && Math.hypot(dx, dy) < 6) {
            return;
          }

          if (!suppressClick.current) {
            suppressClick.current = true;
            setIsDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }

          updatePan({
            x: start.pan.x + dx / scale,
            y: start.pan.y + dy / scale,
          });
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event);

          if (drag.current?.id !== event.pointerId) {
            return;
          }

          drag.current = null;
          setIsDragging(false);

          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          drag.current = null;
          suppressClick.current = false;
          setIsDragging(false);
        }}
        onLostPointerCapture={(event) => {
          onLostPointerCapture?.(event);

          if (drag.current?.id === event.pointerId) {
            drag.current = null;
            setIsDragging(false);
          }
        }}
        onClickCapture={(event) => {
          onClickCapture?.(event);

          if (event.defaultPrevented) {
            return;
          }

          if (event.detail > 0 && suppressClick.current) {
            suppressClick.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onDragStart={(event) => {
          onDragStart?.(event);
          event.preventDefault();
        }}
      >
        <div
          className="mc-advancement-plane"
          style={{
            transform: `translate(${Math.floor(position.x) * scale}px,${Math.floor(position.y) * scale}px)`,
          }}
        >
          <svg
            className="mc-advancement-links"
            aria-hidden="true"
            width={1}
            height={1}
          >
            {[true, false].map((outline) => (
              <g key={String(outline)} fill={outline ? "#000" : "#fff"}>
                {paths(outline).map((line, index) => (
                  <rect
                    key={index}
                    x={line.x * scale}
                    y={line.y * scale}
                    width={line.w * scale}
                    height={line.h * scale}
                  />
                ))}
              </g>
            ))}
          </svg>
          {visible.map((node) => (
            <Tooltip
              key={node.id}
              open={!isDragging && tooltipId === node.id}
              onOpenChange={(open) => {
                setTooltipId((previousTooltipId) => {
                  if (open) {
                    return node.id;
                  }

                  if (previousTooltipId === node.id) {
                    return null;
                  }

                  return previousTooltipId;
                });
              }}
            >
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    data-slot="advancement-node"
                    data-completed={String(!!(node.completed ?? false))}
                    aria-label={`${node.title}${(node.completed ?? false) ? ", completed" : ""}`}
                    aria-pressed={current === node.id}
                    className="mc-advancement-node"
                    style={{ left: node.px * scale, top: node.py * scale }}
                    onClick={(event) => {
                      if (!event.defaultPrevented) {
                        choose(node.id);
                      }
                    }}
                    onKeyDown={(event) => {
                      const index = visible.findIndex((n) => n.id === node.id);
                      let next = index;

                      if (
                        event.key === "ArrowRight" ||
                        event.key === "ArrowDown"
                      ) {
                        next = (index + 1) % visible.length;
                      }

                      if (
                        event.key === "ArrowLeft" ||
                        event.key === "ArrowUp"
                      ) {
                        next = (index - 1 + visible.length) % visible.length;
                      }

                      if (next !== index) {
                        event.preventDefault();
                        root.current
                          ?.querySelectorAll<HTMLButtonElement>(
                            '[data-slot="advancement-node"]'
                          )
                          [next]?.focus();
                      }
                    }}
                  />
                }
              >
                <img
                  className="mc-advancement-frame"
                  alt=""
                  draggable={false}
                  src={
                    minecraftBadgeAssets[
                      `${node.kind ?? "task"}_${(node.completed ?? false) ? "obtained" : "unobtained"}`
                    ]
                  }
                />
                <span className="mc-advancement-icon">
                  {node.icon ?? (
                    <img
                      src={minecraftBadgeAssets.diamond}
                      alt=""
                      draggable={false}
                    />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent scale={scale}>
                <Badge
                  scale={scale}
                  achievement={node.kind}
                  earned={node.completed}
                  icon={node.icon}
                >
                  {node.title}
                </Badge>
                {node.description && <div>{node.description}</div>}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export { AdvancementTree };

export type { AdvancementNode, AdvancementPan, AdvancementTreeProps };
