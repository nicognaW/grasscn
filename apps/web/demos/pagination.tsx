import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "../registry/ui/pagination";
import type { DemoProps } from "../types";

const PaginationDemo = ({ scale }: DemoProps) => {
  const [page, setPage] = React.useState(1);

  const choose = (next: number) => () => {
    setPage(next);
  };

  return (
    <>
      <div className="demo-stage" data-stage="pagination">
        <Pagination aria-label="World list pages">
          <PaginationContent className="demo-owned-pagination-1">
            <PaginationItem>
              <PaginationPrevious
                scale={scale}
                href="#pagination"
                aria-disabled={page === 1}
                onClick={choose(Math.max(1, page - 1))}
              />
            </PaginationItem>
            {[1, 2, 3].map((n) => {
              const demoLayout2: DemoVariables = {
                "--demo-owned-pagination-2-width": `${28 * scale}px`,
              };

              return (
                <PaginationItem key={n}>
                  <PaginationLink
                    scale={scale}
                    className="demo-owned-pagination-2"
                    style={demoLayout2}
                    isActive={page === n}
                    href="#pagination"
                    onClick={choose(n)}
                  >
                    {n}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
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
        <span />
        <output aria-label="Pagination current page">Page {page} / 3</output>
      </div>
    </>
  );
};

export { PaginationDemo as default };
