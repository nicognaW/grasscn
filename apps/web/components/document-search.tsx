"use client"

import { useDocsSearch } from "fumadocs-core/search/client"
import { fetchClient } from "fumadocs-core/search/client/fetch"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Command, CommandInput, CommandItem, CommandList } from "../registry/ui/command"
import { MinecraftText } from "../registry/ui/minecraft-text"
import "./document-search.css"

const client = fetchClient()
const plain = (text: string) => text.replace(/<\/?mark>/g, "")

export function DocumentSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const { search, setSearch, query } = useDocsSearch({ client })
  const results = !query.isLoading && !query.error && Array.isArray(query.data) ? query.data : []

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        input.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", shortcut)
    return () => window.removeEventListener("keydown", shortcut)
  }, [])
  useEffect(() => { setOpen(false); setSearch("") }, [pathname, setSearch])

  return <div className="minecraft-search" role="search" aria-label="Documentation" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <Command shouldFilter={false} scale={2} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false) }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") setOpen(true)
    }}>
      <CommandInput ref={input} aria-label="Search documentation" aria-expanded={open} placeholder="Find documentation..." value={search} onValueChange={value => { setSearch(value); setOpen(true) }} onFocus={() => setOpen(true)} />
      {open && <div className="minecraft-search-popup">
        <CommandList aria-label="Search results" aria-busy={query.isLoading}>
          {results.map(result => <CommandItem key={result.id} value={result.id} aria-label={plain(result.content)} onSelect={() => {
            router.push(result.url)
            setOpen(false)
            setSearch("")
            input.current?.blur()
          }}>
            {plain(result.content)}
            <span className="minecraft-search-context">{result.url}</span>
          </CommandItem>)}
        </CommandList>
        <div role="status" className="minecraft-search-status"><MinecraftText>{query.error ? "Search unavailable. Try again or browse the documentation." : query.isLoading ? "Searching..." : query.data === "empty" ? "Search names, exports, or documentation text." : !results.length ? "No results. Try another search." : `${results.length} results`}</MinecraftText></div>
      </div>}
    </Command>
  </div>
}
