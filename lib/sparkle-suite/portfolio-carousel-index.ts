/** Keep the slide a visitor is on when layout shifts without a user gesture. */
export function nextCarouselIndex(activeIndex: number, nearestIndex: number, userMoved: boolean) {
  if (!userMoved) return activeIndex
  return nearestIndex
}
