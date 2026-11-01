"use client";
import { useState } from "react";

import { Book } from "@/components/ui/book";
const pages = [
  "The field guide\n\nStart with a sketch. Build one useful thing.",
  "Chapter 2\n\nShare it with a friend.",
  "Next adventure\n\nWhat will you build next?",
];
export default function BookExample() {
  const [page, setPage] = useState(0);
  return (
    <Book
      pages={pages}
      page={page}
      onPageChange={setPage}
      aria-label="Field guide"
    />
  );
}
