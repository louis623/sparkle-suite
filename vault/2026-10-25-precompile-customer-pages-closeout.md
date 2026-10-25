# 2026-10-25 precompile customer pages

- Smoke-only branch `cursor/precompile-customer-pages-d6f3` off `3f175871`. Not merged. Not deployed.
- Homepage, Dance Floor, and pantry now load esbuild classic transforms from `public/amethyst/compiled/` plus React 18.3.1 production UMD. Join and Unsubscribe are unchanged.
- Skin previews inline the compiled files. `'unsafe-eval'` stays because Unsubscribe previews still use Babel.
- Local throttled check: the server text block stayed up under 0.8s. Cold slow-4G homepage and Dance Floor themed paints were about 4.3s and 4.0s because render-blocking CSS delayed first paint. Desktop themed paints were under 0.2s.
