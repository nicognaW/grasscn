"use client";
import { useEffect, useState } from "react";

import type {
  InstallationFile,
  InstallationManifest,
} from "../lib/installation";
import { Button } from "../registry/ui/button";
import { ScrollArea } from "../registry/ui/scroll-area";
import { CodeView } from "./code-view";
import { DocumentLink } from "./document-link";
import { DocumentParagraph } from "./document-paragraph";
import { DocumentText } from "./document-text";
import { DependencyCommand } from "./installation-command";

const displayLimit = 4096;
function FileSource({ file }: { file: InstallationFile }) {
  const deferred = file.sourceBytes > 16384;
  const [contents, setContents] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState(false);
  const [copy, setCopy] = useState<"idle" | "copying" | "success" | "failed">(
    "idle"
  );
  const load = async () => {
    if (contents !== undefined) return contents;
    setLoading(true);
    setFailure(false);
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw Error("Source unavailable");
      const text = await response.text();
      setContents(text);
      return text;
    } catch {
      setFailure(true);
      return undefined;
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (deferred) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(file.url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error("Source unavailable");
        const text = await response.text();
        if (!controller.signal.aborted) setContents(text);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailure(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [deferred, file.url]);
  const bulk =
    deferred ||
    (contents?.length ?? 0) > 16384 ||
    (contents?.split("\n").some((line) => line.length > 512) ?? false);
  const copyFile = async () => {
    setCopy("copying");
    const text = await load();
    try {
      if (text === undefined || !navigator.clipboard?.writeText)
        throw Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setCopy("success");
    } catch {
      setCopy("failed");
    }
  };
  const filename = file.destination.split("/").at(-1)!;
  return (
    <section
      aria-label="Selected manual file"
      className="documentation-manual-source"
    >
      <DocumentParagraph>{file.destination}</DocumentParagraph>
      <DocumentParagraph>Source: {file.source}</DocumentParagraph>
      <div className="documentation-manual-actions">
        <Button
          className="documentation-control"
          nativeButton={false}
          role="link"
          render={<a href={`${file.url}?download=1`} download={filename} />}
        >
          Download
        </Button>
        {bulk ? (
          <>
            <Button
              className="documentation-control"
              onClick={load}
              disabled={loading || contents !== undefined}
            >
              Load
            </Button>
            <Button
              className="documentation-control documentation-full-copy"
              onClick={copyFile}
              disabled={copy === "copying"}
            >
              Copy full file
            </Button>
          </>
        ) : null}
      </div>
      {loading ? <DocumentText>Loading file</DocumentText> : null}
      {failure ? (
        <div role="alert">
          <DocumentText>File could not be loaded.</DocumentText>
          <Button className="documentation-control" onClick={load}>
            Retry
          </Button>
        </div>
      ) : null}
      {bulk ? (
        <>
          <DocumentParagraph>
            Load this resource when needed. The preview is limited to{" "}
            {displayLimit} characters; Copy full file and Download always
            provide the complete file.
          </DocumentParagraph>
          {contents !== undefined ? (
            <pre
              className="documentation-manual-preview"
              tabIndex={0}
              aria-label={`${filename} preview`}
              onCopy={(event) => {
                event.clipboardData.setData("text/plain", contents);
                event.preventDefault();
              }}
            >
              <DocumentText>{contents.slice(0, displayLimit)}</DocumentText>
            </pre>
          ) : null}
          <div role="status" aria-live="polite">
            <DocumentText>
              {copy === "success"
                ? "Copied complete file"
                : copy === "failed"
                  ? "Copy failed. Download the complete file, or select the loaded preview and copy it."
                  : ""}
            </DocumentText>
          </div>
        </>
      ) : contents !== undefined ? (
        <CodeView
          code={contents}
          filename={file.destination}
          language={
            filename.endsWith(".css")
              ? "css"
              : filename.endsWith(".tsx")
                ? "tsx"
                : "typescript"
          }
          label="Manual installation file"
        />
      ) : (
        <div role="status" />
      )}
    </section>
  );
}
export function ManualInstallation({
  manifest,
  initialFile,
}: {
  manifest: InstallationManifest;
  initialFile?: string;
}) {
  const [selected, setSelected] = useState(
    () =>
      manifest.files.find(
        (file) => file.source.split("/").at(-1) === initialFile
      ) ?? manifest.files[0]
  );
  return (
    <div className="documentation-manual">
      <DocumentParagraph>
        Use an existing{" "}
        <DocumentLink href="https://ui.shadcn.com/docs/installation">
          shadcn-ready project
        </DocumentLink>{" "}
        with Tailwind CSS 4 and its configured <code>@/lib/utils</code> helper
        exporting <code>cn</code>.
      </DocumentParagraph>
      <DocumentParagraph>
        Install these additional packages, then place every listed file at its
        destination relative to your source alias root (<code>@/</code>). If
        your components, hooks or lib aliases differ, adjust the destinations
        and imports together.
      </DocumentParagraph>
      <DependencyCommand packages={manifest.dependencies} />
      <DocumentParagraph>
        Styles, font tables, atlases and click audio are included in these files
        and imported by the implementation. Keep the complete set; no Minecraft
        installation or external asset host is required. Relative imports are
        adjusted to the displayed destinations; resource data and source notices
        are preserved.
      </DocumentParagraph>
      <DocumentText>{manifest.files.length} required files</DocumentText>
      <ScrollArea className="documentation-manual-files" scale={2}>
        <nav
          aria-label="Manual files"
          className="documentation-manual-file-list"
        >
          {manifest.files.map((file) => (
            <div key={file.url} className="documentation-manual-file-entry">
              <Button
                className="documentation-manual-file"
                aria-pressed={selected?.url === file.url}
                onClick={() => setSelected(file)}
              >
                {file.source.split("/").at(-1)}
              </Button>
              <DocumentParagraph>{file.destination}</DocumentParagraph>
            </div>
          ))}
        </nav>
      </ScrollArea>
      {selected ? (
        <FileSource key={selected.url} file={selected} />
      ) : (
        <DocumentText role="alert">
          Installation files unavailable.
        </DocumentText>
      )}
    </div>
  );
}
