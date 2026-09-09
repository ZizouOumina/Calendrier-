/* Contraste WCAG AA sur les deux themes.
   Un theme clair mal calibre, ce n'est pas une question de gout : c'est une Batcave qu'on
   n'arrive pas a lire sur une terrasse d'Alicante. Ce script parcourt les 18 onglets dans
   les deux themes, calcule le rapport de contraste de CHAQUE feuille de texte visible
   contre le fond opaque le plus proche, et refuse tout ce qui passe sous le seuil AA :
   4,5:1 pour du texte courant, 3:1 pour du grand texte (24 px, ou 18,66 px en gras).
   Les fonds en degrade sont ignores : leur luminance n'est pas un chiffre unique. */
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
const browser = await chromium.launch();
let TOTAL = 0;
for(const theme of ['jour','nuit']){
  const ctx = await browser.newContext({ viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-09-02T16:30:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#timer-pomodoro').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await fr.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(400);
  console.log('\n===== THEME ' + theme + ' =====');
  const pages = await fr.evaluate(() => [...document.querySelectorAll('.nav-btn[data-page]')].map(b => b.dataset.page));
  for(const p of pages){
    await fr.evaluate(x => document.querySelector('.nav-btn[data-page="'+x+'"]').click(), p);
    await page.waitForTimeout(300);
    const r = await fr.evaluate(x => {
      const lum = c => { const [r,g,b] = c.map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }); return 0.2126*r + 0.7152*g + 0.0722*b; };
      const parse = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if(!m) return null; const p = m[1].split(',').map(Number); return {c:[p[0],p[1],p[2]], a: p.length > 3 ? p[3] : 1}; };
      const bgOf = el => {
        let n = el;
        while(n && n !== document.documentElement){
          const cs = getComputedStyle(n);
          if(cs.backgroundImage !== 'none') return null;         /* degrade : non mesurable */
          const bg = parse(cs.backgroundColor);
          if(bg && bg.a >= 0.95) return bg.c;
          n = n.parentElement;
        }
        const b = parse(getComputedStyle(document.body).backgroundColor);
        return b && b.a >= 0.95 ? b.c : null;
      };
      const sec = document.querySelector('.page[data-page="'+x+'"]');
      const out = [];
      [...(sec ? sec.querySelectorAll('*') : [])].forEach(el => {
        if(el.offsetParent === null) return;
        const t = (el.textContent || '').trim(); if(!t) return;
        if([...el.children].some(c => (c.textContent || '').trim())) return;
        const cs = getComputedStyle(el);
        const fg = parse(cs.color); if(!fg || fg.a < 0.9) return;
        const bg = bgOf(el); if(!bg) return;
        const L1 = lum(fg.c), L2 = lum(bg);
        const ratio = (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05);
        const size = parseFloat(cs.fontSize), gras = Number(cs.fontWeight) >= 600;
        const seuil = (size >= 24 || (size >= 18.66 && gras)) ? 3 : 4.5;
        if(ratio < seuil) out.push(t.replace(/\s+/g,' ').slice(0,26) + ' [' + cs.color + ' sur rgb(' + bg.join(',') + ') = ' + ratio.toFixed(2) + ' < ' + seuil + ']');
      });
      return [...new Set(out)];
    }, p);
    if(r.length){ TOTAL += r.length; console.log('  ⚠ ' + p + ' : ' + r.slice(0,6).join(' | ')); }
    else console.log('  ok ' + p);
  }
  await ctx.close();
}
console.log(TOTAL === 0 ? '\nCONTRASTE AA TENU SUR LES 2 THEMES' : `\nDEFAUTS DE CONTRASTE: ${TOTAL}`);
await browser.close();
process.exit(TOTAL === 0 ? 0 : 1);
