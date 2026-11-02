import images from '../generated/hero-images.json';
const React = window.React;

export function ResponsiveStill({ src, className, width, height, sizes = '100vw', hero = false }) {
  const image = images[src];
  const props = { className, alt: '', width: image?.width || width, height: image?.height || height,
    fetchPriority: 'high', 'data-hero-still': hero ? '' : undefined };
  if (!image) return <img {...props} src={src} />;
  const srcSet = format => image.variants.map(v => `${v[format].src} ${v.width}w`).join(', ');
  return <picture>
    <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
    <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
    <img {...props} src={image.variants[1].webp.src} srcSet={srcSet('webp')} sizes={sizes} />
  </picture>;
}
