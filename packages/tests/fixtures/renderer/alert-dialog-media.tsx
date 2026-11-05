import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@grasscn/web/ui/alert-dialog";
import * as React from "react";

export const AlertDialogMediaFixture = () => {
  const media = React.useRef<HTMLDivElement>(null);
  const [events, setEvents] = React.useState(0);
  const [tag, setTag] = React.useState("");

  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogHeader>
          {/* oxlint-disable shadcn/no-inline-styles -- This caller style is asserted as gap=8px by the forwarding test. */}
          <AlertDialogMedia
            ref={media}

            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- This fixture explicitly verifies AlertDialogMedia div ref and caller role forwarding with rich children and a nested button; replacing the receiver would change the tested public contract.
            role="group"
            aria-label="Confirmation media"
            data-user="kept"
            className="caller-media"
            style={{ gap: 8 }}
            onClick={() => {
              setEvents((n) => n + 1);
            }}
          >
            <span data-testid="rich-media">
              <strong>World thumbnail</strong>
              <small>世界</small>
            </span>
            <button type="button">Inspect media</button>
          </AlertDialogMedia>
          {/* oxlint-enable shadcn/no-inline-styles */}
          <AlertDialogTitle>Confirm world</AlertDialogTitle>
          <AlertDialogDescription>
            Review this world before continuing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <button
          type="button"
          onClick={() => {
            setTag(media.current?.tagName ?? "missing");
          }}
        >
          Read media ref
        </button>
        <output aria-label="Media ref">{tag}</output>
        <output aria-label="Media events">{events}</output>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
