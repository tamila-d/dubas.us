import { useEffect } from 'react'

export interface PageMetadata {
  title: string
  description: string
  robots?: string
}

interface MetaSnapshot {
  created: boolean
  element: HTMLMetaElement
  previousContent: string | null
}

function setMeta(name: string, content: string): MetaSnapshot {
  const existing = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  )
  const element = existing ?? document.createElement('meta')
  const snapshot = {
    created: existing === null,
    element,
    previousContent: existing?.getAttribute('content') ?? null,
  }

  if (existing === null) {
    element.name = name
    document.head.append(element)
  }
  element.content = content
  return snapshot
}

function restoreMeta(snapshot: MetaSnapshot): void {
  if (snapshot.created) {
    snapshot.element.remove()
    return
  }
  if (snapshot.previousContent === null) {
    snapshot.element.removeAttribute('content')
    return
  }
  snapshot.element.content = snapshot.previousContent
}

export function usePageMetadata(seo: PageMetadata): void {
  useEffect(() => {
    document.title = seo.title
    const description = setMeta('description', seo.description)
    const robots = seo.robots === undefined
      ? undefined
      : setMeta('robots', seo.robots)

    return () => {
      restoreMeta(description)
      if (robots !== undefined) {
        restoreMeta(robots)
      }
    }
  }, [seo.description, seo.robots, seo.title])
}
