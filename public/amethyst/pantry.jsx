/* global React, ReactDOM */
const { useEffect, useMemo, useRef, useState } = React;

const CONTENT = window.AMETHYST_PANTRY_TEMPLATE_DATA || {};

const PRESETS = {
  amethyst: {
    bgTreatment: "confetti", cardSurface: "holographic", buttonEnergy: "calm",
    primaryColor: "#5C0EFF", accentColor: "#FF1AC2", bg: "#E8DFF5",
    elevated: "#F2EBFA", ink: "#20172b", muted: "#6e6379",
    headingFont: '"Italiana", "Playfair Display", serif',
    bodyFont: '"Inter", system-ui, sans-serif',
  },
  sparkle_suite_morganite: {
    bgTreatment: "suite-paper", cardSurface: "warm-paper", buttonEnergy: "suite-lift",
    primaryColor: "#ee2c9b", accentColor: "#ff4cae", bg: "#fcf8f6",
    elevated: "#fffefd", ink: "#402924", muted: "#7c6660",
    headingFont: '"Playfair Display", Georgia, serif',
    bodyFont: '"DM Sans", "Inter", system-ui, sans-serif',
  },
  black_diamond: {
    bgTreatment: "black-velvet", cardSurface: "dark-metallic", buttonEnergy: "diamond-lift",
    primaryColor: "#d4af37", accentColor: "#00d9ff", bg: "#080808",
    elevated: "#15110f", ink: "#f9f3ec", muted: "#d7c3b9",
    headingFont: '"Playfair Display", Georgia, serif',
    bodyFont: '"DM Sans", "Inter", system-ui, sans-serif',
  },
  moonstone: {
    bgTreatment: "moonstone-charcoal", cardSurface: "silver-pearl", buttonEnergy: "moonstone-lift",
    primaryColor: "#7c3aed", accentColor: "#cbd5e1", bg: "#15121d",
    elevated: "#211b2c", ink: "#f8fafc", muted: "#cbd5e1",
    headingFont: '"Playfair Display", Georgia, serif',
    bodyFont: '"DM Sans", "Inter", system-ui, sans-serif',
  },
  alpine_opal: {
    bgTreatment: "alpine-opal", cardSurface: "frosted-opal", buttonEnergy: "alpine-pop",
    primaryColor: "#ec4899", accentColor: "#38bdf8", bg: "#fdf2f8",
    elevated: "#f0f9ff", ink: "#1e1b4b", muted: "#5b5f89",
    headingFont: '"Playfair Display", Georgia, serif',
    bodyFont: '"DM Sans", "Inter", system-ui, sans-serif',
  },
  rose_gold: {
    bgTreatment: "rose-gold-paper", cardSurface: "pearl-rose", buttonEnergy: "rose-gold-lift",
    primaryColor: "#e04f73", accentColor: "#f5c66d", bg: "#fff5f6",
    elevated: "#fffafa", ink: "#2b1717", muted: "#7e5457",
    headingFont: '"Playfair Display", Georgia, serif',
    bodyFont: '"DM Sans", "Inter", system-ui, sans-serif',
  },
  garnet: {
    bgTreatment: "garnet-shell", cardSurface: "blush-shell", buttonEnergy: "garnet-lift",
    primaryColor: "#B91C1C", accentColor: "#920000", bg: "#FFE5DD",
    elevated: "#fff8f5", ink: "#2b1717", muted: "#7e5457",
    headingFont: '"Boska", "Playfair Display", Georgia, serif',
    bodyFont: '"Switzer", "DM Sans", "Inter", system-ui, sans-serif',
  },
  amber: {
    bgTreatment: "amber-paper", cardSurface: "sunlit-pearl", buttonEnergy: "amber-pop",
    primaryColor: "#F97316", accentColor: "#761A00", bg: "#FAFAFA",
    elevated: "#fffaf5", ink: "#2f1808", muted: "#76543d",
    headingFont: '"Melodrama", "Playfair Display", Georgia, serif',
    bodyFont: '"Nunito", "DM Sans", system-ui, sans-serif',
  },
  velvet: {
    bgTreatment: "velvet-orchid", cardSurface: "plush-orchid", buttonEnergy: "velvet-lift",
    primaryColor: "#9333EA", accentColor: "#6300B9", bg: "#FFE8FF",
    elevated: "#fff7ff", ink: "#2d143d", muted: "#73517e",
    headingFont: '"Bitter", Georgia, serif',
    bodyFont: '"Archivo", "DM Sans", system-ui, sans-serif',
  },
  rose_quartz: {
    bgTreatment: "quartz-paper", cardSurface: "pink-quartz", buttonEnergy: "quartz-pop",
    primaryColor: "#E879F9", accentColor: "#63146E", bg: "#FAFAFA",
    elevated: "#fff7ff", ink: "#32143a", muted: "#77537e",
    headingFont: '"Sharpie", "Quicksand", system-ui, sans-serif',
    bodyFont: '"Ranade", "Nunito", system-ui, sans-serif',
  },
};

function getPreset() {
  return PRESETS[CONTENT.appearancePreset] || PRESETS.sparkle_suite_morganite;
}

function isExternalHref(href) {
  return /^https?:\/\//.test(href || "");
}

function linkProps(href) {
  return isExternalHref(href)
    ? { href, target: "_blank", rel: "noreferrer noopener" }
    : { href: href || "#" };
}

function normalizeText(value, fallback = "") {
  return String(value || fallback).trim();
}

function getRecipeImage(recipe) {
  return recipe.modalImage || recipe.image || CONTENT.heroImageUrl;
}

function getVideoId(tiktokUrl) {
  const match = String(tiktokUrl || "").match(/(?:\/video\/|\/player\/v1\/)(\d+)/);
  return match ? match[1] : "";
}

function TikTokRecipePlayer({ title, videoId }) {
  const frameRef = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !videoId) return undefined;

    const send = (type) => {
      frame.contentWindow?.postMessage(
        { type, "x-tiktok-player": true },
        "https://www.tiktok.com",
      );
    };
    const playMuted = () => {
      send("mute");
      setMuted(true);
      send("play");
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) playMuted();
        else send("pause");
      },
      { threshold: 0.5 },
    );

    observer.observe(frame);
    frame.addEventListener("load", playMuted);
    return () => {
      frame.removeEventListener("load", playMuted);
      observer.disconnect();
    };
  }, [videoId]);

  const toggleMute = () => {
    const nextMuted = !muted;
    frameRef.current?.contentWindow?.postMessage(
      { type: nextMuted ? "mute" : "unMute", "x-tiktok-player": true },
      "https://www.tiktok.com",
    );
    setMuted(nextMuted);
  };

  return (
    <div className="bk-video-frame" data-tiktok-embed="true">
      <iframe
        ref={frameRef}
        allow="autoplay; fullscreen"
        allowFullScreen
        loading="lazy"
        src={`https://www.tiktok.com/player/v1/${videoId}?autoplay=1&muted=1&loop=1&controls=0&description=0&music_info=0&rel=0`}
        title={`${title} TikTok`}
      />
      <button
        aria-label={muted ? "Unmute TikTok video" : "Mute TikTok video"}
        className="bk-tiktok-sound-toggle"
        onClick={toggleMute}
        type="button"
      >
        {muted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
}

function RecipeModal({ recipe, onClose }) {
  if (!recipe) return null;
  const videoId = getVideoId(recipe.tiktokUrl);
  const note = normalizeText(recipe.note);

  return (
    <div className="bk-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="bk-modal" role="dialog" aria-modal="true" aria-labelledby="bk-modal-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="bk-modal-close" aria-label="Close recipe" onClick={onClose}>x</button>
        <div className="bk-modal-hero">
          <img src={getRecipeImage(recipe)} alt="" style={{ objectPosition: recipe.modalImagePosition || recipe.imagePosition || "center" }} />
        </div>
        <div className="bk-modal-body">
          <p className="bk-recipe-category">{recipe.category}</p>
          <h2 id="bk-modal-title">{recipe.title}</h2>
          <p className="bk-modal-description">{recipe.description}</p>
          <div className="bk-modal-meta">
            <span>{recipe.prepTime}</span>
            <span>{recipe.servings} servings</span>
          </div>
          <div className="bk-recipe-detail-grid">
            <section className="bk-recipe-video">
              <h3>Watch Heather make it</h3>
              {videoId ? (
                <TikTokRecipePlayer title={recipe.title} videoId={videoId} />
              ) : (
                <p>This recipe is ready to make from the instructions below.</p>
              )}
            </section>
            <section className="bk-recipe-method">
              <h3>What You'll Need</h3>
              <ul>
                {(recipe.ingredients || []).map((item, index) => <li key={index}>{item}</li>)}
              </ul>
              <div className="bk-recipe-method-divider">Then</div>
              <h3>How to Make It</h3>
              <ol>
                {(recipe.steps || []).map((item, index) => <li key={index}>{item}</li>)}
              </ol>
            </section>
            <aside className="bk-note">
              <h3>Heather's Note</h3>
              <p>{note || 'Heather is sharing this recipe straight from her kitchen.'}</p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onOpen }) {
  return (
    <article className="bk-recipe-card">
      <button type="button" className="bk-recipe-media" onClick={() => onOpen(recipe)} aria-label={`Open ${recipe.title}`}>
        <img src={recipe.image || CONTENT.heroImageUrl} alt="" style={{ objectPosition: recipe.imagePosition || "center" }} />
      </button>
      <div className="bk-recipe-body">
        <p className="bk-recipe-category">{recipe.category}</p>
        <h3>{recipe.title}</h3>
        <p>{recipe.description}</p>
        <div className="bk-recipe-meta">
          <span>{recipe.prepTime}</span>
          <span>{recipe.servings} servings</span>
        </div>
        <button type="button" className="bk-recipe-action" onClick={() => onOpen(recipe)}>
          View Recipe
        </button>
      </div>
    </article>
  );
}

function RecipeGroup({ group, recipes, onOpen }) {
  if (!recipes.length) return null;

  return (
    <section className="bk-recipe-group">
      <div className="bk-section-heading">
        <p>{group.subtitle}</p>
        <h2>{group.title}</h2>
      </div>
      <div className="bk-recipe-grid">
        {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onOpen={onOpen} />)}
      </div>
    </section>
  );
}

function PantryPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeRecipe, setActiveRecipe] = useState(null);
  const preset = getPreset();
  const recipes = Array.isArray(CONTENT.recipes) ? CONTENT.recipes : [];
  const links = CONTENT.links || {};
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bk-ink", preset.ink);
    root.style.setProperty("--bk-muted", preset.muted);
    root.style.setProperty("--bk-plum", preset.primaryColor);
    root.style.setProperty("--bk-violet", preset.accentColor);
    root.style.setProperty("--bk-cream", preset.bg);
    root.style.setProperty("--bk-paper", preset.elevated);
    root.style.setProperty("--bk-heading-font", preset.headingFont);
    root.style.setProperty("--bk-body-font", preset.bodyFont);
    const body = document.body;
    body.className = "bk-pantry-page";
    body.classList.add(`bg-${preset.bgTreatment}`);
    body.classList.add(`surface-${preset.cardSurface}`);
    body.classList.add(`btn-${preset.buttonEnergy}`);
  }, [preset]);
  const categories = useMemo(() => {
    const source = Array.isArray(CONTENT.categoryOrder) ? CONTENT.categoryOrder : [];
    const fromRecipes = Array.from(new Set(recipes.map((recipe) => recipe.category).filter(Boolean)));
    return ["All", ...source.filter((category) => fromRecipes.includes(category)), ...fromRecipes.filter((category) => !source.includes(category))];
  }, [recipes]);
  const filteredRecipes = selectedCategory === "All"
    ? recipes
    : recipes.filter((recipe) => recipe.category === selectedCategory);
  const groups = Array.isArray(CONTENT.featuredCategoryGroups) ? CONTENT.featuredCategoryGroups : [];
  const groupedCategories = useMemo(
    () => new Set(groups.flatMap((group) => Array.isArray(group.categories) ? group.categories : [])),
    [groups],
  );
  const ungroupedRecipes = useMemo(
    () => recipes.filter((recipe) => !groupedCategories.has(recipe.category)),
    [recipes, groupedCategories],
  );

  return (
    <div className="bk-pantry-shell">
      <header className="bk-header">
        <a className="bk-brand" {...linkProps(links.home)}>{CONTENT.businessName || "BlingKitchen"}</a>
        <nav className="bk-nav" aria-label="BlingKitchen navigation">
          <a {...linkProps(links.home)}>Home</a>
          <a aria-current="page" {...linkProps(links.pantry)}>In the Pantry</a>
          <a {...linkProps(links.trade)}>Dance Floor</a>
          <a {...linkProps(links.join)}>Join Team</a>
        </nav>
        <a className="bk-shop" {...linkProps(links.shop)}>Shop</a>
      </header>

      <section className="bk-hero">
        <img src={CONTENT.heroImageUrl} alt="" />
        <div className="bk-hero-copy">
          <p>{CONTENT.eyebrow || "Recipes with Heather"}</p>
          <h1>{CONTENT.title || "In the Pantry"}</h1>
          <span>{CONTENT.subtitle}</span>
          <div className="bk-hero-actions">
            <a {...linkProps(links.tiktok)}>Watch TikTok</a>
            <a {...linkProps(links.facebookVip)}>VIP Group</a>
          </div>
        </div>
      </section>

      <main className="bk-main">
        <section className="bk-intro">
          <div>
            <p className="bk-kicker">{CONTENT.tagline}</p>
            <h2>Heather's recipe box, preserved from the source site.</h2>
          </div>
          <p>{CONTENT.introText}</p>
        </section>

        <div className="bk-filter-bar" role="tablist" aria-label="Recipe categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={category === selectedCategory ? "is-active" : ""}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {selectedCategory === "All" ? (
          <>
          {groups.map((group) => (
            <RecipeGroup
              key={group.title}
              group={group}
              recipes={recipes.filter((recipe) => (group.categories || []).includes(recipe.category))}
              onOpen={setActiveRecipe}
            />
          ))}
          {ungroupedRecipes.length ? (
            <RecipeGroup
              key="ungrouped-recipes"
              group={{
                title: "More from Heather's Pantry",
                subtitle: "Fresh recipes and kitchen favorites from Heather.",
              }}
              recipes={ungroupedRecipes}
              onOpen={setActiveRecipe}
            />
          ) : null}
          </>
        ) : (
          <section className="bk-recipe-group">
            <div className="bk-section-heading">
              <p>{filteredRecipes.length} recipes</p>
              <h2>{selectedCategory}</h2>
            </div>
            <div className="bk-recipe-grid">
              {filteredRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onOpen={setActiveRecipe} />)}
            </div>
          </section>
        )}
      </main>

      <footer className="bk-footer">
        <p>{CONTENT.businessName || "BlingKitchen"} is operated by an independent Bomb Party Representative.</p>
        <div>
          <a {...linkProps(links.home)}>Home</a>
          <a {...linkProps(links.trade)}>Dance Floor</a>
          <a {...linkProps(links.join)}>Join Team</a>
          <a {...linkProps(links.faq || "/faq")}>FAQ</a>
          <a {...linkProps(links.contact)}>Contact</a>
        </div>
      </footer>

      <RecipeModal recipe={activeRecipe} onClose={() => setActiveRecipe(null)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PantryPage />);
