const CUSTOMER_SIGNUP_RATE_LIMIT = 10
const CUSTOMER_SIGNUP_RATE_WINDOW_MS = 60_000
const CUSTOMER_SIGNUP_RATE_MAX_BUCKETS = 10_000
const customerSignupRateBuckets = new Map<string, { count: number; resetAt: number }>()

export function allowCustomerSignup(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const address = (forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown').slice(0, 128)
  const now = Date.now()
  const bucket = customerSignupRateBuckets.get(address)
  if (!bucket || bucket.resetAt <= now) {
    if (customerSignupRateBuckets.size >= CUSTOMER_SIGNUP_RATE_MAX_BUCKETS) {
      const oldestKey = customerSignupRateBuckets.keys().next().value as string | undefined
      if (oldestKey) customerSignupRateBuckets.delete(oldestKey)
    }
    customerSignupRateBuckets.set(address, {
      count: 1,
      resetAt: now + CUSTOMER_SIGNUP_RATE_WINDOW_MS,
    })
    return { allowed: true, retryAfter: 0 }
  }
  bucket.count += 1
  return {
    allowed: bucket.count <= CUSTOMER_SIGNUP_RATE_LIMIT,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

export function resetCustomerSignupRateLimitsForTests() {
  customerSignupRateBuckets.clear()
}
