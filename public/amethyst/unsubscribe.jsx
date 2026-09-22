/* global React, ReactDOM */
const { useState } = React;

const CONTENT = window.AMETHYST_HOMEPAGE_TEMPLATE_DATA || {};
const RUNTIME_CONTEXT = window.AMETHYST_RUNTIME_CONTEXT || {};
const FOOTER_LINKS = CONTENT.footerLinks || {};
const SOCIAL_LINKS = CONTENT.socialLinks || [];
const BUSINESS_NAME = CONTENT.businessName || "Sparkle by Sasha";
const SHOP_HREF = CONTENT.streamLinks?.shop || "https://bombparty.com";
const HOME_HREF = FOOTER_LINKS.home || "/amethyst/Homepage.html";
const TRADE_BOARD_HREF = FOOTER_LINKS.tradeBoard || "/amethyst/Trade.html";

function applyUnsubscribeAppearance() {
  const preset = window.HOMEPAGE_TWEAK_DEFAULTS?.preset;

  if (preset === "halloween_pumpkin_witch") {
    document.body.classList.add("bg-halloween-pumpkin-witch", "surface-midnight-glass", "shape-soft", "hpw-utility");
    const halloweenTokens = {
      "--hp-primary": "#ff6a00",
      "--hp-accent": "#f4eee3",
      "--primary": "#ff6a00",
      "--accent": "#f4eee3",
      "--hp-bg": "#090909",
      "--hp-bg-elevated": "#211914",
      "--bg-deep": "#050505",
      "--hp-display-font": '"Playfair Display", Georgia, serif',
      "--hp-body-font": '"DM Sans", "Inter", system-ui, sans-serif',
      "--hp-heading-weight": "600",
    };
    Object.entries(halloweenTokens).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    return;
  }

  if (preset === "neon_butterfly") {
    document.body.classList.add("bg-neon-butterfly", "surface-neon-velvet-glass", "shape-soft", "nb-utility");
    const neonTokens = {
      "--hp-primary": "#ff2acd",
      "--hp-accent": "#ffc24a",
      "--primary": "#ff2acd",
      "--accent": "#ffc24a",
      "--hp-bg": "#120414",
      "--hp-bg-elevated": "#261029",
      "--bg-deep": "#09010c",
      "--hp-display-font": '"Playfair Display", Georgia, serif',
      "--hp-body-font": '"DM Sans", "Inter", system-ui, sans-serif',
      "--hp-heading-weight": "600",
    };
    Object.entries(neonTokens).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    return;
  }

  if (preset !== "gnome_garden") return;

  document.body.classList.add("bg-gnome-garden", "surface-storybook-parchment", "shape-soft", "gg-utility");
  const tokens = {
    "--hp-primary": "#842421",
    "--hp-accent": "#F4C45E",
    "--primary": "#842421",
    "--accent": "#F4C45E",
    "--hp-bg": "#173126",
    "--hp-bg-elevated": "#FFF3D6",
    "--bg-deep": "#102319",
    "--hp-display-font": '"Playfair Display", Georgia, serif',
    "--hp-body-font": '"DM Sans", "Inter", system-ui, sans-serif',
    "--hp-heading-weight": "600",
  };
  Object.entries(tokens).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
}

applyUnsubscribeAppearance();

function ComingSoonNavItem({ label = "Join Team" }) {
  return (
    <span
      className="hp-header-link hp-header-link-disabled"
      aria-disabled="true"
      aria-label={`${label} coming soon`}
      title={`${label} is coming soon`}
    >
      <span>{label}</span>
      <span className="hp-coming-soon-badge" aria-hidden="true">Soon</span>
    </span>
  );
}

function ComingSoonFooterItem({ label = "Join Team" }) {
  return (
    <span className="hp-footer-coming-soon" aria-label={`${label} coming soon`}>
      {label}
      <span aria-hidden="true">Soon</span>
    </span>
  );
}

function isExternalHref(href) {
  return /^https?:\/\//.test(href || "");
}

function linkProps(href) {
  return isExternalHref(href)
    ? { href, target: "_blank", rel: "noreferrer noopener" }
    : { href: href || "#" };
}

function SocialLogo({ label, shortLabel }) {
  const key = `${label || ""} ${shortLabel || ""}`.toLowerCase();

  if (key.includes("tiktok") || key.includes("tt")) {
    return (
      <svg className="hp-footer-social-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.6 3c.4 2.4 1.9 4 4.2 4.3v3.4c-1.6 0-3-.4-4.2-1.3v6.2c0 3.4-2.5 5.7-5.8 5.7-3.1 0-5.5-2.1-5.5-5.1 0-3.2 2.5-5.3 5.8-5.3.4 0 .8 0 1.1.1v3.4c-.4-.1-.8-.2-1.2-.2-1.4 0-2.4.8-2.4 2s.9 2 2.2 2c1.4 0 2.3-.9 2.3-2.8V3h3.5Z" />
      </svg>
    );
  }

  if (key.includes("facebook") || key.includes("fb")) {
    return (
      <svg className="hp-footer-social-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.2 8.1V6.6c0-.7.5-.9.9-.9h2.3V2.2L14.2 2c-3.2 0-4.8 1.9-4.8 5.1v1H7v3.8h2.4V22h4.2V11.9h3.1l.5-3.8h-3Z" />
      </svg>
    );
  }

  if (key.includes("instagram") || key.includes("ig")) {
    return (
      <svg className="hp-footer-social-logo hp-footer-social-logo-stroke" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="17" cy="7" r="1" />
      </svg>
    );
  }

  if (key.includes("youtube") || key.includes("yt")) {
    return (
      <svg className="hp-footer-social-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.4V8.6l5.9 3.4-5.9 3.4Z" />
      </svg>
    );
  }

  return <span className="hp-footer-social-fallback">{shortLabel || (label || "").slice(0, 2).toUpperCase()}</span>;
}

function runtimeText(value) {
  return String(value || "").trim();
}

function buildContextSearch() {
  const params = new URLSearchParams(window.location.search || "");
  const repId = runtimeText(RUNTIME_CONTEXT.repId);
  const publicSiteSlug = runtimeText(RUNTIME_CONTEXT.publicSiteSlug).toLowerCase();

  if (repId && !params.has("c") && !params.has("repId")) params.set("c", repId);
  if (publicSiteSlug && !params.has("publicSiteSlug")) {
    params.set("publicSiteSlug", publicSiteSlug);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function withCurrentSearch(path) {
  return `${path}${buildContextSearch()}`;
}

function getUnsubscribeHref() {
  return FOOTER_LINKS.unsubscribe || withCurrentSearch("/amethyst/Unsubscribe.html");
}

function Header() {
  return (
    <header className="hp-header">
      <div className="hp-header-inner">
        <nav className="hp-header-nav" aria-label="Primary">
          <a {...linkProps(HOME_HREF)} className="hp-header-link">Home</a>
          <a {...linkProps(TRADE_BOARD_HREF)} className="hp-header-link">Dance Floor</a>
          <ComingSoonNavItem />
        </nav>
        <div className="hp-brand">
          <div className="hp-brand-name">{BUSINESS_NAME}</div>
          <div className="hp-brand-sub">Live jewelry reveals</div>
        </div>
        <a {...linkProps(SHOP_HREF)} className="hp-shop-btn">Shop ↗</a>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="hp-footer">
      <div className="hp-footer-inner">
        <div>
          <div className="hp-footer-brand">{BUSINESS_NAME}</div>
          <p className="hp-footer-tag">Update your customer messaging preferences without needing live rep support.</p>
          <div className="hp-footer-socials">
            {SOCIAL_LINKS.slice(0, 4).map((link) => (
              <a
                key={link.shortLabel}
                {...linkProps(link.href)}
                className="hp-footer-social"
                aria-label={link.label}
                title={link.label}
              >
                <SocialLogo {...link} />
              </a>
            ))}
          </div>
        </div>
        <div className="hp-footer-col">
          <h4>Navigate</h4>
          <ul>
            <li><a {...linkProps(HOME_HREF)}>Home</a></li>
            <li><a {...linkProps(TRADE_BOARD_HREF)}>Dance Floor</a></li>
            <li><ComingSoonFooterItem /></li>
          </ul>
        </div>
        <div className="hp-footer-col">
          <h4>Preferences</h4>
          <ul>
            <li><a {...linkProps(getUnsubscribeHref())}>Unsubscribe</a></li>
            <li><a href="#unsubscribe-form">Customer updates</a></li>
          </ul>
        </div>
      </div>
      <div className="hp-footer-bottom">
        <div className="legal-row">
          <span>© 2026 {BUSINESS_NAME} · Powered by Sparkle Suite</span>
          <span><a {...linkProps(getUnsubscribeHref())}>Unsubscribe</a> · <a {...linkProps(HOME_HREF)}>Home</a></span>
        </div>
      </div>
    </footer>
  );
}

function UnsubscribePage() {
  const [form, setForm] = useState({
    phone: "",
    email: "",
    unsubscribeSms: false,
    unsubscribeEmail: false,
  });
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitState({ status: "submitting", message: "" });

    try {
      const response = await fetch(withCurrentSearch("/api/amethyst/customer-audience/unsubscribe"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitState({
          status: "error",
          message: payload.error || "We couldn't process your unsubscribe right now.",
        });
        return;
      }

      setForm({
        phone: "",
        email: "",
        unsubscribeSms: false,
        unsubscribeEmail: false,
      });
      setSubmitState({
        status: "success",
        message: "You're all set. We'll honor the preferences you selected.",
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message: "We couldn't process your unsubscribe right now.",
      });
    }
  }

  return (
    <>
      <Header />
      <section className="hp-signup" id="unsubscribe-form">
        <div className="hp-container">
          <div className="hp-signup-card">
            <div className="hp-signup-card-body">
              <div className="hp-signup-eyebrow">Customer preferences</div>
              <h1 className="hp-signup-title">Unsubscribe from updates</h1>
              <p className="hp-signup-sub">
                Stop SMS updates, email updates, or both for the Amethyst preview site.
              </p>
            </div>
            <form action={withCurrentSearch("/api/amethyst/customer-audience/unsubscribe")} className="hp-signup-form" onSubmit={handleSubmit}>
              <div className="hp-signup-row">
                <div className="hp-signup-field">
                  <label className="hp-signup-label" htmlFor="unsubscribe-phone">Phone number</label>
                  <input id="unsubscribe-phone" className="hp-signup-input" type="tel" placeholder="(555) 555-5555" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                </div>
                <div className="hp-signup-field">
                  <label className="hp-signup-label" htmlFor="unsubscribe-email">Email address</label>
                  <input id="unsubscribe-email" className="hp-signup-input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                </div>
              </div>
              <div className="hp-signup-consent-box">
                <label className="hp-signup-check hp-unsubscribe-toggle">
                  <input type="checkbox" checked={form.unsubscribeSms} onChange={(e) => updateField("unsubscribeSms", e.target.checked)} />
                  <span className="hp-toggle-control" aria-hidden="true" />
                  <span>Stop SMS updates</span>
                </label>
                <label className="hp-signup-check hp-unsubscribe-toggle">
                  <input type="checkbox" checked={form.unsubscribeEmail} onChange={(e) => updateField("unsubscribeEmail", e.target.checked)} />
                  <span className="hp-toggle-control" aria-hidden="true" />
                  <span>Stop email updates</span>
                </label>
              </div>
              <div className="hp-signup-actions">
                <button type="submit" className="hp-signup-submit">
                  {submitState.status === "submitting" ? "Saving..." : "Update preferences"}
                </button>
                <p className="hp-signup-consent">
                  Choose one or both channels. If you reply STOP during a text conversation, Sparkle Suite will also record that SMS opt-out.
                </p>
                {submitState.message ? (
                  <p className={`hp-signup-status ${submitState.status === "success" ? "success" : "error"}`}>
                    {submitState.message}
                  </p>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<UnsubscribePage />);
