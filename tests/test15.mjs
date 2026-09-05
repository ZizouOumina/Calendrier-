import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8199/host.html';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };

const MOCK = () => {
  window.__watches = [];
  window.__meteo = { location:{localizedName:'Alicante'},
                     currentConditions:{ temperatureValue: 27, phrase:'Ensoleillé',
                                         extended:{ uv:{ value: 6 } } } };
  window.__previsions = { dailyForecast: [
    {dayOfWeek:'mercredi', day:{displayTemperature:'28°', iconPhrase:'Soleil', precip:'0%', extended:{uv:{value:7}}}},
    {dayOfWeek:'jeudi',    day:{displayTemperature:'26°', iconPhrase:'Nuages',  precip:'10%'}}
  ]};
  window.__spotify = { is_playing: false };
  const mcp = {
    callTool(server, tool, input, opts){ window.__calls = (window.__calls || []).concat([{server, tool, opts}]); if(tool === 'get_currently_playing') return Promise.resolve({content:[], payload: window.__spotify}); return Promise.resolve({content:[], payload:{}}); },
    watchTool(server, tool, input, handler){
      window.__watches.push(server + '/' + tool);
      window.__handlers = window.__handlers || {};
      window.__handlers[server + '/' + tool] = handler;
      Promise.resolve().then(() => {
        if(tool === 'widgets-current-claude') handler({type:'data', result:{payload: window.__meteo}});
        else if(tool === 'widgets-daily-claude') handler({type:'data', result:{payload: window.__previsions}});
        else if(tool === 'get_currently_playing') handler({type:'data', result:{payload: window.__spotify}});
        else handler({type:'error', error:{code:'server_not_connected', message:'x'}});
      });
      return () => {};
    },
    invalidate(){ return Promise.resolve(); }, listTools(){ return Promise.resolve({servers:[]}); }
  };
  window.claude = { use(n){ return Promise.resolve(n === 'mcp' ? mcp : null); } };
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, timezoneId:'Europe/Madrid', locale:'fr-FR' });
await ctx.addInitScript(MOCK);
const page = await ctx.newPage();
page.on('pageerror', e => { errs++; console.log('  PAGEERROR: ' + e.message); });
await page.clock.install({ time: new Date('2026-09-02T10:00:00+02:00') });
await page.goto(URL);
await page.frameLocator('#f').locator('#dash-temps').waitFor({ state:'attached', timeout:15000 });
const fr = page.frames().find(x => x.url().includes('batcave.html'));
await fr.evaluate(() => { const r = document.getElementById('ritual-dismiss'); if(r) r.click(); });
await page.waitForTimeout(400);

console.log('\n== 38) Toutes les surveillances de connecteurs sont branchées ==');
const attendues = [
  'AccuWeather®/widgets-current-claude',
  'AccuWeather®/widgets-daily-claude',
  'Spotify/get_currently_playing',
  'Shopify/get-shop-info',
  'Shopify/list-orders',
  'Shopify/run-analytics-query',
  'Google Calendar/list_events'
];
const w = await fr.evaluate(() => window.__watches);
attendues.forEach(function(a){
  ok(w.indexOf(a) > -1, a);
});
ok(w.length === attendues.length, 'aucune surveillance en trop ni en moins (' + w.length + '/' + attendues.length + ')');

console.log('\n== 39) La météo s\'affiche dans la ligne de statut ==');
const m = await fr.evaluate(() => ({
  txt: document.getElementById('dash-weather').textContent,
  cache: document.getElementById('dash-weather').hidden
}));
ok(m.cache !== true && /27°C/.test(m.txt), 'température : ' + m.txt);
ok(/UV 6/.test(m.txt) && /Ensoleillé/.test(m.txt) && /Alicante/.test(m.txt), 'UV, description et lieu : ' + m.txt);

console.log('\n== 40) Les prévisions 7 jours reviennent aussi ==');
await fr.evaluate(() => document.querySelector('.nav-btn[data-page="calendrier"]').click());
await page.waitForTimeout(250);
const f = await fr.evaluate(() => ({
  cache: document.getElementById('weather-forecast-panel').hidden,
  txt: document.getElementById('weather-forecast-content').innerText.replace(/\s+/g,' '),
  n: document.getElementById('weather-forecast-content').children.length
}));
ok(f.cache === false, 'le panneau de prévisions s\'affiche');
ok(f.n === 2 && /mercredi/i.test(f.txt) && /28°/.test(f.txt), '2 jours rendus : ' + f.txt.slice(0, 60));

console.log('\n== 41) Spotify : masqué à l\'arrêt, visible en lecture ==');
let sp = await fr.evaluate(() => document.getElementById('dash-spotify').hidden);
ok(sp === true, 'rien en lecture → la mention reste masquée (comportement voulu)');
await fr.evaluate(() => {
  /* forme REELLE du connecteur (observee sur une vraie lecture) : pas de is_playing / item /
     artists -- l'ancien test encodait une forme devinee, donc le bug. */
  window.__handlers['Spotify/get_currently_playing']({type:'data', result:{payload:
    { currently_playing_entity:{ name:'Nocturne', creator:'Chopin', creators:[{name:'Chopin'}], playback:{status:'PLAYABLE'} } }}});
});
await page.waitForTimeout(200);
sp = await fr.evaluate(() => ({ cache: document.getElementById('dash-spotify').hidden,
                                txt: document.getElementById('dash-spotify').textContent }));
ok(sp.cache === false && /Nocturne/.test(sp.txt) && /Chopin/.test(sp.txt), 'en lecture → ' + sp.txt);

console.log('\n== 42) Connecteur absent : message qui dit quoi faire ==');
await fr.evaluate(() => {
  window.__handlers['AccuWeather®/widgets-current-claude']({type:'error', error:{code:'needs_reauth', message:'x'}});
});
await page.waitForTimeout(200);
ok(/reconnecte AccuWeather/i.test(await fr.evaluate(() => document.getElementById('dash-weather').textContent)),
   'jeton expiré → invite à reconnecter');
await fr.evaluate(() => {
  window.__handlers['AccuWeather®/widgets-current-claude']({type:'error', error:{code:'server_not_connected', message:'x'}});
});
await page.waitForTimeout(200);
ok(/ajoute AccuWeather/i.test(await fr.evaluate(() => document.getElementById('dash-weather').textContent)),
   'connecteur absent → invite à l\'ajouter');

console.log('\n== Spotify : un clic sur ♫ actualise tout de suite ==');
{
  await fr.evaluate(() => { window.__spotify = {currently_playing_entity:{name:'Sicko Mode', creator:'Travis Scott', creators:[{name:'Travis Scott'}]}}; document.getElementById('bc-spotify').click(); });
  await page.waitForTimeout(200);
  const sp = await fr.evaluate(() => ({ txt: document.getElementById('dash-spotify').textContent, hidden: document.getElementById('dash-spotify').hidden, call: (window.__calls || []).filter(c => c.tool === 'get_currently_playing').pop() }));
  ok(sp.hidden === false && sp.txt === '🎵 Sicko Mode — Travis Scott', 'le titre en lecture apparaît sans attendre le sondage : ' + sp.txt);
  ok(!!sp.call && sp.call.opts && sp.call.opts.cache && sp.call.opts.cache.refresh === true, 'la lecture force le cache (refresh) au lieu de resservir l\'ancienne valeur');
  await fr.evaluate(() => { window.__spotify = {}; document.querySelector('.nav-btn[data-page="journal"]').click(); document.querySelector('.nav-btn[data-page="dashboard"]').click(); });
  await page.waitForTimeout(200);
  ok(await fr.evaluate(() => document.getElementById('dash-spotify').hidden) === true, 'revenir sur le tableau de bord relit aussi : plus rien en lecture → masqué');
}

console.log('\nERREURS: ' + errs);
await browser.close();
process.exit(errs ? 1 : 0);
