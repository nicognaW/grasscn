"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Tabs, TabsList, TabsTrigger } from "../registry/ui/tabs";
import { CodeView } from "./code-view";
import { DocumentText } from "./document-text";

const managers = ["npm", "pnpm", "Yarn", "Bun"] as const;
type Manager = (typeof managers)[number];
const preferenceKey = "grasscn-package-manager";
const preferenceEvent = "grasscn-package-manager-change";
let sessionManager: Manager = "npm";
function isManager(value: unknown): value is Manager {
  return managers.some((manager) => manager === value);
}
function preference() {
  try {
    const saved = window.localStorage.getItem(preferenceKey);
    return isManager(saved) ? saved : sessionManager;
  } catch {
    return sessionManager;
  }
}
function subscribe(change: () => void) {
  window.addEventListener("storage", change);
  window.addEventListener(preferenceEvent, change);
  return () => {
    window.removeEventListener("storage", change);
    window.removeEventListener(preferenceEvent, change);
  };
}
function serverPreference(): Manager {
  return "npm";
}

function ManagerCommand({
  registryName,
  packages,
}: {
  registryName?: string;
  packages?: string[];
}) {
  const manager = useSyncExternalStore(subscribe, preference, serverPreference);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const target = registryName
    ? `${origin}/r/${encodeURIComponent(registryName)}.json`
    : (packages?.join(" ") ?? "");
  const command = registryName
    ? {
        npm: `npx shadcn@latest add ${target}`,
        pnpm: `pnpm dlx shadcn@latest add ${target}`,
        Yarn: `yarn dlx shadcn@latest add ${target}`,
        Bun: `bunx --bun shadcn@latest add ${target}`,
      }[manager]
    : {
        npm: `npm install ${target}`,
        pnpm: `pnpm add ${target}`,
        Yarn: `yarn add ${target}`,
        Bun: `bun add ${target}`,
      }[manager];
  return (
    <div className="documentation-install-command">
      <Tabs
        value={manager}
        scale={2}
        onValueChange={(value) => {
          if (!isManager(value)) return;
          sessionManager = value;
          try {
            window.localStorage.setItem(preferenceKey, value);
          } catch {
            /* Selection remains usable for this visit. */
          }
          window.dispatchEvent(new Event(preferenceEvent));
        }}
      >
        <div className="documentation-tabs-scroll">
          <TabsList
            aria-label={
              registryName
                ? "Installation package manager"
                : "Dependency package manager"
            }
          >
            {managers.map((value) => (
              <TabsTrigger key={value} value={value}>
                {value}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      {!registryName || origin ? (
        <CodeView
          code={command}
          filename="Terminal"
          language="bash"
          label={registryName ? "CLI installation" : "Dependencies"}
          collapsible={false}
        />
      ) : (
        <DocumentText role="status">Loading registry address</DocumentText>
      )}
    </div>
  );
}

/** Shared by the homepage and component documentation; registry delivery stays independently generated. */
export function InstallationCommand({ name }: { name: string }) {
  return <ManagerCommand registryName={name} />;
}

export function DependencyCommand({ packages }: { packages: string[] }) {
  return <ManagerCommand packages={packages} />;
}
