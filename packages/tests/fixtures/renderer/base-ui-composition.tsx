import { Field } from "@base-ui/react/field";
import { Button } from "@grasscn/web/ui/button";
import { ButtonGroupText } from "@grasscn/web/ui/button-group";
import { Checkbox } from "@grasscn/web/ui/checkbox";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@grasscn/web/ui/dialog";
import { Input } from "@grasscn/web/ui/input";
import {
  SidebarProvider,
  SidebarGroupLabel,
  SidebarMenuSubButton,
} from "@grasscn/web/ui/sidebar";
import * as React from "react";

interface CompositionCheckedStyle extends React.CSSProperties {
  "--checked-state": number;
}

interface CompositionOpenStyle extends React.CSSProperties {
  "--open-state": number;
}

export const BaseUICompositionFixture = () => {
  const [disabled, setDisabled] = React.useState(false);
  const [subClicks, setSubClicks] = React.useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDisabled((value) => !value);
        }}
      >
        Toggle disabled
      </button>
      <Button
        disabled={disabled}
        className={(state) =>
          state.disabled ? "state-disabled" : "state-enabled"
        }
        style={(state) => ({ width: state.disabled ? 300 : 240 })}
      >
        Stateful button
      </Button>
      <Checkbox
        aria-label="Stateful checkbox"
        className={(state) =>
          state.checked ? "state-checked" : "state-unchecked"
        }
        style={(state): CompositionCheckedStyle => ({
          "--checked-state": state.checked ? 1 : 0,
        })}
      />
      <Field.Root disabled={disabled}>
        <Field.Label>Inherited field</Field.Label>
        <Input aria-label="Inherited field" defaultValue="Hello 世界" />
      </Field.Root>
      <ButtonGroupText render={<a href="#group" />}>
        Composed group text
      </ButtonGroupText>
      <SidebarProvider>
        <SidebarGroupLabel render={<a href="#sidebar" />}>
          Composed sidebar label
        </SidebarGroupLabel>
        <SidebarMenuSubButton
          render={<a />}
          href="#composed-sub"
          onClick={(event) => {
            event.preventDefault();
            setSubClicks((value) => value + 1);
          }}
        >
          Composed submenu
        </SidebarMenuSubButton>
        <output aria-label="Submenu actions">{subClicks}</output>
      </SidebarProvider>
      <Dialog>
        <DialogTrigger>Open stateful dialog</DialogTrigger>
        <DialogContent
          className={(state) => (state.open ? "state-open" : "state-closed")}
          style={(state): CompositionOpenStyle => ({
            "--open-state": state.open ? 1 : 0,
          })}
        >
          <DialogTitle>Native state</DialogTitle>
        </DialogContent>
      </Dialog>
    </>
  );
};
