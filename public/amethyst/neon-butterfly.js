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
  var ASSET_ROOT = '/amethyst/skins/neon-butterfly/';
  var butterflies = [
    { tone: 'pink', size: 'large', place: 'upper-right', asset: 'neon-sign-pink.png' },
    { tone: 'gold', size: 'medium', place: 'left', asset: 'neon-sign-gold.png' },
    { tone: 'violet', size: 'medium', place: 'lower-right', asset: 'neon-sign-violet.png' },
    { tone: 'pink', size: 'small', place: 'flyer', asset: 'neon-sign-pink.png' },
  ];
  var sparkles = [
    [12, 21, -2], [19, 70, -7], [28, 14, -11], [38, 79, -5],
    [49, 24, -13], [58, 68, -3], [67, 17, -9], [74, 77, -15],
    [82, 34, -6], [89, 61, -12], [94, 19, -4], [7, 48, -10],
  ];

  function butterflyMarkup(item, index) {
    var src = ASSET_ROOT + item.asset;
    return '<span class="nb-butterfly nb-butterfly--' + item.tone +
      ' nb-butterfly--' + item.size + ' nb-butterfly--' + item.place +
      '" data-nb-butterfly="' + (index + 1) + '">' +
      '<span class="nb-wing nb-wing--left"><img class="nb-butterfly-art" src="' + src + '" alt="" draggable="false" /></span>' +
      '<span class="nb-wing nb-wing--right"><img class="nb-butterfly-art" src="' + src + '" alt="" draggable="false" /></span>' +
      '</span>';
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
