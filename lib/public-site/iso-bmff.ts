import {
  VIDEO_MAX_BYTES, VIDEO_MAX_DIMENSION, VIDEO_MIN_DIMENSION,
  VIDEO_MIN_SECONDS, VIDEO_MAX_SECONDS, VIDEO_CAP_MESSAGE, VIDEO_CODEC_MESSAGE,
} from './tiktok-video-limits'

type Box = { type: string; start: number; end: number }

function boxes(data: Buffer, start = 0, end = data.length): Box[] {
  const result: Box[] = []
  while (start < end) {
    if (end - start < 8) throw new Error(VIDEO_CODEC_MESSAGE)
    let length = data.readUInt32BE(start)
    let header = 8
    if (length === 1) {
      if (end - start < 16) throw new Error(VIDEO_CODEC_MESSAGE)
      const large = data.readBigUInt64BE(start + 8)
      if (large > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(VIDEO_CODEC_MESSAGE)
      length = Number(large)
      header = 16
    }
    if (length === 0) length = end - start
    if (length < header || length > end - start) throw new Error(VIDEO_CODEC_MESSAGE)
    result.push({ type: data.toString('ascii', start + 4, start + 8), start: start + header, end: start + length })
    start += length
  }
  return result
}

function child(data: Buffer, parent: Box, type: string) {
  const found = boxes(data, parent.start, parent.end).find(box => box.type === type)
  if (!found) throw new Error(VIDEO_CODEC_MESSAGE)
  return found
}

export function inspectTikTokVideo(data: Buffer) {
  if (!data.length || data.length > VIDEO_MAX_BYTES) throw new Error(VIDEO_CAP_MESSAGE)
  const root = boxes(data)
  const ftyp = root.find(box => box.type === 'ftyp')
  const moov = root.find(box => box.type === 'moov')
  if (!ftyp || ftyp.end - ftyp.start < 8 || !moov) throw new Error(VIDEO_CODEC_MESSAGE)
  const mimeType = data.toString('ascii', ftyp.start, ftyp.start + 4) === 'qt  ' ? 'video/quicktime' : 'video/mp4'
  const mvhd = child(data, moov, 'mvhd')
  const version = data[mvhd.start]
  if (version !== 0 && version !== 1) throw new Error(VIDEO_CODEC_MESSAGE)
  const timeOffset = mvhd.start + (version === 1 ? 20 : 12)
  if (timeOffset + (version === 1 ? 12 : 8) > mvhd.end) throw new Error(VIDEO_CODEC_MESSAGE)
  const timescale = data.readUInt32BE(timeOffset)
  const ticks = version === 1 ? Number(data.readBigUInt64BE(timeOffset + 4)) : data.readUInt32BE(timeOffset + 4)
  const durationSeconds = ticks / timescale
  const tracks = boxes(data, moov.start, moov.end).filter(box => box.type === 'trak')
  let videoTrack: Box | undefined
  let videoMedia: Box | undefined
  for (const track of tracks) {
    const media = child(data, track, 'mdia')
    const handler = child(data, media, 'hdlr')
    if (handler.end - handler.start < 12) throw new Error(VIDEO_CODEC_MESSAGE)
    if (data.toString('ascii', handler.start + 8, handler.start + 12) === 'vide') {
      videoTrack = track
      videoMedia = media
      break
    }
  }
  if (!videoTrack || !videoMedia) throw new Error(VIDEO_CODEC_MESSAGE)
  const tkhd = child(data, videoTrack, 'tkhd')
  const trackVersion = data[tkhd.start]
  if (trackVersion !== 0 && trackVersion !== 1) throw new Error(VIDEO_CODEC_MESSAGE)
  const matrixOffset = tkhd.start + (trackVersion === 1 ? 52 : 40)
  if (matrixOffset + 44 > tkhd.end) throw new Error(VIDEO_CODEC_MESSAGE)
  let width = data.readUInt32BE(matrixOffset + 36) / 65536
  let height = data.readUInt32BE(matrixOffset + 40) / 65536
  const a = data.readInt32BE(matrixOffset)
  const b = data.readInt32BE(matrixOffset + 4)
  const c = data.readInt32BE(matrixOffset + 12)
  const d = data.readInt32BE(matrixOffset + 16)
  if (a === 0 && d === 0 && Math.abs(b) === 65536 && Math.abs(c) === 65536) [width, height] = [height, width]
  const stsd = child(data, child(data, child(data, videoMedia, 'minf'), 'stbl'), 'stsd')
  if (stsd.end - stsd.start < 16) throw new Error(VIDEO_CODEC_MESSAGE)
  const samples = boxes(data, stsd.start + 8, stsd.end)
  const codec = samples[0]?.type
  if (!['avc1', 'avc3'].includes(codec) || !Number.isFinite(durationSeconds) || durationSeconds < VIDEO_MIN_SECONDS ||
      !Number.isInteger(width) || !Number.isInteger(height) ||
      width < VIDEO_MIN_DIMENSION || height < VIDEO_MIN_DIMENSION || width > VIDEO_MAX_DIMENSION || height > VIDEO_MAX_DIMENSION) {
    throw new Error(VIDEO_CODEC_MESSAGE)
  }
  if (durationSeconds > VIDEO_MAX_SECONDS) throw new Error(VIDEO_CAP_MESSAGE)
  return { mimeType, byteSize: data.length, width, height, durationSeconds, codec }
}
