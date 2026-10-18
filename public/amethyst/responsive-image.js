/* global window */
/**
 * Same contract as lib/seo/responsive-public-image.ts.
 * Customer-site pages are static JSX, so they call this instead of next/image.
 * Widths must stay inside the Next image optimizer allowlist in next.config.ts.
 */
(function sparkleResponsiveImageRuntime() {
  var WIDTHS = { 128: true, 256: true, 384: true, 640: true, 828: true, 1080: true, 1200: true, 1920: true };

  function canOptimize(src) {
    if (src.charAt(0) === "/" && src.charAt(1) !== "/") return true;
    try {
      var url = new URL(src);
      var allowed = url.hostname === "bqhzfkgkjyuhlsozpylf.supabase.co" || url.hostname === "pukemqiwlyqmyytxkdmo.supabase.co";
      return url.protocol === "https:" && allowed && url.pathname.indexOf("/storage/v1/object/public/") !== -1;
    } catch (error) {
      return false;
    }
  }

  function optimizerUrl(src, width, quality) {
    var params = new URLSearchParams();
    params.set("url", src);
    params.set("w", String(width));
    params.set("q", String(quality));
    return "/_next/image?" + params.toString();
  }

  function sparkleResponsiveImage(src, options) {
    var settings = options || {};
    var alt = settings.alt || "";
    var loading = settings.eager ? "eager" : "lazy";
    var cleaned = String(src || "").trim();
    if (!cleaned || !canOptimize(cleaned)) {
      return { src: cleaned, alt: alt, decoding: "async", loading: loading };
    }

    var quality = settings.quality || 75;
    var requested = settings.widths || (settings.eager ? [640, 828, 1200, 1920] : [384, 640, 828]);
    var widths = requested.filter(function (width) { return WIDTHS[width]; }).sort(function (left, right) { return left - right; });
    if (!widths.length) widths = [640];
    var largest = widths[widths.length - 1];

    return {
      src: optimizerUrl(cleaned, largest, quality),
      srcSet: widths.map(function (width) { return optimizerUrl(cleaned, width, quality) + " " + width + "w"; }).join(", "),
      sizes: settings.sizes,
      alt: alt,
      decoding: "async",
      loading: loading,
      fetchPriority: settings.eager ? "high" : "low",
    };
  }

  window.sparkleResponsiveImage = sparkleResponsiveImage;
})();
