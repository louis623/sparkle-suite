const SHORT={recent:'Recent',announce:'Celebrate',jewelry:'Jewelry',business:'Business',shows:'Shows',glam:'Glam',love:'Love',seasonal:'Holidays',nature:'Florals',treats:'Treats',feels:'Faces',symbols:'Pointers'};
// Renders the expanded emoji picker into [data-picker] elements.
// data-mode="tabs" (one category + recents) | "stacked" (every category) ; data-active=key ; data-hot=emoji
function renderPickers(){
  document.querySelectorAll('[data-picker]').forEach(el=>{
    const set=window.EMOJI_SET, mode=el.dataset.mode||'tabs', active=el.dataset.active||'announce', hot=el.dataset.hot||'';
    const total=new Set(set.filter(c=>c.key!=='recent').flatMap(c=>c.items.map(i=>i.e))).size;
    const grid=items=>`<div class="ep-grid">${items.map(i=>`<button class="${i.e===hot?'hot':''}" title="${i.n}">${i.e}</button>`).join('')}</div>`;
    const sec=c=>`<div class="ep-sec"><h4>${c.label}<span>${c.items.length}</span></h4>${grid(c.items)}</div>`;
    const tabs=`<div class="ep-tabs">${set.map(c=>`<span class="ep-tab ${c.key===active?'on':''}"><span class="em">${c.icon}</span>${el.dataset.short==='1'?'':'<span class="tl">'+(SHORT[c.key]||c.label)+'</span>'}</span>`).join('')}</div>`;
    let inner = `<div class="ep-search">🔍&nbsp; Search ${total} emojis<span class="tl2"> · try “ring”, “heart”, “turkey”</span></div>` + (el.dataset.notabs?'':tabs);
    if(mode==='tabs'){ inner += sec(set[0]) + sec(set.find(c=>c.key===active)); }
    else if(mode==='some'){ const keys=(el.dataset.keys||'').split(','); inner += set.filter(c=>keys.includes(c.key)).map(sec).join(''); }
    else { inner += set.map(sec).join(''); }
    const hotItem = set.flatMap(c=>c.items).find(i=>i.e===hot);
    inner += `<div class="ep-foot"><span>${hotItem?`<span class="big">${hotItem.e}</span>${hotItem.n}`:'Tap to add at your cursor'}</span><span>Adds at your cursor</span></div>`;
    el.classList.add('ep'); el.innerHTML=inner;
  });
}
document.addEventListener('DOMContentLoaded',renderPickers);
