import { readFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { extname, resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import {
  contentMimeTypes,
  isSafeContentRequest,
  scanContent,
  writeContentArtifact,
  type ContentSnapshot,
} from './pipeline.ts'
import { generateContentImages } from './image-pipeline.ts'
import { writeRouteShells } from './route-shells.ts'

function requestPath(url: string | undefined): string {
  return (url ?? '/').split('?', 1)[0] ?? '/'
}

function sendError(
  response: ServerResponse,
  status: number,
  message: string,
): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'text/plain; charset=utf-8')
  response.end(message)
}

export function rootContentPlugin(): Plugin {
  let config: ResolvedConfig
  let contentRoot = ''
  let snapshot: ContentSnapshot | undefined
  let snapshotPromise: Promise<ContentSnapshot> | undefined
  let refreshSequence: Promise<void> = Promise.resolve()

  const refreshSnapshot = () => {
    const nextSnapshot = refreshSequence
      .catch(() => undefined)
      .then(() => generateContentImages(contentRoot))
      .then(() => scanContent(contentRoot))
    refreshSequence = nextSnapshot.then(
      () => undefined,
      () => undefined,
    )
    snapshotPromise = nextSnapshot.then((value) => {
      snapshot = value
      return value
    })
    return snapshotPromise
  }

  return {
    name: 'artist-root-content',
    enforce: 'pre',
    configResolved(resolvedConfig) {
      config = resolvedConfig
      contentRoot = resolve(config.root, 'content')
    },
    async buildStart() {
      await refreshSnapshot()
    },
    async configureServer(server) {
      await refreshSnapshot()
      server.watcher.add(contentRoot)

      server.watcher.on('all', (_event, changedPath) => {
        if (!resolve(changedPath).startsWith(contentRoot)) {
          return
        }
        const normalizedPath = changedPath.split('\\').join('/')
        if (
          /\/images\/[^/]+\/\d+\.(?:avif|jpg|webp)$/.test(
            normalizedPath,
          )
        ) {
          return
        }

        void refreshSnapshot().then(
          () => server.ws.send({ type: 'full-reload' }),
          (error: unknown) => {
            server.config.logger.error(
              error instanceof Error ? error.message : String(error),
            )
            server.ws.send({ type: 'full-reload' })
          },
        )
      })

      server.middlewares.use(async (request, response, next) => {
        const pathname = requestPath(request.url)
        if (!pathname.startsWith('/content/')) {
          next()
          return
        }

        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.setHeader('Allow', 'GET, HEAD')
          sendError(response, 405, 'Method not allowed')
          return
        }
        if (!isSafeContentRequest(pathname)) {
          sendError(response, 403, 'Forbidden')
          return
        }

        try {
          const currentSnapshot =
            snapshotPromise === undefined
              ? await refreshSnapshot()
              : await snapshotPromise
          const relativePath = decodeURIComponent(
            pathname.slice('/content/'.length),
          )
          const generated = currentSnapshot.indexJson[relativePath]

          if (generated !== undefined) {
            response.statusCode = 200
            response.setHeader('Content-Type', contentMimeTypes['.json'])
            response.setHeader('Cache-Control', 'no-store')
            response.end(request.method === 'HEAD' ? undefined : generated)
            return
          }

          const file = currentSnapshot.publicFiles.get(relativePath)
          if (file === undefined) {
            sendError(response, 404, 'Not found')
            return
          }

          response.statusCode = 200
          response.setHeader(
            'Content-Type',
            contentMimeTypes[extname(file.relativePath).toLowerCase()] ??
              'application/octet-stream',
          )
          response.setHeader('Content-Length', String(file.size))
          response.setHeader('Cache-Control', 'no-store')
          response.end(
            request.method === 'HEAD'
              ? undefined
              : await readFile(file.absolutePath),
          )
        } catch (error) {
          server.config.logger.error(
            error instanceof Error ? error.message : String(error),
          )
          sendError(response, 500, 'Content validation failed')
        }
      })
    },
    async writeBundle(outputOptions) {
      const currentSnapshot = snapshot ?? (await refreshSnapshot())
      const outputRoot = resolve(
        config.root,
        outputOptions.dir ?? config.build.outDir,
      )
      await writeContentArtifact(currentSnapshot, resolve(outputRoot, 'content'))
      await writeRouteShells(currentSnapshot, outputRoot)
    },
  }
}
