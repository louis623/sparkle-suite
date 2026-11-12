export function isQueuedVideoUrl(raw: unknown): boolean
export type VideoProvider = 'tiktok' | 'youtube' | 'instagram' | 'facebook'
export function queueVideoLink(raw: unknown): {provider:VideoProvider; id:string; canonical:string; error:null} | {provider:null; id:null; canonical:null; error:string}
