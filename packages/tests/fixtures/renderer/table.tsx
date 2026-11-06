import { Button } from "@grasscn/web/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@grasscn/web/ui/table";
import type { ReactNode } from "react";
import * as React from "react";

interface TableReferenceStyle extends React.CSSProperties {
  "--mc-table-header": "none";
}

const p = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale =
  // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
  Number(p.get("scale") ?? 2) as 1 | 2 | 3;

const width = Number(p.get("width") ?? 200);
const height = Number(p.get("height") ?? 9);
const part = p.get("part") ?? "app";
const label = p.get("label") ?? "Minecraft";

export const TableFixture = () => {
  React.useLayoutEffect(() => {
    const bg = p.get("background") ?? "#202020";
    const html = document.documentElement.style.background;
    const body = document.body.style.background;

    document.documentElement.style.background = bg;
    document.body.style.background = bg;

    return () => {
      document.documentElement.style.background = html;
      document.body.style.background = body;
    };
  }, []);

  const [selected, setSelected] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [tag, setTag] = React.useState("");
  const ref = React.useRef<HTMLTableElement>(null);

  const layout = {
    maxTextWidth: p.has("wrapWidth") ? Number(p.get("wrapWidth")) : undefined,
    textAlign:
      p.get("alignment") === "center" ? ("center" as const) : ("left" as const),
  };

  if (p.has("native")) {
    let selectedFixtureBranch1: ReactNode;

    if (part === "header") {
      selectedFixtureBranch1 = (
        <TableHeader id="subject" data-subject="true">
          <TableRow
            className="fixture-geometry-height"
            style={{ "--fixture-height": `${height * scale}px` }}
          >
            <TableHead
              className="fixture-geometry-height fixture-table-padding-zero"
              style={{
                "--fixture-height": `${height * scale}px`,
              }}
            />
          </TableRow>
        </TableHeader>
      );
    } else if (part === "footer") {
      selectedFixtureBranch1 = (
        <TableFooter id="subject" data-subject="true">
          <TableRow
            className="fixture-geometry-height"
            style={{ "--fixture-height": `${height * scale}px` }}
          >
            <TableCell
              className="fixture-geometry-height fixture-table-padding-zero"
              style={{
                "--fixture-height": `${height * scale}px`,
              }}
            />
          </TableRow>
        </TableFooter>
      );
    } else if (part === "caption") {
      selectedFixtureBranch1 = (
        <TableCaption
          id="subject"
          {...layout}
          className="fixture-geometry-height fixture-table-padding-zero"
          style={{ "--fixture-height": `${height * scale}px` }}
          data-subject="true"
        >
          {label}
        </TableCaption>
      );
    } else {
      selectedFixtureBranch1 =
        part === "head" ? (
          <TableHeader
            style={
              // SAFETY: the existing minecraft-table.css header rule consumes this exact named variable; satisfies checks its value before the CSSProperties view is passed to React.
              {
                "--mc-table-header": "none",
              } satisfies TableReferenceStyle as TableReferenceStyle
            }
          >
            <TableRow
              className="fixture-geometry-height"
              style={{ "--fixture-height": `${height * scale}px` }}
            >
              <TableHead
                id="subject"
                {...layout}
                className="fixture-geometry-height fixture-table-padding-zero fixture-table-align-top"
                style={{
                  "--fixture-height": `${height * scale}px`,
                }}
                data-subject="true"
              >
                {label}
              </TableHead>
            </TableRow>
          </TableHeader>
        ) : (
          <TableBody
            className={
              p.has("backgroundOnly")
                ? undefined
                : "fixture-table-background-none"
            }
          >
            <TableRow
              className="fixture-geometry-height"
              style={{ "--fixture-height": `${height * scale}px` }}
            >
              <TableCell
                id="subject"
                {...layout}
                className="fixture-geometry-height fixture-table-padding-zero fixture-table-align-top"
                style={{
                  "--fixture-height": `${height * scale}px`,
                }}
                data-subject="true"
              >
                {p.has("backgroundOnly") ? null : label}
              </TableCell>
            </TableRow>
          </TableBody>
        );
    }

    return (
      <Table
        scale={scale}
        className="fixture-placement-fixed fixture-geometry-x fixture-geometry-y fixture-geometry-width fixture-table-fixed"
        style={{
          "--fixture-width": `${width * scale}px`,
          "--fixture-x": `${Number(p.get("x") ?? 16) * scale}px`,
          "--fixture-y": `${Number(p.get("y") ?? 16) * scale}px`,
        }}
      >
        {selectedFixtureBranch1}
      </Table>
    );
  }

  return (
    <>
      <Table scale={scale} ref={ref} aria-label="World statistics">
        <TableCaption>World list</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>World</TableHead>
            <TableHead>Players</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            data-state={selected ? "selected" : undefined}
            aria-selected={selected}
            tabIndex={0}
            onClick={() => {
              setSelected((v) => !v);
            }}
          >
            <TableCell>你好，世界</TableCell>
            <TableCell>
              {2}
              {/* oxlint-disable-next-line react/jsx-no-useless-fragment -- This fixture deliberately nests the scalar 3 in a Fragment next to 2 to exercise TableCell's recursive fragment collector; the existing test requires the resulting cell name 23. */}
              <>{3}</>
            </TableCell>
            <TableCell>
              <Button
                scale={scale}
                type="button"
                className="fixture-geometry-width"
                style={{ "--fixture-width": `${60 * scale}px` }}
                onClick={(event) => {
                  event.stopPropagation();
                  setCount((v) => v + 1);
                }}
              >
                Join
              </Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Survival</TableCell>
            <TableCell>8</TableCell>
            <TableCell>
              <span data-testid="rich" data-kept="yes">
                Rich content
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total worlds: 2</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <button
        type="button"
        id="ref"
        onClick={() => {
          setTag(ref.current?.tagName ?? "");
        }}
      >
        Read ref
      </button>
      <output id="tag">{tag}</output>
      <output id="events">{count}</output>
      <output id="selected">{String(selected)}</output>
    </>
  );
};
