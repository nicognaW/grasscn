"use client"

import * as React from "react"
import {useTable,tableFeatures,columnFilteringFeature,columnVisibilityFeature,rowPaginationFeature,rowSelectionFeature,rowSortingFeature,createFilteredRowModel,createPaginatedRowModel,createSortedRowModel,filterFn_includesString,sortFn_alphanumeric,sortFn_text,type ColumnDef,type RowData,type ReactTable,type TableOptions} from "@tanstack/react-table"
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from "./table"
import {MinecraftDisclosureText} from "./minecraft-disclosure-text"

const dataTableFeatures=tableFeatures({columnFilteringFeature,columnVisibilityFeature,rowPaginationFeature,rowSelectionFeature,rowSortingFeature,filteredRowModel:createFilteredRowModel(),paginatedRowModel:createPaginatedRowModel(),sortedRowModel:createSortedRowModel(),filterFns:{includesString:filterFn_includesString},sortFns:{alphanumeric:sortFn_alphanumeric,text:sortFn_text}})
type DataTableFeatures=typeof dataTableFeatures
type DataTableInstance<TData extends RowData>=ReactTable<DataTableFeatures,TData>
type DataTableProps<TData extends RowData>={
 columns:ColumnDef<DataTableFeatures,TData>[]
 data:TData[]
 options?:Omit<TableOptions<DataTableFeatures,TData>,"features"|"columns"|"data">
 tableRef?:React.Ref<DataTableInstance<TData>>
 renderToolbar?:(table:DataTableInstance<TData>)=>React.ReactNode
 renderFooter?:(table:DataTableInstance<TData>)=>React.ReactNode
 textLayout?:{maxWidth?:number;align?:"left"|"center"}
 emptyMessage?:React.ReactNode
 rowProps?:(row:ReturnType<DataTableInstance<TData>["getRowModel"]>["rows"][number])=>React.ComponentProps<"tr">
}&Omit<React.ComponentProps<typeof Table>,"children">
function DataTable<TData extends RowData>({columns,data,options,tableRef,renderToolbar,renderFooter,emptyMessage="No results.",rowProps,textLayout,scale=2,...props}:DataTableProps<TData>){
 const table=useTable({features:dataTableFeatures,columns,data,defaultColumn:{cell:info=><MinecraftDisclosureText scale={scale} maxWidth={textLayout?.maxWidth} align={textLayout?.align} style={{width:"100%"}}>{String(info.getValue()??"")}</MinecraftDisclosureText>},...options})
 React.useImperativeHandle(tableRef,()=>table,[table])
 const rows=table.getRowModel().rows
 return <div data-slot="data-table" style={{width:"100%",minWidth:0}}>{renderToolbar?.(table)}<Table scale={scale} {...props}><TableHeader>{table.getHeaderGroups().map(group=><TableRow key={group.id}>{group.headers.map(header=><TableHead key={header.id} aria-sort={header.column.getIsSorted()==="asc"?"ascending":header.column.getIsSorted()==="desc"?"descending":"none"} colSpan={header.colSpan} maxTextWidth={textLayout?.maxWidth} textAlign={textLayout?.align}>{header.isPlaceholder?null:typeof header.column.columnDef.header==="string"?header.column.columnDef.header:<table.FlexRender header={header}/>}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{rows.length?rows.map(row=><TableRow key={row.id} data-state={row.getIsSelected()?"selected":undefined} aria-selected={row.getIsSelected()} {...rowProps?.(row)}>{row.getVisibleCells().map(cell=><TableCell key={cell.id}><table.FlexRender cell={cell}/></TableCell>)}</TableRow>):<TableRow><TableCell colSpan={Math.max(1,table.getVisibleLeafColumns().length)}>{emptyMessage}</TableCell></TableRow>}</TableBody></Table>{renderFooter?.(table)}</div>
}
export{DataTable,dataTableFeatures}
export type{DataTableFeatures,DataTableProps,DataTableInstance}
