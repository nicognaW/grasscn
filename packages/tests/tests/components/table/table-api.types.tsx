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

const ref = React.createRef<HTMLTableElement>();

export const api = (
  <Table ref={ref} scale={3} aria-label="Inventory">
    <TableCaption textAlign="center" maxTextWidth={100}>
      Inventory
    </TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead colSpan={2} ref={React.createRef<HTMLTableCellElement>()}>
          Name
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow tabIndex={0}>
        <TableCell
          rowSpan={2}
          maxTextWidth={100}
          onClick={(e) => {
            e.currentTarget.focus();
          }}
        >
          你好
        </TableCell>
      </TableRow>
    </TableBody>
    <TableFooter>
      <TableRow>
        <TableCell>1</TableCell>
      </TableRow>
    </TableFooter>
  </Table>
);
