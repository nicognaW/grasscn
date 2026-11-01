import { Input } from "@/components/ui/input";
export default function ReadOnlyInputExample() {
  return (
    <Input
      aria-label="Read-only player name"
      defaultValue="Hello Minecraft"
      readOnly
    />
  );
}
