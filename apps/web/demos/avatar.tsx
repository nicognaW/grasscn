import type { DemoVariables } from "../demo-variables";
import * as React from "react"
import {Input} from "../registry/ui/input"
import {Button} from "../registry/ui/button"
import {Avatar,AvatarImage,AvatarFallback,AvatarGroup,AvatarGroupCount} from "../registry/ui/avatar"
import type {DemoProps} from "../types"

const people = [
  { name: "Jordan Lee", role: "Frontend developer", skin: "wide/steve" },
  { name: "Alex Morgan", role: "Design engineer", skin: "slim/alex" },
  { name: "Sam Rivera", role: "Product designer", skin: "wide/kai" },
  { name: "Jamie Chen", role: "Project lead", skin: "wide/sunny" },
] as const;

export default function AvatarDemo({ scale }: DemoProps) {
  const [name, setName] = React.useState("Nyanki"),
    [player, setPlayer] = React.useState("Nyanki"),
    [status, setStatus] = React.useState("loading");

  return (
    <div
      className="demo-stage demo-stage-display-grid demo-stage-gap-16"
      data-stage="avatar"
    >
      <span>MINECRAFT PLAYER</span>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = name.trim();

          if (value && value !== player) {
            setStatus("loading");
            setPlayer(value);
          }
        }}
        className="flex flex-wrap gap-3"
      >
        <label
          style={{ display: "grid", gap: 8, minWidth: 0, flex: "1 1 180px" }}
        >
          Minecraft username
          <Input
            scale={scale}
            aria-label="Minecraft username"
            required
            pattern="[A-Za-z0-9_]{1,16}"
            maxLength={16}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            className="w-full"
          />
        </label>
        <Button
          type="submit"
          scale={scale}
          className="demo-align-self-end w-(--demo-width) max-w-full"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${120 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
        >
          Load player
        </Button>
      </form>
      <div className="grass-team-member">
        <Avatar scale={scale} size="lg">
          <AvatarImage
            key={player}
            src={`https://mc-heads.net/avatar/${encodeURIComponent(player)}/40`}
            alt={`${player}'s Minecraft avatar`}
            onLoadingStatusChange={setStatus}
          />
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
        <div>
          <strong>{player}</strong>
          <span role="status">
            {status === "loaded"
              ? "Player skin"
              : status === "error"
                ? "Avatar unavailable. Try again later."
                : "Loading player skin..."}
          </span>
        </div>
      </div>
      <p className="grass-note">
        Username lookup requires an internet connection. Profiles may be cached.
      </p>
      <span>TEAM PROFILES</span>
      <div className="grass-team">
        {people.map((person) => (
          <div className="grass-team-member" key={person.name}>
            <Avatar scale={scale} size="lg">
              <AvatarImage skin={person.skin} alt={person.name} />
            </Avatar>
            <div>
              <strong>{person.name}</strong>
              <span>{person.role}</span>
            </div>
          </div>
        ))}
      </div>
      <span>WORKSPACE MEMBERS</span>
      <AvatarGroup aria-label="Workspace members">
        {people.map((person) => (
          <Avatar key={person.name} scale={scale}>
            <AvatarImage skin={person.skin} alt={person.name} />
          </Avatar>
        ))}
        <AvatarGroupCount aria-label="Two more members">+2</AvatarGroupCount>
      </AvatarGroup>
      <p>6 people in this workspace</p>
    </div>
  );
}
