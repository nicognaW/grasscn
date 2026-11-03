"use client";

import * as React from "react";

import { Avatar, AvatarImage } from "./avatar";
import type { MinecraftAvatarSkin } from "./avatar";
import {
  MinecraftDocumentText,
  documentTextWidth,
} from "./minecraft-document-text";
import { MinecraftMenuText, MenuScaleContext } from "./minecraft-menu-text";
import { playerListAssets } from "./minecraft-player-list-assets";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { loadUnihex } from "./minecraft-unifont";

import "./minecraft-player-list.css";

interface PlayerListLayoutStyle1 extends React.CSSProperties {
  "--mc-dynamic-player-list-1-height": number;
  "--mc-dynamic-player-list-1-top": number;
}

interface PlayerListLayoutStyle2 extends React.CSSProperties {
  "--mc-dynamic-player-list-2-height": number;
}

interface PlayerListLayoutStyle3 extends React.CSSProperties {
  "--mc-dynamic-player-list-3-grid-auto-columns": number;
  "--mc-dynamic-player-list-3-grid-template-rows": string;
  "--mc-dynamic-player-list-3-left": number;
  "--mc-dynamic-player-list-3-top": number;
}

interface PlayerListLayoutStyle5 extends React.CSSProperties {
  "--mc-dynamic-player-list-5-right": number;
}

interface PlayerListLayoutStyle6 extends React.CSSProperties {
  "--mc-dynamic-player-list-6-right": number;
}

interface PlayerListLayoutStyle7 extends React.CSSProperties {
  "--mc-dynamic-player-list-7-height": number;
  "--mc-dynamic-player-list-7-top": number;
}

interface PlayerListLayoutStyle8 extends React.CSSProperties {
  "--mc-dynamic-player-list-8-height": number;
}

interface PlayerListLayoutStyle9 extends React.CSSProperties {
  "--mc-dynamic-player-list-9-height": number;
}

interface PlayerListLayoutStyle10 extends React.CSSProperties {
  "--mc-dynamic-player-list-10-left": number;
  "--mc-dynamic-player-list-10-top": number;
}

interface PlayerListLayoutStyle11 extends React.CSSProperties {
  "--mc-dynamic-player-list-11-height": number;
  "--mc-dynamic-player-list-11-top": number;
}

interface PlayerListLayoutStyle12 extends React.CSSProperties {
  "--mc-dynamic-player-list-12-height": number;
  "--mc-dynamic-player-list-12-top": number;
}

interface PlayerListLayoutStyle13 extends React.CSSProperties {
  "--mc-dynamic-player-list-13-left": number;
}

interface PlayerListScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

interface PlayerListEntry {
  id: string;
  name: string;
  skin?: MinecraftAvatarSkin;
  src?: string;
  username?: string;
  latency?: number;
  score?: number;
  spectator?: boolean;
}

type PlayerListProps = React.ComponentProps<"div"> & {
  players: readonly PlayerListEntry[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  scale?: 1 | 2 | 3;
  rowWidth?: number;
  onPlayerSelect?: (id: string) => void;
};

const rosterGridStyle = function rosterGridStyle(
  columnWidth: number,
  rows: number,
  bodyLeft: number,
  headHeight: number,
  scale: number
): PlayerListLayoutStyle3 {
  return {
    "--mc-dynamic-player-list-3-grid-auto-columns": columnWidth * scale,
    "--mc-dynamic-player-list-3-grid-template-rows": rows
      ? `repeat(${rows},${9 * scale}px)`
      : "none",
    "--mc-dynamic-player-list-3-left": bodyLeft * scale,
    "--mc-dynamic-player-list-3-top": (headHeight + 1) * scale,
  };
};

const PlayerList = ({
  players,
  header,
  footer,
  scale = 2,
  rowWidth,
  onPlayerSelect,
  className,
  style,
  ...props
}: PlayerListProps) => {
  const visible = players.slice(0, 80);
  const columns = Math.max(1, Math.ceil(visible.length / 20));
  const rows = Math.ceil(visible.length / columns);
  const [, refresh] = React.useReducer((v) => v + 1, 0);

  const text =
    visible.map((p) => p.name).join("") +
    (typeof header === "string" ? header : "") +
    (typeof footer === "string" ? footer : "");

  React.useEffect(() => {
    let live = true;

    if (/[^\u0020-\u007E\n]/u.test(text)) {
      void loadUnihex().then(() => {
        if (live) {
          refresh();
        }
      });
    }

    return () => {
      live = false;
    };
  }, [text]);

  const nameWidth = Math.max(
    0,
    ...visible.map((p) => documentTextWidth(p.name))
  );

  const scoreWidth = Math.max(
    0,
    ...visible.map((p) =>
      p.score == null
        ? 0
        : documentTextWidth(" ") + documentTextWidth(String(p.score))
    )
  );

  const columnWidth = Math.max(22, rowWidth ?? 9 + nameWidth + scoreWidth + 13);
  const bodyWidth = columns * columnWidth + (columns - 1) * 5;

  const head =
    typeof header === "string" ? header.split("\n") : header ? [header] : [];

  const foot =
    typeof footer === "string" ? footer.split("\n") : footer ? [footer] : [];

  const fullWidth = Math.max(
    bodyWidth,
    ...[...head, ...foot].map((line) =>
      typeof line === "string" ? documentTextWidth(line) : 0
    )
  );

  const width = Math.floor(fullWidth / 2) * 2 + 2;
  const headHeight = header ? head.length * 9 + 1 : 0;
  const footHeight = footer ? foot.length * 9 + 1 : 0;
  const bodyLeft = 1 + Math.floor(fullWidth / 2) - Math.floor(bodyWidth / 2);

  return (
    <MenuScaleContext.Provider value={scale}>
      <div
        {...props}
        data-slot="player-list"
        role={props.role ?? "group"}
        aria-label={props["aria-label"] ?? "Player list"}
        className={cn(`mc-player-list`, className)}
        style={minecraftStyle(style, (__style): PlayerListScaleStyle => ({
          "--mc-scale": scale,
          height: (1 + headHeight + rows * 9 + footHeight) * scale,
          position: "relative",
          width: width * scale,
          ...__style,
        }))}
      >
        {header && (
          <div
            className="mc-roster-heading mc-dynamic-layout-player-list-1"
            style={
              /* SAFETY: The owned mc-dynamic-layout-player-list-1 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
              {
                "--mc-dynamic-player-list-1-height": head.length * 9 * scale,
                "--mc-dynamic-player-list-1-top": scale,
              } satisfies PlayerListLayoutStyle1 as PlayerListLayoutStyle1
            }
          >
            {head.map((line, i) => (
              <div
                key={i}
                className="mc-layout-player-list-2 mc-dynamic-layout-player-list-2"
                style={
                  /* SAFETY: The owned mc-dynamic-layout-player-list-2 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                  {
                    "--mc-dynamic-player-list-2-height": 9 * scale,
                  } satisfies PlayerListLayoutStyle2 as PlayerListLayoutStyle2
                }
              >
                <span
                  style={
                    typeof line === "string"
                      ? {
                          left:
                            (1 +
                              Math.floor(fullWidth / 2) -
                              Math.floor(documentTextWidth(line) / 2)) *
                            scale,
                          position: "absolute",
                        }
                      : undefined
                  }
                >
                  <MinecraftMenuText>{line}</MinecraftMenuText>
                </span>
              </div>
            ))}
          </div>
        )}
        <div
          role="list"
          aria-label="Players"
          className="mc-roster-grid mc-dynamic-layout-player-list-3"
          style={rosterGridStyle(
            columnWidth,
            rows,
            bodyLeft,
            headHeight,
            scale
          )}
        >
          {visible.map((player) => {
            const latency = player.latency ?? 0;

            const bars =
              latency < 0
                ? "unknown"
                : latency < 150
                  ? "5"
                  : latency < 300
                    ? "4"
                    : latency < 600
                      ? "3"
                      : latency < 1000
                        ? "2"
                        : "1";

            const key =
              `gui/sprites/icon/ping_${bars}` as keyof typeof playerListAssets;

            const content = (
              <>
                <Avatar
                  scale={scale}
                  style={{
                    height: 8 * scale,
                    left: 0,
                    position: "absolute",
                    top: 0,
                    width: 8 * scale,
                  }}
                >
                  <AvatarImage
                    skin={
                      player.src || player.username
                        ? undefined
                        : (player.skin ?? "wide/steve")
                    }
                    src={
                      player.src ??
                      (player.username
                        ? `https://mc-heads.net/avatar/${encodeURIComponent(player.username)}/8`
                        : undefined)
                    }
                    alt=""
                  />
                </Avatar>
                <span
                  className="mc-roster-name mc-layout-player-list-4"
                  style={{
                    fontStyle:
                      (player.spectator ?? false) ? "italic" : undefined,
                    left: 9 * scale,
                    maxWidth: (columnWidth - 9 - scoreWidth - 13) * scale,
                    opacity: (player.spectator ?? false) ? 144 / 255 : 1,
                  }}
                >
                  <MinecraftMenuText>{player.name}</MinecraftMenuText>
                </span>
                {player.score != null && (
                  <span
                    className="mc-roster-score mc-layout-player-list-5 mc-dynamic-layout-player-list-5"
                    style={
                      /* SAFETY: The owned mc-dynamic-layout-player-list-5 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                      {
                        "--mc-dynamic-player-list-5-right": 12 * scale,
                      } satisfies PlayerListLayoutStyle5 as PlayerListLayoutStyle5
                    }
                  >
                    <MinecraftMenuText>{player.score}</MinecraftMenuText>
                  </span>
                )}
                <img
                  className="mc-roster-ping mc-layout-player-list-6 mc-dynamic-layout-player-list-6"
                  alt={
                    latency < 0 ? "Connection unknown" : `${latency} ms latency`
                  }
                  src={playerListAssets[key]}
                  width={10 * scale}
                  height={8 * scale}
                  style={
                    /* SAFETY: The owned mc-dynamic-layout-player-list-6 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                    {
                      "--mc-dynamic-player-list-6-right": scale,
                    } satisfies PlayerListLayoutStyle6 as PlayerListLayoutStyle6
                  }
                />
              </>
            );

            return (
              <div role="listitem" key={player.id} className="mc-roster-row">
                {onPlayerSelect ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      if (!event.defaultPrevented) {
                        onPlayerSelect(player.id);
                      }
                    }}
                    aria-label={player.name}
                  >
                    {content}
                  </button>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>
        {footer && (
          <div
            className="mc-roster-heading mc-dynamic-layout-player-list-7"
            style={
              /* SAFETY: The owned mc-dynamic-layout-player-list-7 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
              {
                "--mc-dynamic-player-list-7-height": foot.length * 9 * scale,
                "--mc-dynamic-player-list-7-top":
                  (headHeight + rows * 9 + 2) * scale,
              } satisfies PlayerListLayoutStyle7 as PlayerListLayoutStyle7
            }
          >
            {foot.map((line, i) => (
              <div
                key={i}
                className="mc-layout-player-list-8 mc-dynamic-layout-player-list-8"
                style={
                  /* SAFETY: The owned mc-dynamic-layout-player-list-8 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                  {
                    "--mc-dynamic-player-list-8-height": 9 * scale,
                  } satisfies PlayerListLayoutStyle8 as PlayerListLayoutStyle8
                }
              >
                <span
                  style={
                    typeof line === "string"
                      ? {
                          left:
                            (1 +
                              Math.floor(fullWidth / 2) -
                              Math.floor(documentTextWidth(line) / 2)) *
                            scale,
                          position: "absolute",
                        }
                      : undefined
                  }
                >
                  <MinecraftMenuText>{line}</MinecraftMenuText>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </MenuScaleContext.Provider>
  );
};

interface ScoreboardEntry {
  id: string;
  name: string;
  score: number;
}

type ScoreboardProps = React.ComponentProps<"div"> & {
  title: string;
  entries: readonly ScoreboardEntry[];
  scale?: 1 | 2 | 3;
};

const Scoreboard = ({
  title,
  entries,
  scale = 2,
  className,
  style,
  ...props
}: ScoreboardProps) => {
  const [, refresh] = React.useReducer((v) => v + 1, 0);
  const text = title + entries.map((entry) => entry.name).join("");

  React.useEffect(() => {
    let live = true;

    if (/[^\u0020-\u007E\n]/u.test(text)) {
      void loadUnihex().then(() => {
        if (live) {
          refresh();
        }
      });
    }

    return () => {
      live = false;
    };
  }, [text]);

  const visible = [...entries.filter((e) => !e.name.startsWith("#"))]
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.name.toLowerCase() < b.name.toLowerCase()
          ? -1
          : a.name.toLowerCase() > b.name.toLowerCase()
            ? 1
            : 0)
    )
    .slice(0, 15);

  const contentWidth = Math.max(
    documentTextWidth(title),
    ...visible.map(
      (e) =>
        documentTextWidth(e.name) +
        documentTextWidth(": ") +
        documentTextWidth(String(e.score))
    )
  );

  return (
    <div
      {...props}
      data-slot="scoreboard"
      role="table"
      aria-label={title}
      className={cn(`mc-scoreboard`, className)}
      style={minecraftStyle(style, (__style): PlayerListScaleStyle => ({
        "--mc-scale": scale,
        height: (visible.length * 9 + 10) * scale,
        width: (contentWidth + 4) * scale,
        ...__style,
      }))}
    >
      <div
        role="row"
        className="mc-scoreboard-title mc-dynamic-layout-player-list-9"
        style={
          /* SAFETY: The owned mc-dynamic-layout-player-list-9 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
          {
            "--mc-dynamic-player-list-9-height": 9 * scale,
          } satisfies PlayerListLayoutStyle9 as PlayerListLayoutStyle9
        }
      >
        <span
          role="columnheader"
          aria-colspan={2}
          className="mc-layout-player-list-10 mc-dynamic-layout-player-list-10"
          style={
            /* SAFETY: The owned mc-dynamic-layout-player-list-10 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
            {
              "--mc-dynamic-player-list-10-left": 2 * scale,
              "--mc-dynamic-player-list-10-top": scale,
            } satisfies PlayerListLayoutStyle10 as PlayerListLayoutStyle10
          }
        >
          <MinecraftDocumentText
            text={title}
            width={contentWidth}
            scale={scale}
            align="center"
            color="#ffffff"
          />
        </span>
      </div>
      <div
        className="mc-scoreboard-body mc-layout-player-list-11 mc-dynamic-layout-player-list-11"
        style={
          /* SAFETY: The owned mc-dynamic-layout-player-list-11 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
          {
            "--mc-dynamic-player-list-11-height":
              (visible.length * 9 + 1) * scale,
            "--mc-dynamic-player-list-11-top": 9 * scale,
          } satisfies PlayerListLayoutStyle11 as PlayerListLayoutStyle11
        }
      />
      {visible.map((entry, i) => (
        <div
          role="row"
          key={entry.id}
          className="mc-scoreboard-row mc-dynamic-layout-player-list-12"
          style={
            /* SAFETY: The owned mc-dynamic-layout-player-list-12 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
            {
              "--mc-dynamic-player-list-12-height": 9 * scale,
              "--mc-dynamic-player-list-12-top": (10 + i * 9) * scale,
            } satisfies PlayerListLayoutStyle12 as PlayerListLayoutStyle12
          }
        >
          <span
            role="cell"
            className="mc-layout-player-list-13 mc-dynamic-layout-player-list-13"
            style={
              /* SAFETY: The owned mc-dynamic-layout-player-list-13 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
              {
                "--mc-dynamic-player-list-13-left": 2 * scale,
              } satisfies PlayerListLayoutStyle13 as PlayerListLayoutStyle13
            }
          >
            <MinecraftDocumentText
              text={entry.name}
              width={documentTextWidth(entry.name)}
              scale={scale}
              color="#ffffff"
            />
          </span>
          <span role="cell" className="mc-layout-player-list-14">
            <MinecraftDocumentText
              text={String(entry.score)}
              width={documentTextWidth(String(entry.score))}
              scale={scale}
              color="#ff5555"
            />
          </span>
        </div>
      ))}
    </div>
  );
};

export { PlayerList, Scoreboard };

export type {
  PlayerListEntry,
  PlayerListProps,
  ScoreboardEntry,
  ScoreboardProps,
};
