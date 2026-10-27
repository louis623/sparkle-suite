import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Preserve the original public URL and exact Live source for every legacy page.
export async function GET() {
  return new Response(await readFile(join(process.cwd(), 'lib/amethyst/legacy/assets/homepage.jsx'), 'utf8'), {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' },
  })
}
