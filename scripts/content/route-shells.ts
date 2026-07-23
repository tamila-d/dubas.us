import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { ContentSnapshot } from './pipeline.ts'
import { APP_ROUTES } from '../../src/config/routes.ts'

export interface RouteShellSummary {
  htmlFiles: string[]
}

function routeFile(outputRoot: string, route: string): string {
  const relative = route.replace(/^\/+|\/+$/g, '')
  return join(outputRoot, relative, 'index.html')
}

export async function writeRouteShells(
  _snapshot: ContentSnapshot,
  outputRoot: string,
): Promise<RouteShellSummary> {
  const source = join(outputRoot, 'index.html')
  const html = await readFile(source, 'utf8')
  const routes = [APP_ROUTES.card]
  const htmlFiles = routes.map((route) => routeFile(outputRoot, route))

  for (const file of htmlFiles) {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, html)
  }

  const notFoundFile = join(outputRoot, '404.html')
  await writeFile(notFoundFile, html)
  htmlFiles.push(notFoundFile)

  return { htmlFiles }
}
