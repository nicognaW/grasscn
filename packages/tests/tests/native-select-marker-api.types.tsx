import * as React from 'react';
import { NativeSelect, NativeSelectOption, NativeSelectOptGroup } from '../../../apps/web/registry/ui/native-select';
import { Marker, MarkerContent, MarkerIcon, markerVariants } from '../../../apps/web/registry/ui/marker';
const selectRef = React.createRef<HTMLSelectElement>();
<NativeSelect ref={selectRef} name="world" required form="settings" value="one" onChange={event => { const select: HTMLSelectElement = event.currentTarget; select.value.toUpperCase(); }}><NativeSelectOptGroup label="Worlds"><NativeSelectOption value="one">世界</NativeSelectOption></NativeSelectOptGroup></NativeSelect>;
<NativeSelect multiple defaultValue={['one']}/>;
<Marker render={<a href="#world"/>} variant="separator">{<><MarkerIcon>!</MarkerIcon><MarkerContent>World</MarkerContent></>}</Marker>;
markerVariants({ variant: 'border' });
// @ts-expect-error The original CycleButton has no small visual variant.
<NativeSelect size="sm"/>;
