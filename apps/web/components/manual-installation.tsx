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

const FileSource = ({ file }: { file: InstallationFile }) => {
  const deferred = file.sourceBytes > 16_384;
  const [contents, setContents] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState(false);

  const [copy, setCopy] = useState<"idle" | "copying" | "success" | "failed">(
    "idle"
  );

  const load = async () => {
    if (contents !== undefined) {
      return contents;
    }

    setLoading(true);
    setFailure(false);

    let text: string | undefined;

    /* eslint-disable react/todo -- This browser I/O operation requires guarded failure and cleanup paths; React Compiler is not enabled. */
    try {
      const response = await fetch(file.url);

      if (!response.ok) {
        throw new Error("Source unavailable");
      }

      text = await response.text();
      setContents(text);
    } catch {
      setFailure(true);
    } finally {
      setLoading(false);
    }
    /* eslint-enable react/todo */

    return text;
  };

  /* eslint-disable react-doctor/no-fetch-in-effect -- The selected public source file is lazy client data; its owned AbortController cancels work and gates all state updates. */
  useEffect(() => {
    let cancel: (() => void) | undefined;

    if (!deferred) {
      const controller = new AbortController();

      const loadInitial = async () => {
        setLoading(true);

        /* eslint-disable react/todo -- This browser I/O operation requires guarded failure and cleanup paths; React Compiler is not enabled. */
        try {
          const response = await fetch(file.url, { signal: controller.signal });

          if (!response.ok) {
            throw new Error("Source unavailable");
          }

          const text = await response.text();

          if (!controller.signal.aborted) {
            setContents(text);
          }
        } catch {
          if (!controller.signal.aborted) {
            setFailure(true);
          }
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
        /* eslint-enable react/todo */
      };

      void loadInitial();

      cancel = () => {
        controller.abort();
      };
    }

    return cancel;
  }, [deferred, file.url]);
  /* eslint-enable react-doctor/no-fetch-in-effect */

  const bulk =
    deferred ||
    (contents?.length ?? 0) > 16_384 ||
    (contents?.split("\n").some((line) => line.length > 512) ?? false);

  const copyFile = async () => {
    setCopy("copying");
    const text = await load();

    /* eslint-disable react/todo -- This browser I/O operation requires guarded failure and cleanup paths; React Compiler is not enabled. */
    try {
      if (text === undefined || navigator.clipboard?.writeText === undefined) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(text);
      setCopy("success");
    } catch {
      setCopy("failed");
    }
    /* eslint-enable react/todo */
  };

  const filename = file.destination.split("/").at(-1) ?? file.destination;

  let language = "typescript";

  if (filename.endsWith(".css")) {
    language = "css";
  } else if (filename.endsWith(".tsx")) {
    language = "tsx";
  }

  const compactPreview =
    contents === undefined ? (
      <div
        /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
        role="status"
        /* eslint-enable jsx-a11y/prefer-tag-over-role */
      />
    ) : (
      <CodeView
        code={contents}
        filename={file.destination}
        language={language}
        label="Manual installation file"
      />
    );

  return (
    <section
      aria-label="Selected manual file"
      /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
      className="documentation-manual-source"
      /* eslint-enable shadcn/no-unknown-classes */
    >
      <DocumentParagraph>{file.destination}</DocumentParagraph>
      <DocumentParagraph>Source: {file.source}</DocumentParagraph>
      <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
        className="documentation-manual-actions"
        /* eslint-enable shadcn/no-unknown-classes */
      >
        {/* eslint-disable jsx-a11y/control-has-associated-label -- The composed native control derives its accessible label from its visible rendered children. */}
        <Button
          /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
          className="documentation-control"
          /* eslint-enable shadcn/no-unknown-classes */
          nativeButton={false}

          /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
          role="link"
          /* eslint-enable jsx-a11y/prefer-tag-over-role */

          render={<a href={`${file.url}?download=1`} download={filename} />}
        >
          Download
        </Button>
        {/* eslint-enable jsx-a11y/control-has-associated-label */}
        {bulk ? (
          <>
            <Button
              /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
              className="documentation-control"
              /* eslint-enable shadcn/no-unknown-classes */
              onClick={() => {
                void load();
              }}
              disabled={loading || contents !== undefined}
            >
              Load
            </Button>

            <Button
              /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
              className="documentation-control documentation-full-copy"
              /* eslint-enable shadcn/no-unknown-classes */
              onClick={() => {
                void copyFile();
              }}
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

          <Button /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
            className="documentation-control"
            /* eslint-enable shadcn/no-unknown-classes */ onClick={() => {
              void load();
            }}
          >
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
          {contents === undefined ? null : (
            <pre
              /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
              className="documentation-manual-preview"
              /* eslint-enable shadcn/no-unknown-classes */

              /* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The source preview is keyboard-focusable for exact code selection and clipboard fallback. */
              tabIndex={0}
              /* eslint-enable jsx-a11y/no-noninteractive-tabindex */

              aria-label={`${filename} preview`}
              onCopy={(event) => {
                event.clipboardData.setData("text/plain", contents);
                event.preventDefault();
              }}
            >
              <DocumentText>{contents.slice(0, displayLimit)}</DocumentText>
            </pre>
          )}
          <div
            /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
            role="status"
            /* eslint-enable jsx-a11y/prefer-tag-over-role */
            aria-live="polite"
          >
            <DocumentText>
              {
                {
                  copying: "",
                  failed:
                    "Copy failed. Download the complete file, or select the loaded preview and copy it.",
                  idle: "",
                  success: "Copied complete file",
                }[copy]
              }
            </DocumentText>
          </div>
        </>
      ) : (
        compactPreview
      )}
    </section>
  );
};

export const ManualInstallation = ({
  manifest,
  initialFile,
}: {
  manifest: InstallationManifest;
  initialFile?: string;
}) => {
  const [selected, setSelected] = useState<InstallationFile | undefined>(
    () =>
      manifest.files.find(
        (file) =>
          file.source === initialFile ||
          file.source.split("/").at(-1) === initialFile
      ) ?? manifest.files[0]
  );

  return (
    <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
      className="documentation-manual"
      /* eslint-enable shadcn/no-unknown-classes */
    >
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
      <ScrollArea /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
        className="documentation-manual-files"
        /* eslint-enable shadcn/no-unknown-classes */ scale={2}
      >
        <nav
          aria-label="Manual files"
          /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
          className="documentation-manual-file-list"
          /* eslint-enable shadcn/no-unknown-classes */
        >
          {manifest.files.map((file) => (
            <div
              key={
                file.url
              } /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
              className="documentation-manual-file-entry"
              /* eslint-enable shadcn/no-unknown-classes */
            >
              <Button
                /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
                className="documentation-manual-file"
                /* eslint-enable shadcn/no-unknown-classes */
                aria-pressed={selected?.url === file.url}
                onClick={() => {
                  setSelected(file);
                }}
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
};
