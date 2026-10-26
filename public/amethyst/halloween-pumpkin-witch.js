(function halloweenPumpkinWitchRuntime() {
  const SKIN_CLASS = "bg-halloween-pumpkin-witch";
  const HERO_SELECTOR = ".hp-hero,.tp-hero,.jp-hero,.mhf-hero,.bwb-hero,.bk-home-hero";
  const ASSET_ROOT = "/amethyst/skins/halloween-pumpkin-witch/";
  const SPARKLES = [
    [12, 18, -0.8, 8], [30, 12, -3.1, 7],
    [84, 50, -1.9, 8], [95, 72, -4.7, 7],
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
    const witchSrc = ASSET_ROOT + "witch.webp";
    const witchImage = typeof window.sparkleResponsiveImage === "function"
      ? window.sparkleResponsiveImage(witchSrc, {
          alt: "",
          sizes: "(max-width: 700px) 190px, 25vw",
          widths: [256, 384, 640],
        })
      : { src: witchSrc, alt: "", decoding: "async", loading: "lazy" };
    witch.src = witchImage.src;
    if (witchImage.srcSet) witch.srcset = witchImage.srcSet;
    if (witchImage.sizes) witch.sizes = witchImage.sizes;
    witch.alt = witchImage.alt || "";
    witch.decoding = "async";
    witch.loading = "lazy";
    witchFlight.appendChild(witch);
    scene.appendChild(witchFlight);

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
    // The server hero belongs to React until its first hydration effect runs.
    // Decorating it earlier makes React discard the server-rendered subtree.
    if (globalThis.SPARKLE_FIRST_PAINT) return;
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
