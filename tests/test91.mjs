/* A4 — la pluie de 5 h 30, dite la veille. A5 — le dimanche ferme la semaine tout seul.

   Sur A4, un point de methode : la charge utile injectee ici est la forme REELLE relevee le
   13 septembre 2026 sur widgets-hourly-claude (Alicante, locationKey 310681, metric, fr), pas
   une forme supposee. Le connecteur lui-meme n'est jamais simule : on injecte ce qu'il rend,
   et on lit la phrase produite. Ce qui est verifie, c'est la DECISION -- quel jour la ligne
   s'affiche, ce qu'elle conseille, et surtout qu'elle se TAIT quand elle ne sait pas.
   L'horizon du connecteur est de douze heures : depuis la cloture du soir, 05 h le lendemain
   y est toujours ; un jour plus loin, non. Une meteo devinee vaudrait moins que rien. */
import { chromium } from 'playwright';
const b = await chromium.launch();
let err = 0;
const ok = (c, m) => { if(c) console.log('  ok  ' + m); else { err++; console.log('  FAIL ' + m); } };

async function jour(quand, local){
  const ctx = await b.newContext({viewport:{width:1440,height:1100}, timezoneId:'Europe/Madrid', locale:'fr-FR'});
  await ctx.addInitScript(seed => {
    window.claude = undefined;
    Object.keys(seed || {}).forEach(k => localStorage.setItem(k, JSON.stringify(seed[k])));
  }, local || {});
  const page = await ctx.newPage();
  page.on('pageerror', e => { err++; console.log('  PAGEERROR ' + quand + ' : ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto('http://127.0.0.1:8199/host.html');
  await page.frameLocator('#f').locator('#dash-focus').waitFor({state:'attached', timeout:20000});
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); });
  await page.waitForTimeout(400);
  return { ctx, page, fr };
}
/* une tranche horaire, a la forme du connecteur */
const tranche = (date, t, pluie, phrase, ressenti) => ({
  date: date, dateTime: '05 h', temperature: t + '°', temperatureValue: t,
  realFeel: (ressenti === undefined ? t - 2 : ressenti) + '°', phrase: phrase,
  precip: pluie + ' %', hasPrecip: pluie > 0,
  extended: {rainProbability: pluie + ' %', wind: 'NE 21 km/h', gusts: '34 km/h'}
});

console.log('\n== 310) Le bloc de 05:30 : dehors les jours de sport, dedans les autres ==');
{
  const { ctx, fr } = await jour('2026-09-13T21:40:00+02:00');
  const r = await fr.evaluate(() => ['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-19','2026-09-20']
    .map(d => window.__bcSeanceDehors(d)));
  ok(JSON.stringify(r) === JSON.stringify([true, true, false, true, false, true, false]),
     'lundi, mardi, jeudi, samedi dehors ; mercredi, vendredi, dimanche non (' + r.join(', ') + ')');
  await ctx.close();
}

console.log('\n== 311) Sans prévision, la ligne se tait — elle ne devine pas ==');
{
  const { ctx, fr } = await jour('2026-09-13T21:40:00+02:00');
  const r = await fr.evaluate(() => ({
    avant: window.__bcMeteoSeance('2026-09-14'),
    apresErreur: (window.__bcMeteoInjecter(null), window.__bcMeteoSeance('2026-09-14')),
    cache: (() => { const e = document.getElementById('cl-meteo'); return !e || e.hidden; })()
  }));
  ok(r.avant === '' && r.apresErreur === '', 'aucune phrase tant que le connecteur n\'a rien rendu');
  ok(r.cache, 'et la ligne reste masquée dans la clôture');
  await ctx.close();
}

console.log('\n== 312) Avec la prévision réelle : la phrase, et le conseil qui suit la pluie ==');
{
  const { ctx, fr } = await jour('2026-09-13T21:40:00+02:00');
  const cas = await fr.evaluate(t => {
    const f = (p, temp, phrase) => {
      window.__bcMeteoInjecter([Object.assign({}, t, {
        precip: p + ' %', hasPrecip: p > 0, temperature: temp + '°', temperatureValue: temp,
        realFeel: (temp - 2) + '°', phrase: phrase,
        extended: {rainProbability: p + ' %', wind: 'NE 21 km/h', gusts: '34 km/h'}
      })]);
      return window.__bcMeteoSeance('2026-09-14');
    };
    return {pluie: f(62, 11, 'Averses'), possible: f(35, 14, 'Nuageux'),
            froid: f(5, 4, 'Ciel dégagé'), clair: f(0, 17, 'Ciel dégagé')};
  }, tranche('2026-09-14T05:00:00+02:00', 11, 62, 'Averses'));
  ok(/11° \(ressenti 9°\)/.test(cas.pluie) && /pluie 62 %/.test(cas.pluie) && /vent NE 21 km\/h/.test(cas.pluie),
     'température, ressenti, pluie et vent y sont : ' + cas.pluie.slice(0, 78));
  ok(/veste, ou séance à la maison/.test(cas.pluie), '62 % → décide ce soir');
  ok(/regarde le ciel/.test(cas.possible), '35 % → pluie possible');
  ok(/manches longues/.test(cas.froid) && !/pluie possible/.test(cas.froid), '4 °C sans pluie → le froid prend la main');
  ok(/rien à prévoir/.test(cas.clair), '17 °C et ciel dégagé → rien à prévoir');
  await ctx.close();
}

console.log('\n== 313) Un jour sans séance dehors : rien, même avec la prévision ==');
{
  const { ctx, fr } = await jour('2026-09-15T21:40:00+02:00');   /* mardi soir → mercredi, Anki matinal */
  const r = await fr.evaluate(t => {
    window.__bcMeteoInjecter([t]);
    return window.__bcMeteoSeance('2026-09-16');
  }, tranche('2026-09-16T05:00:00+02:00', 9, 80, 'Pluie'));
  ok(r === '', 'mercredi, le bloc de 05:30 est à la maison : aucune ligne (' + JSON.stringify(r) + ')');
  await ctx.close();
}

console.log('\n== 314) Hors des douze heures du connecteur : silence ==');
{
  const { ctx, fr } = await jour('2026-09-13T21:40:00+02:00');
  const r = await fr.evaluate(t => {
    window.__bcMeteoInjecter([t]);           /* une tranche du 16, on demande le 14 */
    return window.__bcMeteoSeance('2026-09-14');
  }, tranche('2026-09-16T05:00:00+02:00', 80, 9, 'Pluie'));
  ok(r === '', 'la tranche de 05 h du bon jour est absente → rien n\'est affiché');
  await ctx.close();
}

console.log('\n== 315) A5 : les sept chiffres de la semaine, dans la clôture du dimanche ==');
{
  const { ctx, page, fr } = await jour('2026-09-20T21:40:00+02:00');
  const r = await fr.evaluate(() => {
    const c = window.__bcChiffresSemaine();
    return {n: c.length, labels: c.map(x => x.label), champs: c.every(x => x.valeur !== undefined && x.avant !== undefined && x.sens)};
  });
  ok(r.n === 7, 'sept chiffres, pas dix (' + r.n + ')');
  ok(JSON.stringify(r.labels) === JSON.stringify(['Révision','Projets','Espagnol','Fidélité','Sommeil/nuit','Séances','Habitudes']),
     'et ce sont ceux sur lesquels la semaine suivante peut agir : ' + r.labels.join(' · '));
  ok(r.champs, 'chacun porte sa valeur, celle de la semaine dernière, et le sens');
  /* ils doivent être DANS la clôture, pas seulement calculables */
  const vu = await fr.evaluate(() => {
    document.getElementById('cloture-overlay').hidden = false;
    const b = document.getElementById('bc-cloture'); if(b) b.click();
    return null;
  });
  await page.waitForTimeout(400);
  const dans = await fr.evaluate(() => {
    const box = document.getElementById('cl-semaine'), rv = document.getElementById('cl-revue');
    return {cases: box ? box.children.length : 0, revueVisible: rv ? !rv.hidden : false};
  });
  ok(dans.revueVisible && dans.cases === 7, 'les sept cases sont rendues dans l\'écran du dimanche (' + dans.cases + ')');
  await ctx.close();
}

console.log('\n== 316) Un jour de semaine : pas de bloc de fin de semaine ==');
{
  const { ctx, page, fr } = await jour('2026-09-17T21:40:00+02:00');
  await fr.evaluate(() => { const b = document.getElementById('bc-cloture'); if(b) b.click(); });
  await page.waitForTimeout(400);
  const r = await fr.evaluate(() => {
    const rv = document.getElementById('cl-revue');
    return rv ? rv.hidden : null;
  });
  ok(r === true, 'jeudi soir, la revue de semaine reste fermée');
  await ctx.close();
}

await b.close();
console.log(err ? '\n' + err + ' ÉCHEC(S)' : '\nTOUT VERT');
process.exit(err ? 1 : 0);
