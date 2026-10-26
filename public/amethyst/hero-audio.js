(function () {
  // Browser policy can reject audible autoplay. Keep motion running muted and
  // retry sound on the first real page gesture, unless a control changed intent.
  window.sparkleHeroAudioFallback = function (video, controls, allowed, enabled) {
    let disposed = false;
    function dispose() {
      disposed = true;
      document.removeEventListener('pointerup', gesture);
      document.removeEventListener('keydown', gesture);
    }
    function gesture(event) {
      if (disposed || controls.contains(event.target)) return;
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
      if (!allowed() || video.paused || video.ended) return;
      dispose();
      video.muted = false;
      video.play().then(enabled, () => { video.muted = true; });
    }
    document.addEventListener('pointerup', gesture);
    document.addEventListener('keydown', gesture);
    return dispose;
  };
})();
