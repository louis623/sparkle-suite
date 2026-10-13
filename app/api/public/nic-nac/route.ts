/** Retired public endpoint: no model calls, lead writes, or handoff processing. */
export async function POST() {
  return Response.json({ error: 'Public chat is unavailable. Please visit /faq.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } })
}
