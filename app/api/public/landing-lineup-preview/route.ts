import { landingPreviewDocument } from '@/lib/sparkle-suite/landing-demo-preview'
import type { LandingDemo } from '@/lib/sparkle-suite/landing-demo-model'

// Repository fixtures only: never resolve an account, poll a lineup, or write data.
const sample: LandingDemo = {
  slug: 'sample', businessName: 'Your show · Sample preview', theme: 'rose_gold',
  themeLabel: 'Rose Gold', headline: 'Your show starts here.', subtitle: '',
  ticker: 'Welcome to the show · Explore the Dance Floor · See who is in the lineup',
  themes: [],
}

export async function GET(request: Request) {
  return new Response(await landingPreviewDocument(sample, 'rose_gold', new URL(request.url).origin, true), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Security-Policy': "sandbox allow-scripts; frame-ancestors 'self'; form-action 'none'; connect-src 'none'",
      'Referrer-Policy': 'no-referrer',
    },
  })
}
