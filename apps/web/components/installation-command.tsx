"use client";

import { useSyncExternalStore } from "react";

import { Tabs, TabsList, TabsTrigger } from "../registry/ui/tabs";
import { CodeView } from "./code-view";
import { DocumentText } from "./document-text";

const managers = ["npm", "pnpm", "Yarn", "Bun"] as const;

type Manager = (typeof managers)[number];

const preferenceKey = "grasscn-package-manager";
const preferenceEvent = "grasscn-package-manager-change";
let sessionManager: Manager = "npm";

const isManager = (value: unknown): value is Manager =>
  managers.some((manager) => manager === value);

const preference = () => {
  try {
    const saved = window.localStorage.getItem(preferenceKey);

    return isManager(saved) ? saved : sessionManager;
  } catch {
    return sessionManager;
  }
};

const subscribe = (change: () => void) => {
  window.addEventListener("storage", change);
  window.addEventListener(preferenceEvent, change);

  return () => {
    window.removeEventListener("storage", change);
    window.removeEventListener(preferenceEvent, change);
  };
};

const serverPreference = (): Manager => "npm";

const clientOrigin = () => window.location.origin;
const serverOrigin = () => "";

const subscribeOrigin = () => () => {
  /* A document keeps the same origin. */
};

const ManagerCommand = ({
  registryName,
  packages,
  development = false,
}: {
  registryName?: string;
  packages?: string[];
  development?: boolean;
}) => {
  const manager = useSyncExternalStore(subscribe, preference, serverPreference);

  const origin = useSyncExternalStore(
    subscribeOrigin,
    clientOrigin,
    serverOrigin
  );

  const hasRegistry = registryName !== undefined && registryName !== "";

  const target = hasRegistry
    ? `${origin}/r/${encodeURIComponent(registryName)}.json`
    : (packages?.join(" ") ?? "");

  const command = hasRegistry
    ? {
        Bun: `bunx --bun shadcn@latest add ${target}`,
        Yarn: `yarn dlx shadcn@latest add ${target}`,
        npm: `npx shadcn@latest add ${target}`,
        pnpm: `pnpm dlx shadcn@latest add ${target}`,
      }[manager]
    : {
        Bun: `bun add${development ? " --dev" : ""} ${target}`,
        Yarn: `yarn add${development ? " -D" : ""} ${target}`,
        npm: `npm install${development ? " --save-dev" : ""} ${target}`,
        pnpm: `pnpm add${development ? " -D" : ""} ${target}`,
      }[manager];

  let commandLabel = "Dependencies";
  let managerLabel = "Dependency package manager";

  if (hasRegistry) {
    commandLabel = "CLI installation";
    managerLabel = "Installation package manager";
  } else if (development) {
    commandLabel = "Development dependencies";
    managerLabel = "Development dependency package manager";
  }

  return (
    <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
      className="documentation-install-command"
      /* eslint-enable shadcn/no-unknown-classes */
    >
      <Tabs
        value={manager}
        scale={2}
        onValueChange={(value) => {
          if (!isManager(value)) {
            return;
          }

          sessionManager = value;

          try {
            window.localStorage.setItem(preferenceKey, value);
          } catch {
            /* Selection remains usable for this visit. */
          }

          window.dispatchEvent(new Event(preferenceEvent));
        }}
      >
        <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
          className="documentation-tabs-scroll"
          /* eslint-enable shadcn/no-unknown-classes */
        >
          <TabsList aria-label={managerLabel}>
            {managers.map((value) => (
              <TabsTrigger key={value} value={value}>
                {value}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      {!hasRegistry || origin !== "" ? (
        <CodeView
          code={command}
          filename="Terminal"
          language="bash"
          label={commandLabel}
          collapsible={false}
        />
      ) : (
        <DocumentText
          /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
          role="status"
          /* eslint-enable jsx-a11y/prefer-tag-over-role */
        >
          Loading registry address
        </DocumentText>
      )}
    </div>
  );
};

/** Shared by the homepage and component documentation; registry delivery stays independently generated. */
export const InstallationCommand = ({ name }: { name: string }) => (
  <ManagerCommand registryName={name} />
);

export const DependencyCommand = ({
  packages,
  development = false,
}: {
  packages: string[];
  development?: boolean;
}) => <ManagerCommand packages={packages} development={development} />;
