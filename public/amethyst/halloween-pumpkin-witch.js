(function halloweenPumpkinWitchRuntime() {
  const SKIN_CLASS = "bg-halloween-pumpkin-witch";
  const HERO_SELECTOR = ".hp-hero,.tp-hero,.jp-hero,.mhf-hero,.bwb-hero,.bk-home-hero";
  const ASSET_ROOT = "/amethyst/skins/halloween-pumpkin-witch/";
  const SPARKLES = [
    [8, 18, 0.1, 7], [15, 66, 1.7, 5], [22, 34, 3.2, 9],
    [31, 78, 2.4, 6], [39, 14, 0.8, 5], [47, 54, 4.1, 8],
    [55, 23, 2.1, 6], [62, 72, 1.2, 10], [69, 39, 3.7, 5],
    [76, 15, 2.8, 8], [83, 62, 0.5, 7], [91, 31, 4.5, 6],
    [12, 45, 4.8, 4], [27, 10, 3.4, 6], [44, 84, 1.4, 5],
    [58, 45, 0.3, 7], [73, 87, 3.9, 5], [88, 74, 2.6, 9],
  ];

  function makeSparkles() {
    return SPARKLES.map(function (sparkle, index) {
      const node = document.createElement("span");
      node.className = "hpw-sparkle hpw-sparkle--" + (index % 3);
      node.style.setProperty("--hpw-x", sparkle[0] + "%");
      node.style.setProperty("--hpw-y", sparkle[1] + "%");
      node.style.setProperty("--hpw-delay", sparkle[2] + "s");
      node.style.setProperty("--hpw-size", sparkle[3] + "px");
      return node;
    });
  }

  function mount(hero) {
    if (!hero || hero.querySelector(":scope > .hpw-decoration")) return;

    const decoration = document.createElement("div");
    decoration.className = "hpw-decoration";
    decoration.setAttribute("data-paused", "false");

    const scene = document.createElement("div");
    scene.className = "hpw-scene";
    scene.setAttribute("aria-hidden", "true");

    const witchFlight = document.createElement("span");
    witchFlight.className = "hpw-witch-flight";
    const witch = document.createElement("img");
    witch.className = "hpw-witch";
    witch.src = ASSET_ROOT + "witch.webp";
    witch.alt = "";
    witch.decoding = "async";
    witchFlight.appendChild(witch);
    scene.appendChild(witchFlight);

    ["one", "two", "three"].forEach(function (name, index) {
      const bat = document.createElement("span");
      bat.className = "hpw-bat hpw-bat--" + name;
      bat.style.setProperty("--hpw-bat-index", String(index));
      scene.appendChild(bat);
    });
    makeSparkles().forEach(function (sparkle) { scene.appendChild(sparkle); });
    decoration.appendChild(scene);

    const control = document.createElement("button");
    control.className = "hpw-motion-control";
    control.type = "button";
    control.textContent = "Pause animation";
    control.setAttribute("aria-pressed", "false");
    control.addEventListener("click", function () {
      const paused = decoration.getAttribute("data-paused") === "true";
      decoration.setAttribute("data-paused", paused ? "false" : "true");
      control.setAttribute("aria-pressed", paused ? "false" : "true");
      control.textContent = paused ? "Pause animation" : "Resume animation";
    });
    decoration.appendChild(control);
    hero.appendChild(decoration);
  }

  function unmount() {
    document.querySelectorAll(".hpw-decoration").forEach(function (node) { node.remove(); });
  }

  function sync() {
    if (!document.body || !document.body.classList.contains(SKIN_CLASS)) {
      unmount();
      return;
    }
    document.querySelectorAll(HERO_SELECTOR).forEach(mount);
  }

  function start() {
    sync();
    new MutationObserver(sync).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
    document.addEventListener("visibilitychange", function () {
      document.documentElement.classList.toggle("hpw-page-hidden", document.hidden);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
