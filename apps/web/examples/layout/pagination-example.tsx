"use client";

import { useState } from "react";
import type { MouseEvent } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

const PaginationExample = () => {
  const [page, setPage] = useState(1);

  const select = (event: MouseEvent<HTMLAnchorElement>, next: number) => {
    event.preventDefault();
    setPage(next);
  };

  return (
    <Pagination aria-label="Recipe pages">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={`?page=${page - 1}`}
            aria-disabled={page === 1}
            onClick={(event) => {
              select(event, page - 1);
            }}
          />
        </PaginationItem>
        {[1, 2, 3].map((number) => (
          <PaginationItem key={number}>
            <PaginationLink
              href={`?page=${number}`}
              isActive={page === number}
              onClick={(event) => {
                select(event, number);
              }}
            >
              {number}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href={`?page=${page + 1}`}
            aria-disabled={page === 3}
            onClick={(event) => {
              select(event, page + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default PaginationExample;
