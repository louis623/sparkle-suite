import { it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { inspectTikTokVideo } from '@/lib/public-site/iso-bmff'
import { VIDEO_MAX_BYTES } from '@/lib/public-site/tiktok-video-limits'
import { completeTikTokQueueItem, cleanupTikTokQueue, fetchTikTokThumbnail } from '@/lib/services/tiktok-video-queue'
import { tiktokTestClient } from '../fixtures/tiktok-test-client'
import sharp from 'sharp'

it('tiktok media: reads fixture mp4 size, duration and codec; rejects HEVC and over-cap', () => {
  const bytes = readFileSync('public/amethyst/skins/sunset-beach/hero-loop.mp4')
  const info = inspectTikTokVideo(bytes)
  expect(info).toMatchObject({mimeType:'video/mp4',byteSize:bytes.length,codec:'avc1'})
  expect(info.durationSeconds).toBeGreaterThan(0.5)
  expect(info.durationSeconds).toBeLessThanOrEqual(180)
  const bad = Buffer.from(bytes)
  const marker = bad.indexOf('avc1', bad.indexOf('stsd'))
  expect(marker).toBeGreaterThan(0)
  bad.write('hvc1', marker)
  expect(() => inspectTikTokVideo(bad)).toThrow(/H.264/)
  expect(() => inspectTikTokVideo(Buffer.alloc(VIDEO_MAX_BYTES + 1))).toThrow(/50 MB/)
  expect(() => inspectTikTokVideo(bytes.subarray(0,100))).toThrow()
})
it('tiktok complete: lost response replay returns the asset and deletes nothing', async () => {
  const mock = tiktokTestClient({tiktok_video_upload_tickets:{operator_rep_id:'owner',consumed_at:'2026-11-10',asset_id:'asset'}})
  expect(await completeTikTokQueueItem(mock.client,{ticketId:'ticket',operatorRepId:'owner',method:'save_video'})).toEqual({assetId:'asset',replayed:true})
  expect(mock.bucket.download).not.toHaveBeenCalled()
  expect(mock.bucket.remove).not.toHaveBeenCalled()
  await expect(completeTikTokQueueItem(mock.client,{ticketId:'ticket',operatorRepId:'other',method:'save_video'})).rejects.toMatchObject({statusCode:403})
  expect(mock.api.rpc).not.toHaveBeenCalled()
})
it('tiktok cleanup: removes only expired ticket keys and purged thumbnails, never assets', async () => {
  const mock = tiktokTestClient({}, {
    tiktok_queue_daily_maintenance:{synced:1,failed:0},
    tiktok_queue_purge_closed:[{purged_count:1,thumb_paths:['purged-thumb.webp']}],
    tiktok_expired_ticket_keys:[{ticket_id:'expired',keys:['unused.mp4','unused-source.jpg']}],
  })
  expect(await cleanupTikTokQueue(mock.client)).toEqual({synced:1,failed:0,purgedItems:1,removedThumbs:1,expiredTickets:1,removedKeys:2})
  expect(mock.bucket.remove.mock.calls).toEqual([[['purged-thumb.webp']],[['unused.mp4','unused-source.jpg']]])
  expect(mock.queries.some(q => q.table === 'public_site_videos')).toBe(false)
  const sql = readFileSync('supabase/migrations/20261110120000_tiktok_video_queue.sql','utf8')
  expect(sql).toContain("interval '90 days'")
  expect(sql).toContain('into v_count, v_paths from del;')
  expect(sql).toContain('return query select v_count')
  const config = JSON.parse(readFileSync('vercel.json','utf8'))
  expect(config.crons).toContainEqual({path:'/api/internal/tiktok-queue/cleanup',schedule:'45 5 * * *'})
})
it('tiktok thumbnail: allowlisted host only, no redirects, png saved as webp', async () => {
  const png = await sharp({create:{width:20,height:20,channels:3,background:'red'}}).png().toBuffer()
  const mock = tiktokTestClient({tiktok_video_queue:{id:'item',rep_id:'rep',tiktok_video_id:'12345678',status:'pending',source_url:'https://www.tiktok.com/embed/12345678'}},{tiktok_hosted_video_enabled:true})
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({thumbnail_url:'https://img.tiktokcdn.com/image.png'}),{headers:{'content-type':'application/json'}})).mockResolvedValueOnce(new Response(new Uint8Array(png),{headers:{'content-type':'image/png'}}))
  vi.stubGlobal('fetch',fetchMock)
  try {
    expect(await fetchTikTokThumbnail(mock.client,'item')).toEqual({ok:true})
    expect(fetchMock.mock.calls.every(call => call[1].redirect === 'manual')).toBe(true)
    expect(mock.bucket.upload.mock.calls[0][0]).toBe('rep/12345678/thumb-item.webp')
    expect((await sharp(mock.bucket.upload.mock.calls[0][1]).metadata()).format).toBe('webp')
    fetchMock.mockReset().mockResolvedValueOnce(new Response(JSON.stringify({thumbnail_url:'https://tiktokcdn.com.evil.io/image.jpg'})))
    expect(await fetchTikTokThumbnail(mock.client,'item')).toEqual({ok:false})
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fetchMock.mockReset().mockResolvedValueOnce(new Response(null,{status:302,headers:{location:'https://www.tiktok.com/next'}}))
    expect(await fetchTikTokThumbnail(mock.client,'item')).toEqual({ok:false})
  } finally { vi.unstubAllGlobals() }
})
