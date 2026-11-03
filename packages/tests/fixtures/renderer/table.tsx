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
import * as React from "react";

const p = new URLSearchParams(location.search);
// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3;
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
    return (
      <Table
        scale={scale}
        className="fixture-placement-fixed fixture-geometry-x fixture-geometry-y fixture-geometry-width"
        style={{
          "--fixture-width": `${width * scale}px`,
          "--fixture-x": `${Number(p.get("x") ?? 16) * scale}px`,
          "--fixture-y": `${Number(p.get("y") ?? 16) * scale}px`,
          tableLayout: "fixed",
        }}
      >
        {part === "header" ? (
          <TableHeader id="subject" data-subject="true">
            <TableRow
              className="fixture-geometry-height"
              style={{ "--fixture-height": `${height * scale}px` }}
            >
              <TableHead
                className="fixture-geometry-height"
                style={{
                  "--fixture-height": `${height * scale}px`,
                  padding: 0,
                }}
              />
            </TableRow>
          </TableHeader>
        ) : part === "footer" ? (
          <TableFooter id="subject" data-subject="true">
            <TableRow
              className="fixture-geometry-height"
              style={{ "--fixture-height": `${height * scale}px` }}
            >
              <TableCell
                className="fixture-geometry-height"
                style={{
                  "--fixture-height": `${height * scale}px`,
                  padding: 0,
                }}
              />
            </TableRow>
          </TableFooter>
        ) : part === "caption" ? (
          <TableCaption
            id="subject"
            {...layout}
            className="fixture-geometry-height"
            style={{ "--fixture-height": `${height * scale}px`, padding: 0 }}
            data-subject="true"
          >
            {label}
          </TableCaption>
        ) : part === "head" ? (
          <TableHeader
            style={{ "--mc-table-header": "none" } as React.CSSProperties}
          >
            <TableRow
              className="fixture-geometry-height"
              style={{ "--fixture-height": `${height * scale}px` }}
            >
              <TableHead
                id="subject"
                {...layout}
                className="fixture-geometry-height"
                style={{
                  "--fixture-height": `${height * scale}px`,
                  padding: 0,
                  verticalAlign: "top",
                }}
                data-subject="true"
              >
                {label}
              </TableHead>
            </TableRow>
          </TableHeader>
        ) : (
          <TableBody
            style={{
              backgroundImage: p.has("backgroundOnly") ? undefined : "none",
            }}
          >
            <TableRow
              className="fixture-geometry-height"
              style={{ "--fixture-height": `${height * scale}px` }}
            >
              <TableCell
                id="subject"
                {...layout}
                className="fixture-geometry-height"
                style={{
                  "--fixture-height": `${height * scale}px`,
                  padding: 0,
                  verticalAlign: "top",
                }}
                data-subject="true"
              >
                {p.has("backgroundOnly") ? null : label}
              </TableCell>
            </TableRow>
          </TableBody>
        )}
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
