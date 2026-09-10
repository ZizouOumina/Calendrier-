/* Lot 29 — la chauve-souris dans l'onglet et dans la barre des favoris.
   Dans l'artefact publié, le contenu du fichier est placé dans <body> : les <link rel="icon">
   n'atterrissent pas dans <head> et l'icône de l'enveloppe de publication gagne. La Batcave
   perdait sa chauve-souris dans la barre des favoris de Chrome. Ce test vérifie les deux
   situations : le fichier seul, et le fichier enveloppé dans une page qui déclare déjà son
   propre favicon. */
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
let err = 0;
const ok = (c,m)=>{ if(c) console.log('  ok  '+m); else { err++; console.log('  FAIL '+m); } };

/* l'enveloppe de publication, reconstituée : un <head> qui déclare déjà un favicon emoji */
const EMOJI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%A6%87%3C/text%3E%3C/svg%3E";
fs.writeFileSync('./enveloppe-tmp.html',
  '<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="' + EMOJI + '"></head><body>\n'
  + fs.readFileSync('./batcave.html','utf8') + '\n</body></html>');

async function ouvrir(url){
  const ctx = await b.newContext({viewport:{width:1440,height:1000}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(()=>{window.claude=undefined;});
  const page = await ctx.newPage();
  page.on('pageerror', e=>{err++; console.log('  PAGEERROR '+e.message);});
  await page.clock.install({time:new Date('2026-09-14T09:00:00+02:00')});
  await page.goto(url);
  await page.waitForTimeout(2600);   /* le troisième passage du repositionnement */
  return {ctx, page};
}
const lire = page => page.evaluate(()=>({
  tete: [...document.head.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"],link[rel="manifest"]')]
          .map(l=>l.rel+'|'+(l.sizes && l.sizes.value || '')),
  intrus: document.querySelectorAll('link[rel~="icon"]:not([data-bat]), link[rel="apple-touch-icon"]:not([data-bat])').length,
  horsTete: document.body.querySelectorAll('link[data-bat]').length,
  png: [...document.head.querySelectorAll('link[rel~="icon"]')].map(l=>l.href.slice(0,22))
}));

for (const [url, nom] of [['http://127.0.0.1:8199/batcave.html','fichier seul'],
                          ['http://127.0.0.1:8199/enveloppe-tmp.html','enveloppé, favicon concurrent']]) {
  console.log('\n== ' + nom + ' ==');
  const {ctx, page} = await ouvrir(url);
  const r = await lire(page);
  ok(r.tete.filter(x=>/^icon\|(16x16|32x32|48x48)$/.test(x)).length === 3,
     'les trois tailles PNG sont dans <head> : ' + r.tete.filter(x=>x.startsWith('icon|')).join(' · '));
  ok(r.tete.includes('apple-touch-icon|'), 'apple-touch-icon dans <head> (écran d\'accueil iOS)');
  ok(r.tete.includes('manifest|'), 'manifeste dans <head>');
  ok(r.intrus === 0, 'aucune icône concurrente ne survit (' + r.intrus + ')');
  ok(r.horsTete === 0, 'aucun lien d\'icône resté dans <body> (' + r.horsTete + ')');
  ok(r.png.length === 3 && r.png.every(Boolean), 'les trois icônes sont des PNG embarqués, pas des URL externes');
  await ctx.close();
}

console.log('\n== la chauve-souris est bien dessinée, aux bonnes dimensions ==');
{
  const {ctx, page} = await ouvrir('http://127.0.0.1:8199/batcave.html');
  const d = await page.evaluate(async ()=>{
    const out = [];
    for(const l of document.head.querySelectorAll('link[rel~="icon"]')){
      const im = new Image();
      await new Promise(r=>{ im.onload = r; im.onerror = r; im.src = l.href; });
      const c = document.createElement('canvas');
      c.width = im.naturalWidth; c.height = im.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      const px = g.getImageData(0, 0, c.width, c.height).data;
      /* la boîte englobante du cyan : c'est elle qui dit si la chauve-souris remplit le
         carré ou si elle flotte au milieu, perdue, comme avec l'ancien cadre */
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for(let y = 0; y < c.height; y++) for(let x = 0; x < c.width; x++){
        const i = 4 * (y * c.width + x);
        if(px[i+2] > 140 && px[i+1] > 120 && px[i] < 140){
          if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y;
        }
      }
      out.push({declare: l.sizes.value, reel: im.naturalWidth + 'x' + im.naturalHeight,
                largeur: Math.round(100 * (x1 - x0 + 1) / c.width),
                hauteur: Math.round(100 * (y1 - y0 + 1) / c.height)});
    }
    return out;
  });
  d.forEach(x=>{
    ok(x.declare === x.reel, 'taille déclarée = taille réelle : ' + x.declare + ' → ' + x.reel);
    /* la chauve-souris doit remplir franchement le carré : l'ancienne icône la dessinait
       petite dans un cadre, et à 16 px dans la barre des favoris il ne restait qu'une tache */
    ok(x.largeur >= 70, x.reel + ' : envergure ' + x.largeur + ' % de la largeur');
    ok(x.hauteur >= 35, x.reel + ' : hauteur ' + x.hauteur + ' % du carré');
  });
  await ctx.close();
}
fs.unlinkSync('./enveloppe-tmp.html');
await b.close();
console.log(err? '\n'+err+' ECHEC(S)' : '\nTOUT VERT');
process.exit(err?1:0);
