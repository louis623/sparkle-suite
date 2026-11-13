import { handleSwapUpload } from '@/lib/amethyst/swap-upload-route'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function POST(request: Request) { return handleSwapUpload(request,'ticket') }
export function DELETE(request: Request) { return handleSwapUpload(request,'discard') }
