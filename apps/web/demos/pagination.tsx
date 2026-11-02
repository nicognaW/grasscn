import * as React from "react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../registry/ui/pagination";
import type { DemoProps } from "../types";
export default function PaginationDemo({ scale }: DemoProps) {
  const [page, setPage] = React.useState(1);
  const choose = (next: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    setPage(next);
  };
  return (
    <>
      <div className="demo-stage" data-stage="pagination">
        <Pagination aria-label="World list pages">
          <PaginationContent style={{ flexWrap: "wrap" }}>
            <PaginationItem>
              <PaginationPrevious
                scale={scale}
                href="#pagination"
                aria-disabled={page === 1}
                onClick={choose(Math.max(1, page - 1))}
              />
            </PaginationItem>
            {[1, 2, 3].map((n) => (
              <PaginationItem key={n}>
                <PaginationLink
                  scale={scale}
                  style={{ width: 28 * scale }}
                  isActive={page === n}
                  href="#pagination"
                  onClick={choose(n)}
                >
                  {n}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                scale={scale}
                href="#pagination"
                aria-disabled={page === 3}
                onClick={choose(Math.min(3, page + 1))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
      <div className="demo-result">
        <span className="status-dot" />
        <output aria-label="Pagination current page">Page {page} / 3</output>
      </div>
    </>
  );
}
