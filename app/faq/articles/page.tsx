import { notFound } from 'next/navigation'

// Articles are discovered on /faq; there is intentionally no blog index.
export default function BlogIndex() {
  notFound()
}
