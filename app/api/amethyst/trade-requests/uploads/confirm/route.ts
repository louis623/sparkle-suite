import { handleSwapUpload } from '@/lib/amethyst/swap-upload-route'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export function POST(request: Request) { return handleSwapUpload(request,'confirm') }
