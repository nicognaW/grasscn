import registry from "../registry.json";
import { DocumentText } from "./document-text";
import { InstallationCommand } from "./installation-command";

export function Installation({
  name,
  title = name,
}: {
  name: string;
  title?: string;
}) {
  if (!registry.items.some((item) => item.name === name))
    return (
      <DocumentText role="alert">Installation unavailable: {name}</DocumentText>
    );
  return (
    <section
      className="documentation-installation"
      aria-label={`${title} installation`}
    >
      <InstallationCommand name={name} />
    </section>
  );
}
