import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'

const mimeTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

const { values } = parseArgs({
  options: {
    host: { type: 'string', default: '127.0.0.1' },
    port: { type: 'string', default: '4173' },
  },
})
const host = values.host ?? '127.0.0.1'
const port = Number(values.port ?? '4173')

if (!Number.isSafeInteger(port) || port <= 0 || port > 65_535) {
  throw new Error('port must be an integer from 1 to 65535')
}

const outputRoot = resolve('dist')

function insideOutput(path: string): boolean {
  return path === outputRoot || path.startsWith(`${outputRoot}${sep}`)
}

function pathname(requestUrl: string | undefined): string {
  try {
    return decodeURIComponent(new URL(requestUrl ?? '/', 'http://local').pathname)
  } catch {
    return ''
  }
}

function candidatePath(path: string): string | undefined {
  if (path.length === 0 || path.includes('\\') || path.includes('\0')) {
    return undefined
  }

  const relative = path === '/'
    ? 'index.html'
    : path.endsWith('/')
      ? `${path.slice(1)}index.html`
      : path.slice(1)
  const candidate = resolve(outputRoot, relative)
  return insideOutput(candidate) ? candidate : undefined
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

const server = createServer(async (request, response) => {
  const path = pathname(request.url)
  const candidate = candidatePath(path)

  if (candidate === undefined) {
    response.statusCode = 400
    response.end('Bad request')
    return
  }

  if (!path.endsWith('/') && (await isDirectory(candidate))) {
    const search = new URL(request.url ?? '/', 'http://local').search
    response.statusCode = 308
    response.setHeader('Location', `${path}/${search}`)
    response.end()
    return
  }

  let file = candidate
  let status = 200
  let body: Buffer
  try {
    body = await readFile(file)
  } catch {
    file = resolve(outputRoot, '404.html')
    status = 404
    body = await readFile(file)
  }

  response.statusCode = status
  response.setHeader(
    'Content-Type',
    mimeTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
  )
  response.setHeader('Content-Length', String(body.byteLength))
  response.setHeader('Cache-Control', 'no-store')
  response.end(request.method === 'HEAD' ? undefined : body)
})

server.listen(port, host, () => {
  console.log(`Static artifact available at http://${host}:${port}/`)
})
