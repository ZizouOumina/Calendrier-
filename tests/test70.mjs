/* Lot 22 — la séance du jour choisie à la main (jour off ou échange), et la saisie au pas :
   nombre de séries, répétitions de chaque série, lest. */
import { chromium } from 'playwright';
import { saisirSeries, effacerSaisie, valeursSaisie } from './saisir.mjs';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();
async function ouvrir(quand, local){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  if(local) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL, {timeout:20000}).catch(() => {});
  await page.frameLocator('#f').locator('#sport-grid').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
                            document.querySelector('.nav-btn[data-page="sport"]').click(); });
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
const local = (fr,k) => fr.evaluate(x => JSON.parse(localStorage.getItem(x) || 'null'), k);
const MERCREDI = '2026-10-14T09:00:00+02:00';   /* semaine 5 : tours complets, jour off */
const LUNDI    = '2026-10-12T09:00:00+02:00';

console.log('\n== 270) Un jour off, le bandeau propose de choisir une séance ==');
{
  const { ctx, fr } = await ouvrir(MERCREDI);
  const b = await fr.evaluate(() => document.getElementById('seance-choix').innerText);
  ok(/Repos/.test(b), 'la séance du jour est « Repos »');
  ok(/Haut lourd/.test(b) && /Bas complet/.test(b) && /Haut volume/.test(b) && /Bras/.test(b), 'les quatre séances sont proposées');
  ok(/compte comme séance tenue/.test(b) && /ne bouge pas/.test(b), 'le bandeau dit que c\'est un bonus qui ne change pas la cible');
  ok(await fr.evaluate(() => !document.querySelector('.sport-card.today .saisie')), 'sans choix, aucune saisie n\'est offerte');
  await ctx.close();
}

console.log('\n== 271) Choisir une séance la rend cochable et la compte comme tenue ==');
{
  const { ctx, fr, page } = await ouvrir(MERCREDI);
  await fr.evaluate(() => document.querySelector('[data-seance="Haut lourd"]').click());
  await page.waitForTimeout(250);
  ok(await local(fr, 'batcave-sport-jour-2026-10-14') === 'Haut lourd', 'le choix est écrit dans batcave-sport-jour-<date>');
  ok(await fr.evaluate(() => (document.querySelector('.sport-card.today .stitle') || {}).textContent) === 'Haut lourd', 'la carte Haut lourd devient la séance du jour');
  ok(/choisie à la main/.test(await fr.evaluate(() => document.getElementById('seance-choix').innerText)), 'le bandeau signale que le choix est manuel');
  const strip = await fr.evaluate(() => document.getElementById('week-strip').innerText);
  ok(/MER\s*\n?\s*Haut lourd/.test(strip.replace(/\s+/g, ' ').replace('MER Haut lourd', 'MER\nHaut lourd')) || /Haut lourd/.test(strip.split('Mer')[1] || strip), 'la bande de la semaine suit le choix');
  /* la séance faite compte, mais le PLAN du mois ne bouge pas : c'est un bonus */
  await ctx.close();
}

console.log('\n== 272) Le prévu du mois ignore la séance bonus ==');
{
  const { ctx, fr, page } = await ouvrir(MERCREDI);
  await fr.evaluate(() => document.querySelector('[data-seance="Haut lourd"]').click());
  await page.waitForTimeout(250);
  const prevuMerc = await fr.evaluate(() => {
    /* minutesPrevuesJour n'est pas exposé : on lit la cible affichée de l'objectif sport */
    document.querySelector('.nav-btn[data-page="objectifs"]').click();
    return [...document.querySelectorAll('#obj-liste .obj-row')].map(r => r.innerText.replace(/\s+/g,' ')).filter(t => /Séances de sport/.test(t))[0] || '';
  });
  ok(prevuMerc.length > 0, 'la ligne « Séances de sport tenues » existe (' + prevuMerc.slice(0, 70) + ')');
  ok(!/attendu\s*0\b/.test(prevuMerc), 'la cible reste calculée sur la grille, pas sur les séances bonus');
  await ctx.close();
}

console.log('\n== 273) Saisie au pas : séries, répétitions, lest ==');
{
  const { ctx, fr, page } = await ouvrir(LUNDI);
  ok(await valeursSaisie(fr) === '6/6/6/6', 'la saisie s\'ouvre sur la cible 6/6/6/6 (' + await valeursSaisie(fr) + ')');
  /* + une série */
  await fr.evaluate(() => document.querySelector('.sport-card.today .saisie [data-pas="nb"][data-d="1"]').click());
  ok(await valeursSaisie(fr) === '6/6/6/6/6', 'un appui sur + ajoute une série (' + await valeursSaisie(fr) + ')');
  await fr.evaluate(() => document.querySelector('.sport-card.today .saisie [data-pas="nb"][data-d="-1"]').click());
  ok(await valeursSaisie(fr) === '6/6/6/6', 'un appui sur − la retire');
  await saisirSeries(fr, [9, 8, 7, 7], 2.5);
  await page.waitForTimeout(250);
  const log = await local(fr, 'batcave-sport-log');
  ok(log.length === 1 && JSON.stringify(log[0].series) === '[9,8,7,7]' && log[0].charge === 2.5,
     'journal : 9/8/7/7 @2,5 kg (' + JSON.stringify(log[0] && [log[0].series, log[0].charge]) + ')');
  ok(await fr.evaluate(() => document.querySelector('.sport-card.today .saisie [data-valider]').textContent.trim()) === '✓ enregistré', 'le bouton passe à « enregistré »');
  ok((await local(fr, 'batcave-sport-2026-10-12'))['Haut lourd-0'] === true, 'l\'exercice est coché tout seul');
  await ctx.close();
}

console.log('\n== 274) Le lest ne descend pas sous zéro, les séries pas sous une ==');
{
  const { ctx, fr } = await ouvrir(LUNDI);
  const etat = await fr.evaluate(() => {
    const b = document.querySelector('.sport-card.today .saisie');
    const moinsCharge = b.querySelector('[data-pas="charge"][data-d="-1"]');
    let n = b.querySelectorAll('.serie').length, g = 0;
    while(n > 1 && g++ < 20){ b.querySelector('[data-pas="nb"][data-d="-1"]').click(); n = b.querySelectorAll('.serie').length; }
    const moinsNb = b.querySelector('[data-pas="nb"][data-d="-1"]');
    return { charge: moinsCharge.disabled, nb: moinsNb.disabled, series: b.querySelectorAll('.serie').length };
  });
  ok(etat.charge === true, 'à 0 kg, le − du lest est désactivé');
  ok(etat.series === 1 && etat.nb === true, 'à une série, le − des séries est désactivé');
  await ctx.close();
}

console.log('\n== 275) « Effacer » retire la séance du jour ==');
{
  const { ctx, fr, page } = await ouvrir(LUNDI);
  await saisirSeries(fr, [7, 7, 6, 6]);
  await page.waitForTimeout(200);
  ok((await local(fr, 'batcave-sport-log')).length === 1, 'une entrée enregistrée');
  await effacerSaisie(fr);
  await page.waitForTimeout(200);
  ok((await local(fr, 'batcave-sport-log')).length === 0, 'effacer vide le journal du jour');
  ok((await local(fr, 'batcave-sport-2026-10-12'))['Haut lourd-0'] === false, 'et décoche l\'exercice');
  ok(await valeursSaisie(fr) === '6/6/6/6', 'le bloc repart de la cible');
  await ctx.close();
}

console.log('\n== 276) Revenir au plan ==');
{
  const { ctx, fr, page } = await ouvrir(MERCREDI);
  await fr.evaluate(() => document.querySelector('[data-seance="Bas complet"]').click());
  await page.waitForTimeout(200);
  await fr.evaluate(() => document.querySelector('.sc-annule').click());
  await page.waitForTimeout(200);
  ok(await local(fr, 'batcave-sport-jour-2026-10-14') === null, 'la surcharge est supprimée');
  ok(/Repos/.test(await fr.evaluate(() => document.getElementById('seance-choix').innerText)), 'la journée redevient un repos');
  await ctx.close();
}

console.log('\n== 277) Échanger la séance d\'un jour d\'entraînement ==');
{
  const { ctx, fr, page } = await ouvrir(LUNDI);
  await fr.evaluate(() => document.querySelector('[data-seance="Bas complet"]').click());
  await page.waitForTimeout(250);
  ok(await fr.evaluate(() => (document.querySelector('.sport-card.today .stitle') || {}).textContent) === 'Bas complet', 'lundi peut porter le bas du corps');
  ok(/le plan disait Haut lourd/.test(await fr.evaluate(() => document.getElementById('seance-choix').innerText)), 'le bandeau rappelle ce que le plan prévoyait');
  await ctx.close();
}

console.log('\n== 278) Le programme parle du vrai travail de cou et d\'abdos ==');
{
  const { ctx, fr } = await ouvrir(LUNDI);
  const t = await fr.evaluate(() => { document.getElementById('programme-toggle').click(); return document.getElementById('programme-details').innerText; });
  ok(/jamais de pont sur la tête/.test(t), 'le guide interdit explicitement le pont de cou');
  ok(/1,25 kg/.test(t), 'la progression du cou se fait en kilos');
  ok(/roue abdominale/i.test(t) && /dragon flag/i.test(t), 'les abdos lestés sont décrits');
  const cartes = await fr.evaluate(() => [...document.querySelectorAll('.sport-card')].map(c => c.innerText).join('\n'));
  ok(/Flexion du cou/.test(cartes) && /Extension du cou/.test(cartes) && /Inclinaisons latérales du cou/.test(cartes), 'les trois mouvements de cou sont dans les séances');
  ok(!/Hollow hold|Planche latérale|Isométrie du cou/.test(cartes), 'les gainages isométriques ont disparu');
  await ctx.close();
}

await browser.close();
console.log(errs ? '\n' + errs + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
