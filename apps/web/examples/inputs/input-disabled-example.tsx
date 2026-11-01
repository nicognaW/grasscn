import { Input } from "@/components/ui/input";
export default function DisabledInputExample() {
  return (
    <Input
      aria-label="Disabled player name"
      defaultValue="Hello Minecraft"
      disabled
    />
  );
}
