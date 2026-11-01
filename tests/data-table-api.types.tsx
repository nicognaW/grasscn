import {createColumnHelper,useTable} from "@tanstack/react-table"
import {DataTable} from "../registry/blocks/data-table"
import {features,type DataTableFeatures} from "../registry/blocks/data-table-features"
type World={id:string;name:string}
const helper=createColumnHelper<DataTableFeatures,World>()
const columns=helper.columns([helper.accessor("name",{header:"World",filterFn:"includesString",sortFn:"text"})])
export const example=<DataTable columns={columns} data={[{id:"a",name:"世界"}]} scale={1}/>
export function TableComposition(){const table=useTable({features,columns,data:[{id:"a",name:"世界"}]});return <button onClick={()=>table.getColumn("name")?.toggleSorting()}>Sort</button>}
// @ts-expect-error Toolbar state belongs to the table recipe, not a second component API.
<DataTable columns={columns} data={[]} renderToolbar={()=>null}/>
