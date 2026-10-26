(function loadAmethystTemplate() {
  var currentScript = document.currentScript;
  if (!currentScript) return;

  var endpoint = currentScript.getAttribute('data-template-src');
  if (!endpoint) return;

  var url;
  try {
    url = new URL(endpoint, window.location.origin);
  } catch (_error) {
    return;
  }

  var pageParams = new URLSearchParams(window.location.search || '');
  pageParams.forEach(function mergePageParam(value, key) {
    if (!url.searchParams.has(key)) url.searchParams.append(key, value);
  });

  // Presentation is a document capability, never a inherited page-query preference.
  url.searchParams.delete('lineupPresentation');
  var presentation = currentScript.getAttribute('data-lineup-presentation');
  if (presentation === 'grouped-v1') url.searchParams.set('lineupPresentation', presentation);

  var src = url.pathname + url.search + url.hash;
  var escapedSrc = src.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  document.write('<script src="' + escapedSrc + '"></scr' + 'ipt>');
})();
