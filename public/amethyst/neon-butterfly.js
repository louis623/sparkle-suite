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
  var LEFT_WING_PATH = 'M60 44C53 37 50 29 44 20C39 10 31 5 24 8C16 11 15 20 19 28C22 34 27 39 33 43C27 43 22 46 20 51C16 59 20 68 27 71C35 74 42 67 47 61C52 55 56 49 60 47';
  var RIGHT_WING_PATH = 'M60 44C67 37 70 29 76 20C81 10 89 5 96 8C104 11 105 20 101 28C98 34 93 39 87 43C93 43 98 46 100 51C104 59 100 68 93 71C85 74 78 67 73 61C68 55 64 49 60 47';
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
      '<g class="nb-wing nb-wing--left"><path class="nb-butterfly-outline" d="' + LEFT_WING_PATH + '" /></g>' +
      '<g class="nb-wing nb-wing--right"><path class="nb-butterfly-outline" d="' + RIGHT_WING_PATH + '" /></g>' +
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
