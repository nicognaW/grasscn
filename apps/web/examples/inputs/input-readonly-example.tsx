import { Input } from "@/components/ui/input";

const ReadOnlyInputExample = () => (
  <Input
    aria-label="Read-only player name"
    defaultValue="Hello Minecraft"
    readOnly
  />
);

export default ReadOnlyInputExample;
