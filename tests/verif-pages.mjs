/* Vérification de toutes les pages autonomes : erreurs console, débordement horizontal,
   titre, liens internes cassés, et thème sombre. Écran large et 390 px. */
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
const pages = readdirSync('/home/user/Calendrier-').filter(f => f.endsWith('.html') && f !== 'batcave.html');
const b = await chromium.launch();
let ko = 0;
for(const f of pages){
  for(const [nom, w, theme] of [['large', 1200, null], ['téléphone', 390, null], ['sombre', 1200, 'dark']]){
    const ctx = await b.newContext({viewport:{width:w, height:1000}, colorScheme: theme === 'dark' ? 'dark' : 'light'});
    const page = await ctx.newPage();
    const err = [];
    page.on('pageerror', e => err.push(e.message));
    /* Chromium n'utilise pas le proxy du conteneur : la feuille de style Google Fonts
       n'y est jamais joignable, alors que curl la charge. C'est un artefact du bac à
       sable, pas un défaut des pages — on l'écarte pour ne garder que le vrai signal. */
    page.on('console', m => { const t = m.text();
      if(m.type() === 'error' && !/ERR_CONNECTION_RESET|fonts\.g(oogleapis|static)/.test(t))
        err.push('console: ' + t.slice(0,80)); });
    page.on('requestfailed', r => { if(!/fonts\.g(oogleapis|static)/.test(r.url())) err.push('requête échouée : ' + r.url().slice(0,60)); });
    /* « load » attend la feuille Google Fonts, que le proxy du bac a sable refuse : chaque
       page partait alors au bout de la temporisation par defaut, et la campagne entiere
       finissait par se bloquer, navigateur perdu. « domcontentloaded » n'attend pas les
       ressources externes -- ce sont justement celles qu'on a deja decide d'ignorer
       (voir le filtre de console ci-dessus). Plafond explicite par securite. */
    await page.goto('file:///home/user/Calendrier-/' + f, {waitUntil:'domcontentloaded', timeout:15000});
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const debord = document.documentElement.scrollWidth > window.innerWidth + 1;
      const ancres = [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(Boolean);
      const casses = [...new Set(ancres.filter(id => !document.getElementById(id)))];
      const bg = getComputedStyle(document.body).backgroundColor;
      const fg = getComputedStyle(document.body).color;
      const familles = getComputedStyle(document.body).fontFamily;
      return {debord, casses, titre: document.title, bg, fg, familles,
              repli: /(-apple-system|Arial|Georgia|Helvetica|sans-serif|serif|monospace)/.test(familles),
              transparent: bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent'};
    });
    const soucis = [];
    if(err.length) soucis.push(err.length + ' erreur(s) : ' + err[0]);
    if(r.debord) soucis.push('débordement horizontal');
    if(r.casses.length) soucis.push('ancres cassées : ' + r.casses.join(', '));
    if(!r.titre) soucis.push('pas de <title>');
    if(r.transparent) soucis.push('fond du body transparent');
    if(!r.repli) soucis.push('aucune police de repli : ' + r.familles);
    if(soucis.length){ ko++; console.log('  FAIL ' + f + ' [' + nom + '] · ' + soucis.join(' · ')); }
    else console.log('  ok   ' + f.padEnd(28) + ' [' + nom.padEnd(9) + '] · « ' + r.titre + ' » · fond ' + r.bg);
    await ctx.close();
  }
}
await b.close();
console.log(ko ? '\n' + ko + ' PROBLÈME(S)' : '\nTOUTES LES PAGES SONT SAINES');
process.exit(ko ? 1 : 0);
