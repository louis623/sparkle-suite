function queueVideoLink(raw) {
  const unsupported = "This needs a public TikTok, YouTube, Instagram, or Facebook video link.";
  const share = "Open the video and copy the full link.";
  const invalid = (error = unsupported) => ({ provider: null, id: null, canonical: null, error });
  const source = String(raw || "").trim();
  if (!/^https?:\/\/[a-z0-9.-]+(?::443)?(?:[/?#]|$)/i.test(source) || /[\\\s]/.test(source)) return invalid();
  try {
    const url = new URL(source);
    if (["www.youtu.be", "www.m.youtube.com", "www.fb.watch", "www.l.instagram.com"].includes(url.hostname)) return invalid();
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname.replace(/\/$/, "");
    const result = (provider, id, canonical) => ({ provider, id, canonical, error: null });
    if (host === "tiktok.com") {
      const m = path.match(/^(?:\/(@[A-Za-z0-9._]{2,24})\/video|\/video|\/player\/v1|\/embed(?:\/v2)?)\/(\d{8,22})$/);
      if (m) return result("tiktok", m[2], "https://www.tiktok.com/" + (m[1] ? m[1] + "/video/" : "embed/v2/") + m[2]);
    }
    if (["youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) {
      const id = host === "youtu.be" ? path.slice(1) : path === "/watch" ? url.searchParams.get("v") : path.match(/^\/(?:shorts|embed|live)\/([^/]+)$/)?.[1];
      if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return result("youtube", id, "https://www.youtube.com/watch?v=" + id);
    }
    if (host === "l.instagram.com" || host === "fb.watch") return invalid(share);
    if (host === "instagram.com") {
      if (/^\/share(?:\/|$)/.test(path)) return invalid(share);
      const m = path.match(/^\/(?:[A-Za-z0-9._]+\/)?(reel|p|reels)\/([A-Za-z0-9_-]{5,32})(?:\/embed)?$/);
      if (m && !/^\/(?:stories|tv)\//.test(path) && !/^\/[^/]+\/reels\//.test(path)) return result("instagram", m[2], "https://www.instagram.com/" + (m[1] === "p" ? "p" : "reel") + "/" + m[2] + "/");
    }
    if (host === "facebook.com") {
      if (/^\/share(?:\/|$)/.test(path)) return invalid(share);
      if (path === "/plugins/video.php") {
        const href = url.searchParams.get("href") || "";
        if (/^https?:\/\/(?:www\.)?facebook\.com\/(?:reel\/|watch[/?]|videos\/|[A-Za-z0-9._-]+\/videos\/)/i.test(href)) return queueVideoLink(href);
      }
      const id = path === "/watch" ? url.searchParams.get("v") : path.match(/^\/(?:reel|videos|[A-Za-z0-9._-]+\/videos)\/([0-9]+)$/)?.[1];
      if (id && !/^\/groups\//.test(path) && /^\d{5,25}$/.test(id)) return result("facebook", id, "https://www.facebook.com/watch/?v=" + id);
      return invalid("Paste a Facebook video or Reel link.");
    }
  } catch { /* Invalid URL. */ }
  return invalid();
}
function isQueuedVideoUrl(raw) {
  if (queueVideoLink(raw).id) return true;
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.port &&
      ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(url.hostname);
  } catch { return false; }
}
module.exports = { queueVideoLink, isQueuedVideoUrl };
