import { installationManifest } from "../lib/installation";
import { DocumentText } from "./document-text";
import { InstallationCommand } from "./installation-command";
import { InstallationTabs } from "./installation-tabs";
import { ManualInstallation } from "./manual-installation";

export async function Installation({
  name,
  title = name,
  initialFile,
}: {
  name: string;
  title?: string;
  initialFile?: string;
}) {
  const manifest = await installationManifest(name);
  if (!manifest)
    return (
      <DocumentText role="alert">Installation unavailable: {name}</DocumentText>
    );
  return (
    <section
      className="documentation-installation"
      aria-label={`${title} installation`}
    >
      <InstallationTabs
        cli={<InstallationCommand name={name} />}
        manual={
          <ManualInstallation manifest={manifest} initialFile={initialFile} />
        }
      />
    </section>
  );
}
