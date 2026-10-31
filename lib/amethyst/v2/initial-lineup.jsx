// SSR and hydration share the exact same expiry decision and fallback copy.
// Subsequent polling still uses the existing lineup controller and its clock.
export function initialLineup(content) {
  const firstPaint = window.SPARKLE_FIRST_PAINT;
  if (firstPaint && Object.hasOwn(firstPaint, 'lineup')) return firstPaint.lineup;
  const initial = window.SparkleLiveLineup?.initialState?.(content) || content;
  // Do not duplicate the whole homepage payload in the hydration snapshot.
  const lineup = Object.fromEntries(Object.entries(initial).filter(([key]) => key.startsWith('liveQueue')));
  if (firstPaint) firstPaint.lineup = lineup;
  return lineup;
}
