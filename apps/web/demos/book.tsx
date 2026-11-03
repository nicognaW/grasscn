import { Book } from "../registry/ui/book";
import type { DemoProps } from "../types";

const pages = [
  "The field guide\n\nA small idea becomes something worth exploring.\n\nStart with a sketch. Build one useful thing. Share it with a friend.",
  "Chapter 2\n\nMake it yours.\n\nYour components live in your project. Change the colours, content and behaviour to fit what you are building.",
  "Next adventure\n\nYou have reached the last page.\n\nWhat will you build next?",
];

const BookDemo = ({ scale }: DemoProps) => (
  <div className="demo-stage" data-stage="book">
    <Book pages={pages} scale={scale} aria-label="Book" />
  </div>
);

export { BookDemo as default };
