/** Additive bridge for the frozen customer renderer. Other presets emit no bytes. */
export function starlightThemeBootstrap(preset: unknown): string {
  if (preset !== 'starlight_christmas_hollow' && preset !== 'macies_christmas_globe') return ''
  return '\n;(function(){if(typeof document==="undefined"||!document.documentElement?.dataset||typeof document.querySelector!=="function"||!document.head)return;' +
    'document.documentElement.dataset.customerTheme="' + preset + '";' +
    'var base="/amethyst/' + preset.replaceAll('_', '-') + '";' +
    'if(!document.querySelector(\'link[href="\'+base+\'.css"],style[data-ssr-style="\'+base.split("/").pop()+\'.css"]\')){var c=document.createElement("link");c.rel="stylesheet";c.href=base+".css";document.head.append(c)}' +
    'if(!document.querySelector(\'[data-starlight-runtime],script[src$="/starlight-christmas-hollow.js"]\')){var s=document.createElement("script");s.src="/amethyst/starlight-christmas-hollow.js";s.dataset.starlightRuntime="true";s.defer=true;document.head.append(s)}})();'
}
