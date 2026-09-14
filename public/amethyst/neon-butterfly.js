(function neonButterflySkinRuntime() {
  'use strict';

  var SKIN_CLASS = 'bg-neon-butterfly';
  var HERO_SELECTOR = [
    '.hp-hero',
    '.tp-hero',
    '.jp-hero',
    '.mhf-hero',
    '.bwb-hero',
    '.bk-home-hero',
  ].join(',');
  var BUTTERFLY_PATH = 'M60 43C51 20 29 7 17 14C5 22 12 42 36 48C20 55 19 72 30 78C41 84 53 66 60 53C67 66 79 84 90 78C101 72 100 55 84 48C108 42 115 22 103 14C91 7 69 20 60 43Z';
  var INNER_PATH = 'M60 43C53 39 47 38 41 39M60 43C67 39 73 38 79 39M60 44V57';
  var butterflies = [
    { tone: 'pink', size: 'large', place: 'upper-right' },
    { tone: 'gold', size: 'medium', place: 'left' },
    { tone: 'violet', size: 'medium', place: 'lower-right' },
    { tone: 'pink', size: 'small', place: 'flyer' },
  ];
  var sparkles = [
    [12, 21, -2], [19, 70, -7], [28, 14, -11], [38, 79, -5],
    [49, 24, -13], [58, 68, -3], [67, 17, -9], [74, 77, -15],
    [82, 34, -6], [89, 61, -12], [94, 19, -4], [7, 48, -10],
  ];

  function butterflyMarkup(item, index) {
    return '<span class="nb-butterfly nb-butterfly--' + item.tone +
      ' nb-butterfly--' + item.size + ' nb-butterfly--' + item.place +
      '" data-nb-butterfly="' + (index + 1) + '">' +
      '<svg viewBox="0 0 120 90" focusable="false" aria-hidden="true">' +
      '<path class="nb-butterfly-outline" d="' + BUTTERFLY_PATH + '" />' +
      '<path class="nb-butterfly-detail" d="' + INNER_PATH + '" />' +
      '</svg></span>';
  }

  function sparkleMarkup(item, index) {
    return '<span class="nb-sparkle" data-nb-sparkle="' + (index + 1) +
      '" style="--nb-x:' + item[0] + '%;--nb-y:' + item[1] +
      '%;--nb-delay:' + item[2] + 's"></span>';
  }

  function removeScenes() {
    document.querySelectorAll('.nb-decoration').forEach(function (node) {
      node.remove();
    });
  }

  function addScene(hero) {
    if (hero.querySelector(':scope > .nb-decoration')) return;

    var decoration = document.createElement('div');
    decoration.className = 'nb-decoration';
    decoration.dataset.choreography = String(1 + Math.floor(Math.random() * 3));
    decoration.innerHTML =
      '<div class="nb-scene" aria-hidden="true">' +
      '<span class="nb-ambient"></span>' +
      '<span class="nb-lamp-shimmer"></span>' +
      butterflies.map(butterflyMarkup).join('') +
      sparkles.map(sparkleMarkup).join('') +
      '</div>' +
      '<button type="button" class="nb-motion-control" aria-pressed="false">Pause animation</button>';

    var control = decoration.querySelector('.nb-motion-control');
    control.addEventListener('click', function () {
      var paused = decoration.dataset.paused === 'true';
      decoration.dataset.paused = paused ? 'false' : 'true';
      control.setAttribute('aria-pressed', paused ? 'false' : 'true');
      control.textContent = paused ? 'Pause animation' : 'Resume animation';
    });

    hero.appendChild(decoration);
  }

  function syncSkin() {
    var enabled = document.body && document.body.classList.contains(SKIN_CLASS);
    if (!enabled) {
      removeScenes();
      return;
    }

    document.querySelectorAll(HERO_SELECTOR).forEach(addScene);
  }

  function syncVisibility() {
    document.documentElement.classList.toggle('nb-page-hidden', document.hidden);
  }

  var observer = new MutationObserver(syncSkin);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
    subtree: true,
  });
  document.addEventListener('visibilitychange', syncVisibility);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncSkin, { once: true });
  } else {
    syncSkin();
  }
  syncVisibility();
})();
