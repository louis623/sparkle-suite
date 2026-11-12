/* Shared by the compiled homepage and both classic homepage sources. */
(function installCardVideo(root) {
  if (root.SparkleCardVideo) return;

  function createController(options = {}) {
    const entries = new Map();
    let active = null;
    let muted = false;
    let revision = 0;
    const state = (entry) => ({ playing: active === entry && entry.requested, muted });
    const publish = (entry) => entry.changed(state(entry));
    const setMuted = (value) => {
      muted = value;
      for (const entry of entries.values()) {
        entry.video.muted = muted;
        publish(entry);
      }
    };
    function pause(entry) {
      if (active === entry) { active = null; revision++; }
      entry.requested = false;
      entry.video.pause();
      publish(entry);
    }
    async function play(entry) {
      if (!entries.has(entry.video)) return;
      if (active && active !== entry) pause(active);
      active = entry;
      entry.requested = true;
      const request = ++revision;
      entry.video.muted = muted;
      // Assign the source synchronously inside the trusted click, before play().
      // React never attaches a source during rendering or intersection changes.
      if (!entry.loaded) { entry.video.src = entry.src; entry.loaded = true; }
      publish(entry);
      try {
        await entry.video.play();
      } catch (error) {
        if (active !== entry || revision !== request) return;
        if (!muted && error?.name === 'NotAllowedError') {
          setMuted(true);
          try { await entry.video.play(); }
          catch (_) { if (active === entry && revision === request) pause(entry); }
        } else pause(entry);
      }
      // A late resolution cannot resume a card after pause, scroll or another Play.
      if (active !== entry || !entry.requested) entry.video.pause();
      else if (revision === request) publish(entry);
    }
    const observer = options.IntersectionObserver ? new options.IntersectionObserver((changes) => {
      for (const change of changes) {
        const entry = entries.get(change.target);
        if (entry === active && (!change.isIntersecting || change.intersectionRatio === 0)) pause(entry);
      }
    }, { threshold: 0 }) : null;

    return {
      register(video, src, changed = () => {}) {
        const entry = { video, src, changed, loaded: false, requested: false };
        const onPlay = () => {
          if (active !== entry || !entry.requested) video.pause();
          else publish(entry);
        };
        const onPause = () => { if (video.paused) pause(entry); };
        const onVolume = () => { if (active === entry && video.muted !== muted) setMuted(video.muted); };
        entries.set(video, entry);
        video.autoplay = false;
        video.preload = 'none';
        video.muted = muted;
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('volumechange', onVolume);
        observer?.observe(video);
        publish(entry);
        return {
          play: () => play(entry),
          pause: () => pause(entry),
          toggle: () => active === entry && entry.requested ? pause(entry) : play(entry),
          toggleSound() {
            setMuted(!muted);
            // Unmuting an already requested video also gets the speaker's gesture.
            // A speaker press on an idle page never starts a video.
            if (!muted && active) return play(active);
          },
          state: () => state(entry),
          dispose() {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('volumechange', onVolume);
            observer?.unobserve(video);
            pause(entry);
            entries.delete(video);
            if (!entries.size) observer?.disconnect();
          },
        };
      },
    };
  }

  const pages = new WeakMap();
  function getController(document) {
    if (!pages.has(document)) pages.set(document, createController({ IntersectionObserver: document.defaultView?.IntersectionObserver }));
    return pages.get(document);
  }
  const factories = new WeakMap();
  function createPlayer(React, Fallback) {
    if (!factories.has(React)) factories.set(React, new Map());
    const cache = factories.get(React);
    if (cache.has(Fallback)) return cache.get(Fallback);
    const h = React.createElement;
    function CardVideo({ src, poster, width, height, title, className = '', dataSlot, fallbackHref, children }) {
      const videoRef = React.useRef(null);
      const handle = React.useRef(null);
      const [status, setStatus] = React.useState({ playing: false, muted: false });
      const [failed, setFailed] = React.useState(false);
      React.useEffect(() => { setFailed(false); }, [src]);
      React.useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const controls = getController(video.ownerDocument).register(video, src, setStatus);
        handle.current = controls;
        return () => { handle.current = null; controls.dispose(); };
      }, [src, failed]);
      if (failed) return h(Fallback, { href: fallbackHref || src, poster, title, className }, children);
      return h('div', { className: ('ss-tiktok-embed ss-hosted-video ' + className).trim(), 'data-slot': dataSlot },
        h('video', {
          ref: videoRef, 'data-hosted-tiktok': 'true', className: 'ss-tiktok-embed-frame',
          muted: status.muted, loop: true, playsInline: true, preload: 'none', poster,
          'aria-label': title,
          style: { aspectRatio: width && height ? width + ' / ' + height : '9 / 16', objectFit: width >= height ? 'contain' : 'cover' },
          onClick: () => { if (handle.current?.state().playing) handle.current.pause(); },
          onError: () => setFailed(true),
        }),
        h('button', {
          type: 'button', className: 'ss-hosted-play', 'aria-label': status.playing ? 'Pause video' : 'Play video',
          style: { minWidth: 64, minHeight: 44, cursor: 'pointer' },
          onClick: () => handle.current?.toggle(),
        }, status.playing ? 'Pause' : 'Play'),
        h('button', {
          type: 'button', className: 'ss-tiktok-sound-toggle',
          'aria-label': status.muted ? 'Turn sound on' : 'Turn sound off', 'aria-pressed': !status.muted,
          style: { width: 44, height: 44, minWidth: 44, minHeight: 44, padding: 10, display: 'grid', placeItems: 'center', color: status.muted ? '#ef4444' : '#fff' },
          onClick: () => handle.current?.toggleSound(),
        }, h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
          h('path', { d: 'M11 5 6 9H3v6h3l5 4V5Z' }),
          status.muted ? h('path', { d: 'm3 3 18 18', 'data-muted-slash': 'true' }) : h('path', { d: 'M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14' }),
        )), children,
      );
    }
    cache.set(Fallback, CardVideo);
    return CardVideo;
  }
  root.SparkleCardVideo = { createController, getController, createPlayer };
})(typeof window === 'undefined' ? globalThis : window);
