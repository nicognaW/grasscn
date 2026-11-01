"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";

const worlds = [
  { name: "Grasslands", players: 4 },
  { name: "Deep Dark", players: 1 },
];
export default function Example() {
  return (
    <Table aria-label="Saved worlds">
      <TableCaption>Saved worlds</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>World</TableHead>
          <TableHead>Players</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {worlds.map((world) => (
          <TableRow key={world.name}>
            <TableCell>{world.name}</TableCell>
            <TableCell>{world.players}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
