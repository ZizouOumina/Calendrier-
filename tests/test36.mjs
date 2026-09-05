import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };

/* Mercredi 2 septembre 2026, 09:30 heure de Madrid.
   Deux créneaux Google : 08:00→09:00 (terminé) et 09:00→11:00 (en cours).
   Un troisième à 14:00 permet de vérifier qu'on n'étire plus un créneau
   jusqu'au début du suivant. */
const MOCK = () => {
  window.__intervals = [];
  const ev = (h1, m1, h2, m2, titre) => ({
    summary: titre,
    start: {dateTime: '2026-09-02T' + String(h1).padStart(2,'0') + ':' + String(m1).padStart(2,'0') + ':00+02:00'},
    end:   {dateTime: '2026-09-02T' + String(h2).padStart(2,'0') + ':' + String(m2).padStart(2,'0') + ':00+02:00'},
  });
  window.__events = {events: [
    ev(8, 0, 9, 0, 'Anatomie CM'),
    ev(9, 0, 11, 0, 'TP Bioquímica'),
    ev(14, 0, 15, 0, 'Clinique'),
  ]};
  window.__creations = [];
  const mcp = {
    callTool(server, tool, input){
      window.__creations.push({server: server, tool: tool, title: input && input.title, parentId: input && input.parentId});
      return Promise.resolve({content:[], payload:{}});
    },
    watchTool(server, tool, input, handler, opts){
      window.__intervals.push(server + '/' + tool + ':' + ((opts && opts.refetchInterval) || 0));
      Promise.resolve().then(() => {
        if(tool === 'list_events') handler({type:'data', result:{payload: window.__events}});
        else handler({type:'error', error:{code:'server_not_connected', message:'x'}});
      });
      return () => {};
    },
    invalidate(){ return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); }
  };
  window.claude = { use(n){ return Promise.resolve(n === 'mcp' ? mcp : null); } };
};

const browser = await chromium.launch();
async function ouvrir(quand, seed){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK);
  if(seed) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date(quand) });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#week-cal').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(500);
  return { ctx, page, fr };
}

console.log('\n== 66) Vue semaine : la fin réelle de Google, pas le début du créneau suivant ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-02T09:30:00+02:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="calendrier"]').click());
  await page.waitForTimeout(400);
  const v = await fr.evaluate(() => {
    const jour = [...document.querySelectorAll('.week-cal-day')].find(d => d.classList.contains('today'));
    return {
      source: document.getElementById('week-cal-source').textContent,
      lignes: [...jour.querySelectorAll('.wc-row')].map(r => r.textContent.trim()),
      enCours: [...jour.querySelectorAll('.wc-row.wc-now')].map(r => r.textContent.trim()),
    };
  });
  ok(/Google/.test(v.source), 'la vue semaine annonce ses deux sources : ' + v.source);
  /* La vue fusionne désormais le planning type et l'agenda Google : elle ne contient plus
     seulement les 3 événements Google, mais toute la journée. Ce qu'on vérifie ici, c'est
     que les 3 événements Google y sont bien, marqués, et qu'aucun n'est perdu. */
  const google = v.lignes.filter(l => /📅/.test(l));
  ok(google.length === 3, 'les 3 événements Google sont présents et marqués : ' + google.length);
  ok(v.lignes.length > 3, 'et le planning type reste affiché autour (' + v.lignes.length + ' créneaux)');
  /* Le point réellement testé : la VRAIE heure de fin de Google. Le TP court de 09:00 à
     11:00, il doit donc être en cours à 09:30. */
  ok(v.enCours.some(l => /Bioqu/.test(l)), 'à 09:30 le TP 09:00→11:00 est en cours : ' + JSON.stringify(v.enCours));
  await ctx.close();
}

console.log('\n== 66 bis) À 13:00, plus rien en cours (le créneau de 11h est fini) ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-02T13:00:00+02:00');
  await fr.evaluate(() => document.querySelector('.nav-btn[data-page="calendrier"]').click());
  await page.waitForTimeout(400);
  const enCours = await fr.evaluate(() => {
    const jour = [...document.querySelectorAll('.week-cal-day')].find(d => d.classList.contains('today'));
    return [...jour.querySelectorAll('.wc-row.wc-now')].map(r => r.textContent.trim());
  });
  /* Avec l'ancien calcul, le TP (fini à 11:00) se serait étiré jusqu'au créneau Google
     suivant, 14:00, et serait resté surligné à 13:00. C'est ce qu'on interdit ici.
     Le planning type, lui, a légitimement un créneau en cours à cette heure. */
  ok(!enCours.some(l => /📅/.test(l)),
     'aucun événement Google surligné entre deux rendez-vous : ' + JSON.stringify(enCours));
  ok(!enCours.some(l => /Bioqu/.test(l)),
     'le TP terminé à 11:00 n\'est plus « en cours » à 13:00');
  await ctx.close();
}

console.log('\n== 67) Météo : plus de relecture toutes les minutes ==');
{
  const { ctx, fr } = await ouvrir('2026-09-02T09:30:00+02:00');
  const iv = await fr.evaluate(() => window.__intervals || []);
  const meteo = iv.filter(x => /widgets-current-claude/.test(x));
  ok(meteo.length === 1 && Number(meteo[0].split(':')[1]) >= 900000,
     'la météo est relue au plus toutes les 15 min : ' + meteo.join(', '));
  await ctx.close();
}

console.log('\n== 68) Sauvegarde Drive automatique : quotidienne, une seule par jour ==');
{
  /* marqueur posé au lundi de la semaine en cours (31 août) : rien ne doit partir */
  const { ctx, fr } = await ouvrir('2026-09-02T09:30:00+02:00', {'batcave-last-auto-backup': '2026-09-02'});
  const c = await fr.evaluate(() => window.__creations || []);
  ok(c.length === 0, 'déjà sauvegardé aujourd\'hui → aucune nouvelle sauvegarde : ' + JSON.stringify(c));
  await ctx.close();
}
{
  /* marqueur posé la semaine précédente : une sauvegarde doit partir, nommée au lundi */
  const { ctx, fr } = await ouvrir('2026-09-02T09:30:00+02:00', {'batcave-last-auto-backup': '2026-09-01'});
  /* depuis A4, la rotation suit la sauvegarde d'un search_files : on ne compte que les creations */
  const tous = await fr.evaluate(() => window.__creations || []);
  const c = tous.filter(x => x.tool === 'create_file');
  ok(c.length === 1, 'nouveau jour → une seule sauvegarde créée : ' + JSON.stringify(c));
  ok(tous.some(x => x.tool === 'search_files'), 'suivie de la rotation (search_files)');
  ok(c.length === 1 && /2026-09-02/.test(c[0].title || ''),
     'le fichier porte la date du jour : ' + (c[0] && c[0].title));
  /* les sauvegardes ne doivent plus s'entasser à la racine du Drive */
  ok(c.length === 1 && !!c[0].parentId,
     'la sauvegarde vise le dossier « Sauvegarde Batcave » : ' + (c[0] && c[0].parentId));
  await ctx.close();
}

console.log('\n== 69) La sauvegarde manuelle vise le même dossier ==');
{
  const { ctx, page, fr } = await ouvrir('2026-09-02T09:30:00+02:00', {'batcave-last-auto-backup': '2026-09-02'});
  await fr.evaluate(() => document.getElementById('drive-backup-btn').click());
  await page.waitForTimeout(400);
  const c = await fr.evaluate(() => window.__creations || []);
  ok(c.length === 1 && !!c[0].parentId, 'sauvegarde manuelle rangée dans le dossier : ' + JSON.stringify(c));
  ok(c.length === 1 && /batcave-sauvegarde-2026-09-02/.test(c[0].title || ''),
     'nom de la sauvegarde manuelle inchangé : ' + (c[0] && c[0].title));
  await ctx.close();
}

console.log('\n== 70) Restaurer une sauvegarde pousse AUSSI vers le cloud ==');
{
  /* Sans cette écriture cloud, le premier snapshot au rechargement réécrasait
     la restauration avec les anciennes valeurs : la restauration ne tenait pas. */
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(() => {
    window.__dbWrites = [];
    const docs = {};
    const db = {
      doc(path){ return { set(v){ window.__dbWrites.push({path: path, v: v && v.v}); docs[path] = v; return Promise.resolve(); } }; },
      collection(){ return { onSnapshot(cb){ cb({empty:false, docs: []}); return () => {}; } }; },
    };
    const use = window.claude.use;
    window.claude = { use(n){ return n === 'db' ? Promise.resolve(db) : use(n); } };
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T09:30:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#backup-import').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(600);
  await fr.evaluate(() => {
    document.querySelector('.backup-trigger').click();
    document.getElementById('backup-import').value = JSON.stringify({
      'batcave-goals': {poids: '61.0'},
      'batcave-transactions': [{id:'t1', date:'2026-09-01', categorie:'Test', montant:12}],
    });
    document.getElementById('backup-import-btn').click();
  });
  await page.waitForTimeout(300);
  await fr.evaluate(() => { const b = document.getElementById('ask-ok'); if(b) b.click(); });
  await page.waitForTimeout(400);
  const w = await fr.evaluate(() => window.__dbWrites || []);
  const restaures = w.filter(x => /state\/batcave-(goals|transactions)$/.test(x.path));
  const cles = [...new Set(restaures.map(x => x.path))];
  ok(cles.length === 2, 'les 2 entrées restaurées partent vers le cloud : ' + JSON.stringify(cles));
  ok(restaures.some(x => x.path === 'state/batcave-goals' && x.v && x.v.poids === '61.0'),
     'la valeur poussée est bien celle de la sauvegarde, pas l\'ancienne');
  await ctx.close();
}

await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
