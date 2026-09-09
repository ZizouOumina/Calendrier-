/* Jeu de données de six mois, rejoué avant chaque publication (R16).
   Déterministe : même graine, mêmes chiffres — un écart de performance ou de rendu
   vient du code, jamais du hasard. Six mois de journal, de repas, de sport, de
   sessions au minuteur, d'habitudes, de budget et de business. */
const JOURS = 180;
export const FIN = '2027-03-10';          /* quatre jours avant la fin de l'horizon */
export const DEBUT = decale(FIN, -(JOURS - 1));

function iso(d){ return d.toISOString().slice(0, 10); }
export function decale(i, n){ const d = new Date(i + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
/* générateur pseudo-aléatoire déterministe (mulberry32) */
function alea(graine){ let a = graine; return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function jeu180(){
  const r = alea(20260914), S = {}, jours = [];
  for(let i = 0; i < JOURS; i++) jours.push(decale(DEBUT, i));

  const MATIERES = ['Anatomía I','Bioquímica','Microbiología','Psicología','Anatomía II'];
  const sessions = [], revision = [], projets = [], espagnol = [], txs = [], habitlog = {};
  const HABITS = ['core-lit','core-etirements','core-fajr','core-dhuhr','core-asr','core-maghrib','core-isha',
                  'core-ecran','core-sadaqah','core-revue','core-famille','core-marche','core-gratitude',
                  'core-es-conversacion','core-es-formulas','core-es-lectura'];
  HABITS.forEach(h => habitlog[h] = []);
  habitlog['core-courses'] = [];

  jours.forEach((j, i) => {
    const dow = new Date(j + 'T00:00:00Z').getUTCDay();
    const ms = Date.parse(j + 'T00:00:00Z');
    /* révision : deux à quatre blocs par jour, un peu moins le dimanche */
    const nRev = dow === 0 ? 1 + Math.floor(r() * 2) : 2 + Math.floor(r() * 3);
    let total = 0;
    for(let k = 0; k < nRev; k++){
      const duree = [25, 50, 55][Math.floor(r() * 3)];
      const debut = ms + (7 + k * 2) * 3600000;
      const mat = MATIERES[Math.floor(r() * MATIERES.length)];
      sessions.push({id:'s' + i + '-' + k, date:j, type:'cours', label:mat, duree:duree, debut:debut, fin:debut + duree * 60000});
      total += duree;
    }
    revision.push({id:'r' + i, date:j, duree:total, matieres:{[MATIERES[i % MATIERES.length]]: total}});
    /* projets et espagnol */
    if(r() > 0.35){
      const d = 55, debut = ms + 13 * 3600000;
      const es = r() > 0.5;
      sessions.push({id:'p' + i, date:j, type:'projet', label: es ? 'Español · gramática' : 'Boutique Shopify', duree:d, debut:debut, fin:debut + d * 60000});
      if(es) espagnol.push({id:'e' + i, date:j, duree:d, activite:'Gramática'});
      else projets.push({id:'pr' + i, date:j, duree:d, projet:'Boutique Shopify'});
    }
    /* journal, repas, sport */
    S['batcave-journal-' + j] = {sommeil: Math.round((6.6 + r() * 2) * 10) / 10, water: 1500 + Math.round(r() * 1800), mood: 2 + Math.floor(r() * 4),
                                 poids: Math.round((64 + i * 0.03 + r() * 0.4) * 10) / 10, notes: i % 7 === 0 ? 'Semaine ' + (1 + Math.floor(i / 7)) : '',
                                 complements: r() > 0.5 ? ['Vitamine D'] : [], coran: String(1 + i), duaa: i % 5 === 0 ? 'duaa ' + i : ''};
    S['batcave-meals-' + j] = {'petit-dej':true, 'dejeuner':true, 'collation': r() > 0.4, 'diner': r() > 0.15};
    S['batcave-sport-' + j] = {'0-0': r() > 0.2, '0-1': r() > 0.3, '0-2': r() > 0.4, '1-0': r() > 0.5};
    /* habitudes : ~85 % tenues, la revue un peu moins */
    HABITS.forEach(h => { if(r() > (h === 'core-revue' ? 0.35 : 0.15)) habitlog[h].push(j); });
    if(dow === 6 && r() > 0.2) habitlog['core-courses'].push(j);
    /* budget : une dépense variable tous les deux jours, la bourse le 1er */
    if(r() > 0.5) txs.push({id:'t' + i, date:j, type:'Dépense', categorie:'Courses', montant: Math.round(10 + r() * 40), fixed:false});
    if(j.slice(8) === '01') txs.push({id:'in' + i, date:j, type:'Revenu', categorie:'Bourse', montant:900, fixed:false});
  });

  S['batcave-sessions'] = sessions;
  S['batcave-revision'] = revision;
  S['batcave-projets'] = projets;
  S['batcave-espagnol'] = espagnol;
  S['batcave-transactions'] = txs;
  S['batcave-habitlog'] = habitlog;
  S['batcave-addictions'] = {snus:{start:DEBUT, record:120, log:[]}, masturbation:{start:DEBUT, record:60, log:[]},
                             malbouffe:{start:decale(FIN, -40), record:40, log:[{date:decale(FIN, -40)}]}, sucreries:{start:DEBUT, record:90, log:[]}};
  S['batcave-taches'] = [{id:'tk1', text:'Rendre le compte rendu de TP', due: decale(FIN, 2), priority:'Haute', status:'À faire'},
                         {id:'tk2', text:'Commander les brackets', due: decale(FIN, -3), priority:'Moyenne', status:'À faire'}];
  S['batcave-business'] = [{id:'b1', moisISO:'2026-10', mois:'Oct. 2026', ca:900, couts:600, benef:300},
                           {id:'b2', moisISO:'2026-11', mois:'Nov. 2026', ca:1600, couts:900, benef:700},
                           {id:'b3', moisISO:'2026-12', mois:'Déc. 2026', ca:2400, couts:1200, benef:1200}];
  /* deux partiels passés, un à venir : la carte « Matière et partiel » a de quoi dire */
  S['batcave-examens'] = {'Anatomía I':'2027-01-20', 'Bioquímica':'2027-01-27', 'Microbiología': decale(FIN, 21)};
  S['batcave-coran'] = [{id:'c1', date: DEBUT, page:1}, {id:'c2', date: FIN, page:180}];
  S['batcave-duaas'] = [{id:'d1', date: DEBUT, texte:'Duaa du voyage'}];
  S['batcave-revue'] = [{id:'rv1', date: decale(FIN, -7), marche:'Anki tenu', coince:'Le sommeil', ajust:'Coucher 21:45'}];
  return S;
}
