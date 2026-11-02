import { installationManifest } from "../lib/installation";
import { DocumentText } from "./document-text";
import { InstallationCommand } from "./installation-command";
import { InstallationTabs } from "./installation-tabs";
import { ManualInstallation } from "./manual-installation";

export const Installation = async ({
  name,
  title = name,
  initialFile,
}: {
  name: string;
  title?: string;
  initialFile?: string;
}) => {
  const manifest = await installationManifest(name);

  if (!manifest) {
    return (
      <DocumentText
        role="alert"
      >
        Installation unavailable: {name}
      </DocumentText>
    );
  }

  return (
    <section
      /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
      className="documentation-installation"
      /* eslint-enable shadcn/no-unknown-classes */
      aria-label={`${title} installation`}
    >
      <InstallationTabs
        cli={<InstallationCommand name={name} />}
        manual={
          <ManualInstallation
            key={`${name}:${initialFile ?? ""}`}
            manifest={manifest}
            initialFile={initialFile}
          />
        }
      />
    </section>
  );
};
