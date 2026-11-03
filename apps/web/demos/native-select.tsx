import *as React from'react';import{NativeSelect,NativeSelectOption,NativeSelectOptGroup}from'../registry/ui/native-select';import{Label}from'../registry/ui/label';

export const Demo = ({ scale = 2 }: { scale?: 1 | 2 | 3 }) => {
  const [value, setValue] = React.useState("survival");

  return (
    <div
      className="demo-stage"
      data-stage="native-select"
      style={{
        display: "grid",
        gap: 8 * scale,
        gridTemplateColumns: "minmax(0,1fr)",
      }}
    >
      <Label htmlFor="native-mode" scale={scale}>
        World mode
      </Label>
      <NativeSelect
        id="native-mode"
        scale={scale}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      >
        <NativeSelectOptGroup label="Game modes">
          <NativeSelectOption value="survival">Survival</NativeSelectOption>
          <NativeSelectOption value="creative">Creative</NativeSelectOption>
          <NativeSelectOption value="world">世界</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
      <NativeSelect scale={scale} disabled>
        <NativeSelectOption>Unavailable</NativeSelectOption>
      </NativeSelect>
    </div>
  );
};

export default Demo;
