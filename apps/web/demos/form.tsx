import { FormExample } from "../registry/blocks/form";
import type { DemoProps } from "../types";

const FormDemo = ({ scale }: DemoProps) => (
  <div className="demo-stage" data-stage="form">
    <div data-stage="field" className="min-w-0 w-full">
      <FormExample scale={scale} />
    </div>
  </div>
);

export { FormDemo as default };
