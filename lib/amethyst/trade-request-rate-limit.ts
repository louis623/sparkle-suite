const TRADE_REQUEST_RATE_LIMIT = 5
const TRADE_REQUEST_RATE_WINDOW_MS = 60_000
const TRADE_REQUEST_RATE_MAX_BUCKETS = 10_000
const tradeRequestRateBuckets = new Map<string, { count: number; resetAt: number }>()

export function allowTradeRequest(_request: Request, listingId: string, namespace: 'send' | 'screen', addressHash: string) {
  const key = [namespace, addressHash, listingId.trim().slice(0, 100)].join(':')
  const now = Date.now()
  const bucket = tradeRequestRateBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    if (tradeRequestRateBuckets.size >= TRADE_REQUEST_RATE_MAX_BUCKETS) {
      const oldestKey = tradeRequestRateBuckets.keys().next().value as string | undefined
      if (oldestKey) tradeRequestRateBuckets.delete(oldestKey)
    }
    tradeRequestRateBuckets.set(key, {
      count: 1,
      resetAt: now + TRADE_REQUEST_RATE_WINDOW_MS,
    })
    return { allowed: true, retryAfter: 0 }
  }
  bucket.count += 1
  return {
    allowed: bucket.count <= TRADE_REQUEST_RATE_LIMIT,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

export function resetTradeRequestRateLimitsForTests() {
  tradeRequestRateBuckets.clear()
}
