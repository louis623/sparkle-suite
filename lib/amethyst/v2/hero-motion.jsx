/* Shared SSR scenes; existing page and theme CSS owns the composition. */
const React = window.React;
const { useEffect, useMemo } = React;
export function GnomeGardenScene() {
  return (
    <div className="gg-scene" aria-hidden="true" style={{ pointerEvents: "none" }}>
      <span className="gg-lantern gg-lantern-left">
        <img src="/amethyst/skins/gnome-garden/lantern.webp" alt="" width="157" height="400" decoding="async" />
      </span>
      <span className="gg-lantern gg-lantern-right">
        <img src="/amethyst/skins/gnome-garden/lantern.webp" alt="" width="157" height="400" decoding="async" />
      </span>
      {Array.from({ length: 8 }, (_, index) => (
        <span className="gg-firefly" data-firefly-index={index + 1} key={index} />
      ))}
      <img className="gg-gnome" src="/amethyst/skins/gnome-garden/gnome.webp" alt="" width="347" height="640" decoding="async" />
    </div>
  );
}

function NeonButterflyScene() {
  const butterflies = [
    ['pink', 'crown', 17, -3.4, -4], ['gold', 'left', 21, -12.1, -7], ['violet', 'right', 19, -7.6, 12],
  ];
  const sparkles = [[12,21,-2],[19,70,-7],[28,14,-11],[38,79,-5],[49,24,-13],[58,68,-3],[67,17,-9],[74,77,-15],[82,34,-6],[89,61,-12],[94,19,-4],[7,48,-10],[23,43,-16],[34,61,-8],[54,84,-18],[64,42,-14],[78,57,-20],[91,81,-9],[17,33,-17],[31,88,-6],[44,47,-21],[61,75,-12],[72,10,-19],[86,68,-4]];
  return <div className="nb-scene" aria-hidden="true">
    <span className="nb-led-wash nb-led-wash--left" /><span className="nb-led-wash nb-led-wash--right" />
    <span className="nb-curtain-light" /><span className="nb-lamp-shimmer" />
    {butterflies.map(([tone, place, duration, delay, angle], index) => <span key={tone} className={`nb-butterfly nb-butterfly--${tone} nb-butterfly--${place}`} data-nb-butterfly={index + 1} style={{ '--nb-flap-duration': `${duration}s`, '--nb-flap-delay': `${delay}s`, '--nb-rest-angle': `${angle}deg` }}>
      {['left','right'].map(side => <span key={side} className={`nb-wing nb-wing--${side}`}><img className="nb-butterfly-art" src={`/amethyst/skins/neon-butterfly/kelly-sign-${tone}.webp`} alt="" draggable="false" loading="lazy" /></span>)}
    </span>)}
    {sparkles.map(([x,y,delay],index) => <span key={index} className="nb-sparkle" data-nb-sparkle={index+1} style={{ '--nb-x': `${x}%`, '--nb-y': `${y}%`, '--nb-delay': `${delay}s` }} />)}
  </div>;
}

function PumpkinWitchScene() {
  return <div className="hpw-scene" aria-hidden="true">
    <span className="hpw-witch-flight"><img className="hpw-witch" src="/amethyst/skins/halloween-pumpkin-witch/witch.webp" alt="" decoding="async" /></span>
    {[[12,18,-.8,8],[30,12,-3.1,7],[84,50,-1.9,8],[95,72,-4.7,7]].map(([x,y,delay,size],index) => <span key={index} className={`hpw-sparkle hpw-sparkle--${index%3}`} style={{ '--hpw-x': `${x}%`, '--hpw-y': `${y}%`, '--hpw-delay': `${delay}s`, '--hpw-size': `${size}px` }} />)}
  </div>;
}

// Shared production tree: the existing theme CSS still owns art/crop/presentation.
// Native controls bind before hydration, preserving early Pause without remounts.
export function HeroMotionScene({ t, host = false, surface = "homepage" }) {
  const config = window.SPARKLE_HERO_THEMES[t.preset];
  useEffect(() => { window.sparkleStartHeroMotion?.(); }, [t.preset]);
  const motion = <button type="button" className={config.controlClass || 'ssr-motion-control'} data-hero-motion-toggle="" aria-pressed="true" suppressHydrationWarning>Pause animation</button>;
  const controls = config.controlsClass ? <div className={config.controlsClass} role="group" aria-label="Hero animation controls">
    {motion}{config.sound && <button type="button" className={config.controlClass} data-hero-sound-toggle={config.sound} aria-pressed="false" suppressHydrationWarning>{'Enable ' + config.sound}</button>}
  </div> : motion;
  if (surface !== "homepage" && config.kind !== "decoration") return <button type="button" className="ssr-utility-motion-control" data-hero-motion-toggle="" aria-pressed="true" suppressHydrationWarning>Pause animation</button>;
  if (Boolean(config.host) !== host) return config.controlsOutsideHost && !host ? controls : null;
  if (config.kind === 'decoration') {
    const prefix = { gnome: 'gg', butterfly: 'nb', witch: 'hpw' }[config.scene];
    return <div className={`${prefix}-decoration`} data-paused="false" data-choreography="1">
      {config.scene === 'gnome' ? <GnomeGardenScene /> : config.scene === 'butterfly' ? <NeonButterflyScene /> : <PumpkinWitchScene />}
      <button type="button" className={`${prefix}-motion-control`} data-hero-motion-toggle="" aria-pressed="true" suppressHydrationWarning>Pause animation</button>
    </div>;
  }
  if (config.kind === 'sparkle') return <><SparkleFx level={t.sparkleLevel === 'none' ? 'subtle' : t.sparkleLevel} motion={config.motion || 'sparkle_rise'} />{motion}</>;
  return <>
    <div className={config.mediaClass} data-hero-media={config.frameAttribute} aria-hidden="true" suppressHydrationWarning>
      {config.scene === 'pumpkin' ? <picture className="hpc-poster" aria-hidden="true"><img src={config.poster} srcSet="/amethyst/skins/halloween-pumpkin-cat/hero-desktop-720.webp 720w, /amethyst/skins/halloween-pumpkin-cat/hero-desktop-1200.webp 1200w, /amethyst/skins/halloween-pumpkin-cat/hero-desktop-1672.webp 1672w" sizes="(max-width: 600px) 178vw, (max-width: 1100px) min(134vw, 965px), 100vw" alt="" width="1672" height="941" fetchPriority="high" /></picture> : <img className={config.posterClass} src={config.poster} alt="" width={config.width} height={config.height} fetchPriority="high" />}
      <video className={config.videoClass} data-hero-video="" muted playsInline loop preload="auto" poster={config.poster} src={config.src} aria-hidden="true" tabIndex={-1} suppressHydrationWarning />
    </div>
    {config.scene === 'unicorn' && <div className="au-magic" aria-hidden="true"><svg viewBox="0 0 1400 760" preserveAspectRatio="none"><path d="M-90 190 Q250 420 680 310 T1500 200"/><path d="M-100 480 Q300 720 790 540 T1500 470"/><path d="M-80 660 Q410 500 870 660 T1510 600"/></svg>{Array.from({length:12},(_,i)=><i key={i} style={{'--x':`${(i*29+7)%97}%`,'--y':`${(i*37+9)%93}%`,'--delay':`${-i*.7}s`}}/>)}</div>}
    {!(host && config.controlsOutsideHost) && controls}
  </>;
}

export function SparkleFx({ level, motion, className = "hp-fx-layer hp-hero-fx-layer", globalFx = false }) {
  const counts = { none: 0, subtle: 8, glittery: 24, maximum: 60 };
  const n = counts[level] || 0;
  const sparkles = useMemo(() => {
    return Array.from({ length: n }, (_, i) => ({
      left: ((i * 61 + 17) % 100),
      delay: ((i * 37 + 11) % 40) / 10,
      duration: 3 + ((i * 13 + 7) % 30) / 10,
      size: 0.5 + ((i * 19 + 3) % 12) / 10,
    }));
  }, [n]);

  if (motion === "still") return null;
  if (motion === "soft_glow") {
    return <div className={className + " hp-fx-layer-glow"} data-hero-fx={globalFx ? "true" : undefined} suppressHydrationWarning={globalFx} aria-hidden="true" />;
  }

  if (!n) return null;
  return (
    <div className={className} data-hero-fx={globalFx ? "true" : undefined} suppressHydrationWarning={globalFx} aria-hidden="true">
      {sparkles.map((s, i) => (
        <span key={i} className="hp-fx-sparkle" style={{
          left: `${s.left}%`,
          bottom: -20,
          animationDelay: `${-s.delay}s`,
          animationDuration: `${s.duration}s`,
          transform: `scale(${s.size})`,
        }} />
      ))}
    </div>
  );
}
