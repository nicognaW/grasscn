import { createFromSource } from "fumadocs-core/search/server"
import { source } from "../../../lib/source"
import { componentSymbols } from "../../../lib/component-symbols"

export const { GET } = createFromSource(source, {
  buildIndex(page) {
    const name = page.slugs[0] === "components" ? page.slugs.at(-1) : undefined
    const symbols = name ? componentSymbols[name]?.exports ?? [] : []
    const seen = new Set([page.data.title.toLowerCase()])
    const terms = [...(name ? [name] : []), ...symbols, ...page.data.aliases, ...page.data.exports].filter(content => {
      const key = content.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    const structure = page.data.structuredData
    const heading = structure.headings.find(heading => heading.id === "usage")?.id
    return {
      id: page.url,
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      structuredData: {
        ...structure,
        contents: [...structure.contents, ...terms.map(content => ({ content, heading }))],
      },
    }
  },
})
