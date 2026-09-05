import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
const browser = await chromium.launch();

/* Faux cloud instrumenté : on observe tout ce que la page y écrit et supprime. */
const MOCK = (cfg) => {
  window.__w = []; window.__del = []; window.__dl = [];
  const distant = cfg.cloud || {};
  const db = {
    doc(path){ return {
      set(v){ window.__w.push({path, v: v && v.v}); return Promise.resolve(); },
      delete(){ window.__del.push(path); return Promise.resolve(); },
    }; },
    collection(){ return { onSnapshot(cb){
      cb({ empty: Object.keys(distant).length === 0,
           docs: Object.keys(distant).map(k => ({id: k, data: () => ({v: distant[k]})})) });
      return () => {};
    } }; },
  };
  const mcp = {
    callTool(server, tool, input){
      window.__dl.push({tool, input});
      if(tool === 'search_files') return Promise.resolve({payload:{files: cfg.files || []}});
      if(tool === 'download_file_content') return Promise.resolve({payload:{content: cfg.b64 || ''}});
      return Promise.resolve({payload:{}});
    },
    watchTool(){ return () => {}; },
    invalidate(){ return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); }
  };
  window.claude = { use(n){ return Promise.resolve(n === 'db' ? db : (n === 'mcp' ? mcp : null)); } };
};

async function ouvrir(cfg, local){
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(MOCK, cfg);
  if(local) await ctx.addInitScript(x => { Object.keys(x).forEach(k => localStorage.setItem(k, JSON.stringify(x[k]))); }, local);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T09:30:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#backup-import').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(700);
  return { ctx, page, fr };
}

console.log('\n== 71) Rattrapage : une clé locale absente du cloud y est poussée ==');
{
  /* Le cloud connaît déjà une clé : avant, le rattrapage ne se déclenchait QUE sur un
     cloud vide, donc les charges fixes restaient purement locales pour toujours. */
  const { ctx, fr } = await ouvrir(
    {cloud: {'batcave-goals': {poids: '63.7'}}},
    {'batcave-fixed-charges': [{id:'fc1', label:'Loyer', montant:700, cat:'Logement'}]});
  const w = await fr.evaluate(() => window.__w || []);
  const pousse = w.filter(x => x.path === 'state/batcave-fixed-charges');
  ok(pousse.length >= 1, 'la clé locale inconnue du cloud y est envoyée : ' + JSON.stringify(w.map(x=>x.path)));
  ok(pousse.length >= 1 && pousse[0].v && pousse[0].v[0] && pousse[0].v[0].label === 'Loyer',
     'et avec la bonne valeur : ' + JSON.stringify(pousse[0] && pousse[0].v));
  await ctx.close();
}

console.log('\n== 72) Les clés déjà dans le cloud ne sont pas réécrites inutilement ==');
{
  const { ctx, fr } = await ouvrir(
    {cloud: {'batcave-goals': {poids: '63.7'}}},
    {'batcave-goals': {poids: '63.7'}});
  const w = await fr.evaluate(() => (window.__w || []).filter(x => x.path === 'state/batcave-goals'));
  ok(w.length === 0, 'aucune réécriture d\'une clé déjà synchronisée : ' + w.length);
  await ctx.close();
}

console.log('\n== 73) Purge PomoDial : la suppression atteint aussi le cloud ==');
{
  /* Sans suppression distante, l'instantané suivant les réécrivait en local et,
     le marqueur de purge étant posé, elles revenaient définitivement. */
  const { ctx, page, fr } = await ouvrir({cloud: {'batcave-goals': {poids:'63.7'}}});
  /* le marqueur de purge est déjà posé au premier chargement : on remet l'état d'un
     utilisateur qui a encore ses vieilles clés PomoDial, puis on recharge. */
  await fr.evaluate(() => {
    localStorage.removeItem('batcave-pomodial-purge');
    localStorage.setItem('batcave-pomodial-serie', '3');
    localStorage.setItem('batcave-pomodial-creees', '["x"]');
  });
  await page.reload();
  await page.frameLocator('#f').locator('#backup-import').waitFor({ state:'attached', timeout:15000 });
  const fr2 = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(800);
  const r = await fr2.evaluate(() => ({
    del: window.__del || [],
    restantes: Object.keys(localStorage).filter(k => k.indexOf('batcave-pomodial-') === 0 && k !== 'batcave-pomodial-purge'),
  }));
  ok(r.restantes.length === 0, 'les vieilles clés PomoDial sont retirées en local : ' + JSON.stringify(r.restantes));
  ok(r.del.includes('state/batcave-pomodial-serie') && r.del.includes('state/batcave-pomodial-creees'),
     'et supprimées du cloud, donc elles ne reviendront pas : ' + JSON.stringify(r.del));
  await ctx.close();
}

console.log('\n== 74) Restaurer depuis Drive : recherche, téléchargement, accents intacts ==');
{
  const sauvegarde = {'batcave-budget-limits': {'Eau & Électricité': 60}, 'batcave-goals': {poids:'61.0'}};
  const b64 = Buffer.from(JSON.stringify(sauvegarde), 'utf8').toString('base64');
  const { ctx, page, fr } = await ouvrir({
    cloud: {'batcave-goals': {poids:'63.7'}},
    files: [
      {id:'f_vieux', title:'batcave-sauvegarde-auto-2026-08-30.json', createdTime:'2026-08-30T10:00:00Z'},
      {id:'f_recent', title:'batcave-sauvegarde-auto-2026-09-02.json', createdTime:'2026-09-02T10:00:00Z'},
    ],
    b64,
  });
  await fr.evaluate(() => { document.querySelector('.backup-trigger').click(); document.getElementById('drive-restore-btn').click(); });
  await page.waitForTimeout(600);
  const appels = await fr.evaluate(() => window.__dl || []);
  const dl = appels.find(a => a.tool === 'download_file_content');
  ok(appels.some(a => a.tool === 'search_files'), 'les sauvegardes Drive sont recherchées');
  ok(dl && dl.input.fileId === 'f_recent', 'la PLUS RÉCENTE est choisie : ' + (dl && dl.input.fileId));
  await fr.evaluate(() => { const b = document.getElementById('ask-ok'); if(b) b.click(); });
  await page.waitForTimeout(500);
  const w = await fr.evaluate(() => window.__w || []);
  const lim = w.filter(x => x.path === 'state/batcave-budget-limits').pop();
  ok(!!lim, 'la sauvegarde téléchargée est restaurée puis poussée au cloud');
  /* le décodage base64 doit être UTF-8 : « Électricité » ressortait en mojibake */
  ok(lim && lim.v && lim.v['Eau & Électricité'] === 60,
     'les accents survivent au décodage : ' + JSON.stringify(lim && lim.v));
  await ctx.close();
}

console.log('\n== 75) Restaurer depuis un FICHIER, sans aucun connecteur ==');
{
  /* Scénario réel : l'artifact a disparu, l'utilisateur ouvre son .html local.
     window.claude n'existe pas → aucun bouton Drive. Le sélecteur de fichier doit
     rester le chemin de secours, et fonctionner totalement hors ligne. */
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { try{ delete window.claude; }catch(e){} window.claude = undefined; });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.clock.install({ time: new Date('2026-09-02T09:30:00+02:00') });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#backup-import').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
  await page.waitForTimeout(400);

  const etat = await fr.evaluate(() => {
    document.querySelector('.backup-trigger').click();
    return {
      driveCache: document.getElementById('drive-backup-row').hidden,
      fichierVisible: !document.getElementById('backup-file-btn').closest('.card-actions').hidden,
    };
  });
  ok(etat.driveCache, 'sans connecteur, la rangée Drive reste masquée');
  ok(etat.fichierVisible, 'le bouton « Restaurer depuis un fichier » reste disponible');

  const sauvegarde = {
    'batcave-fixed-charges': [{id:'fc1', label:'Loyer', montant:700, cat:'Logement'},
                              {id:'fc5', label:'Eau + Électricité', montant:70, cat:'Eau & Électricité'}],
    'batcave-goals': {poids:'61.0'},
  };
  await fr.setInputFiles('#backup-file', {
    name: 'batcave-sauvegarde-auto-2026-09-04.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sauvegarde, null, 2), 'utf8'),
  });
  await page.waitForTimeout(400);
  const dlg = await fr.evaluate(() => {
    const ov = document.getElementById('ask-overlay');
    return { visible: ov && !ov.hidden, texte: ov ? ov.innerText.replace(/\s+/g,' ') : '' };
  });
  ok(dlg.visible && /2 entrée/.test(dlg.texte), 'une confirmation explicite s\'affiche avant d\'écraser : ' + dlg.texte.slice(0, 90));

  await fr.evaluate(() => document.getElementById('ask-ok').click());
  await page.waitForTimeout(500);
  const restaure = await fr.evaluate(() => ({
    charges: JSON.parse(localStorage.getItem('batcave-fixed-charges') || 'null'),
    poids: JSON.parse(localStorage.getItem('batcave-goals') || '{}').poids,
  }));
  ok(restaure.charges && restaure.charges.length === 2, 'les charges fixes sont restaurées : ' + JSON.stringify(restaure.charges && restaure.charges.map(c=>c.label)));
  ok(restaure.charges && restaure.charges[1].label === 'Eau + Électricité', 'accents intacts depuis le fichier : ' + (restaure.charges && restaure.charges[1].label));
  ok(restaure.poids === '61.0', 'les autres clés aussi : poids = ' + restaure.poids);
  await ctx.close();
}

console.log('\n== 75 bis) Un fichier invalide ne casse rien et le dit ==');
{
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
  await ctx.addInitScript(() => { window.claude = undefined; });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
  await page.goto(URL);
  await page.frameLocator('#f').locator('#backup-import').waitFor({ state:'attached', timeout:15000 });
  const fr = page.frames().find(x => x.url().includes('batcave.html'));
  await page.waitForTimeout(300);
  await fr.evaluate(() => { document.querySelector('.backup-trigger').click(); });
  await fr.setInputFiles('#backup-file', { name:'photo.json', mimeType:'application/json', buffer: Buffer.from('pas du json{{', 'utf8') });
  await page.waitForTimeout(400);
  const st = await fr.evaluate(() => ({
    msg: document.getElementById('backup-file-status').textContent,
    dialogue: !document.getElementById('ask-overlay').hidden,
  }));
  ok(/JSON valide/.test(st.msg), 'message clair sur un fichier invalide : ' + st.msg);
  ok(!st.dialogue, 'aucune confirmation d\'écrasement n\'est proposée');
  await ctx.close();
}

await browser.close();
console.log(errs === 0 ? '\nTOUS LES TESTS OK' : `\nERREURS: ${errs}`);
process.exit(errs === 0 ? 0 : 1);
