/* ===== Six mois de vie fictive, du 14 septembre 2026 au 14 mars 2027 =====

   Un jeu de donnees COMPLET et deterministe (meme graine, memes chiffres) qui rejoue le
   programme reel : les trois phases d'espagnol, les vacances de Noel relevees sur le
   portail (dernier cours le 22 decembre, retour le 7 janvier), une session de partiels,
   et surtout une PROGRESSION -- l'espagnol s'ameliore, les projets montent, le poids
   descend, les portes finissent par s'ouvrir.

   Il differe de jeu-180.mjs, qui remplit six mois de bruit pour mesurer la performance.
   Celui-ci raconte une trajectoire coherente : c'est ce qu'on veut verifier avant de
   confier six mois de sa vie a l'application.

   ATTENTION -- les dates d'examen ci-dessous sont INVENTEES. Le portail de l'universite
   ne publie pas encore le calendrier des examens du S1. Elles sont plausibles (semaine du
   18 janvier, juste avant la fin du semestre le 19) et servent uniquement a declencher le
   mode partiels dans le test. Ne jamais les recopier dans l'application. */

export const DEBUT = '2026-09-14';   /* PROGRAMME_DEBUT */
export const FIN   = '2027-03-14';   /* dernier jour de la phase Español 3 */

function iso(d){ return d.toISOString().slice(0, 10); }
export function decale(i, n){ const d = new Date(i + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
export function dow(i){ return new Date(i + 'T00:00:00Z').getUTCDay(); }
function alea(graine){ let a = graine; return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* Les vraies phases de PERIODES_GRILLE : le jeu doit les suivre, sinon on mesurerait
   une coherence qui n'existe pas. */
export const PHASES = [
  {id:'es-1', debut:'2026-09-14', fin:'2026-10-18'},
  {id:'es-2', debut:'2026-10-19', fin:'2026-11-29'},
  {id:'es-3', debut:'2026-11-30', fin:'2027-03-14'}
];
export function phaseDe(i){ return (PHASES.filter(p => i >= p.debut && i <= p.fin)[0] || {}).id || null; }

/* Vacances de Noel : releve du portail -- dernier cours le mardi 22 decembre,
   retour le jeudi 7 janvier. */
export const NOEL = {id:'v-noel', debut:'2026-12-23', fin:'2027-01-06', label:'Noël'};

/* INVENTE (voir l'avertissement en tete de fichier) : une session de partiels en janvier. */
export const EXAMENS = {
  'Documentación': '2027-01-18',
  'Biología Celular y Genética Humana': '2027-01-20',
  'Biología': '2027-01-22',
  'Anatomía I': '2027-01-25',
  'Epidemiología': '2027-01-27',
  'Antropología': '2027-01-29'
};

/* La note de cours attendue a cette date : 1,2 en septembre, 2,9 en mars. C'est ce qui
   fait bouger les portes -- sans progression, aucune ne s'ouvrirait jamais et on ne
   testerait que la moitie du mecanisme. */
export function niveauAttendu(i){
  const j = (Date.parse(i) - Date.parse(DEBUT)) / 86400000;
  return 1.2 + Math.min(1.7, j * 1.7 / 150);
}

export function vieFictive(){
  const r = alea(20260914), S = {};
  const jours = [];
  for(let d = DEBUT; d <= FIN; d = decale(d, 1)) jours.push(d);

  const MATIERES = ['Anatomía I','Biología','Bioquímica','Epidemiología','Antropología','Documentación'];
  const sessions = [], revue = [], coursSuivi = {}, habitlog = {}, txs = [], anki = [];
  const HABITS = ['core-lit','core-etirements','core-fajr','core-dhuhr','core-asr','core-maghrib','core-isha',
                  'core-ecran','core-sadaqah','core-revue','core-famille','core-marche',
                  'core-es-conversacion','core-es-formulas','core-es-lectura','core-courses'];
  HABITS.forEach(h => habitlog[h] = []);

  let poids = 78.0;
  jours.forEach((j, i) => {
    const w = dow(j), ms = Date.parse(j + 'T00:00:00Z');
    const vac = j >= NOEL.debut && j <= NOEL.fin;
    const ph = phaseDe(j);
    /* Pendant les partiels et les vacances, le rythme n'est pas le meme : c'est justement
       ce qu'on veut voir traverser l'application sans creer de fausse dette. */
    const partiels = j >= '2027-01-11' && j <= '2027-01-29';

    let n = 0;
    const pousser = (type, label, duree, heure) => {
      const debut = ms + heure * 3600000;
      sessions.push({id:'s' + i + '-' + (n++), date:j, type:type, label:label, duree:duree,
                     debut:debut, fin:debut + duree * 60000});
    };

    if(!vac){
      /* Revision : 3 a 5 blocs, davantage en partiels. */
      const nRev = partiels ? 5 + Math.floor(r() * 2) : (w === 0 ? 2 + Math.floor(r() * 2) : 3 + Math.floor(r() * 2));
      for(let k = 0; k < nRev; k++) pousser('cours', MATIERES[Math.floor(r() * MATIERES.length)], [25, 50, 55][Math.floor(r() * 3)], 7 + k);
      /* Espagnol et projets : la part d'espagnol suit la phase, exactement comme la grille.
         Phase 1 : tout. Phase 2 : trois quarts. Phase 3 : un bloc. */
      const nEs = partiels ? 1 : (ph === 'es-1' ? 3 + Math.floor(r() * 2) : ph === 'es-2' ? 2 + Math.floor(r() * 2) : 1);
      const nProj = partiels ? 0 : (ph === 'es-1' ? 0 : ph === 'es-2' ? 1 : 2 + Math.floor(r() * 2));
      const ACT = ['Español · gramática','Español · escribir','Español · hablar','Español · registro académico','Español · serie en VO'];
      for(let k = 0; k < nEs; k++) if(r() > 0.12) pousser('projet', ACT[Math.floor(r() * ACT.length)], 55, 13 + k);
      for(let k = 0; k < nProj; k++) if(r() > 0.18) pousser('projet', 'Boutique Shopify', 55, 19 + k);
    }

    /* Note de cours : uniquement les jours ou il y a cours (lun-ven hors vacances), autour
       du niveau attendu du jour, bornee 0-3. */
    if(!vac && w >= 1 && w <= 5 && r() > 0.08){
      coursSuivi[j] = Math.max(0, Math.min(3, Math.round(niveauAttendu(j) + (r() - 0.5) * 1.1)));
    }

    /* Journal : sommeil autour de 7 h 15, poids qui descend de 78 a 73, eau, humeur. */
    poids -= 0.028 + r() * 0.006;
    S['batcave-journal-' + j] = {
      sommeil: Math.round((6.9 + r() * 0.9) * 10) / 10,
      water: 1800 + Math.round(r() * 1400),
      mood: 2 + Math.floor(r() * 3),
      poids: Math.round(poids * 10) / 10,
      notes: w === 0 ? 'Bilan de la semaine ' + (1 + Math.floor(i / 7)) : '',
      complements: r() > 0.45 ? ['Vitamine D','Oméga 3'] : ['Vitamine D'],
      coran: String(1 + i), duaa: i % 4 === 0 ? 'Duaa du jour' : ''
    };
    S['batcave-meals-' + j] = {'petit-dej':true, 'dejeuner':true, 'collation': r() > 0.35, 'diner': r() > 0.1};
    /* Sport : lundi, mardi, jeudi, samedi -- les quatre jours ou la grille porte « Sport ». */
    if([1,2,4,6].indexOf(w) > -1 && !vac && r() > 0.12){
      S['batcave-sport-' + j] = {'0-0':true, '0-1':true, '0-2': r() > 0.2, '1-0': r() > 0.25, '1-1': r() > 0.3};
    }
    /* Habitudes : ~88 % tenues, la revue le dimanche seulement, les courses le samedi. */
    HABITS.forEach(h => {
      if(h === 'core-revue'){ if(w === 0 && r() > 0.15) habitlog[h].push(j); return; }
      if(h === 'core-courses'){ if(w === 6 && r() > 0.15) habitlog[h].push(j); return; }
      if(r() > 0.12) habitlog[h].push(j);
    });
    /* Anki : le nombre de cartes revues, en hausse. */
    if(!vac) anki.push({date:j, cartes: 120 + Math.round(i * 0.6 + r() * 60), minutes: 45 + Math.round(r() * 30)});
    /* Budget : bourse le 1er, depenses variables. */
    if(j.slice(8) === '01') txs.push({id:'in' + i, date:j, type:'Revenu', categorie:'Bourse', montant:950, fixed:false});
    if(r() > 0.55) txs.push({id:'t' + i, date:j, type:'Dépense', categorie: r() > 0.5 ? 'Courses' : 'Transport', montant: Math.round(8 + r() * 45), fixed:false});
    /* Bilan du dimanche : erreurs pour 100 mots qui descendent de 6,2 a 1,2. C'est le
       critere objectif des portes, sans lui aucune ne s'ouvre jamais. */
    if(w === 0){
      const err = Math.max(1.0, Math.round((6.2 - i * 5.0 / 180 + (r() - 0.5) * 0.5) * 10) / 10);
      revue.push({id:'rv' + i, date:j, marche:'Anki tenu', coince:'Le soir', ajust:'Coucher 21:45',
                  espanol:{errores: err, oral: Math.round((2 + i * 6 / 180) * 10) / 10, drill: 90 + Math.round(i * 0.5)}});
    }
  });

  S['batcave-sessions'] = sessions;
  S['batcave-cours-suivi'] = coursSuivi;
  S['batcave-habitlog'] = habitlog;
  S['batcave-transactions'] = txs;
  S['batcave-revue'] = revue;
  S['batcave-anki'] = anki;
  S['batcave-vacances'] = [NOEL];
  S['batcave-examens'] = EXAMENS;
  S['batcave-examens-heures'] = {'Anatomía I': {debut:'09:00', fin:'12:00'}};
  S['batcave-addictions'] = {
    /* Arret du snus le premier jour, une rechute le 12 novembre : la serie repart de la. */
    snus:{start:'2026-11-12', record: 59, log:[{date:'2026-11-12'}]},
    masturbation:{start:DEBUT, record:0, log:[]},
    malbouffe:{start:'2026-12-26', record:103, log:[{date:'2026-12-26'}]},
    sucreries:{start:DEBUT, record:0, log:[]}
  };
  S['batcave-taches'] = [
    {id:'tk1', text:'Rendre le travail de Documentación', due:'2027-01-15', priority:'Haute', status:'À faire'},
    {id:'tk2', text:'Commander le matériel de dissection', due:'2026-10-05', priority:'Moyenne', status:'Fait'},
    {id:'tk3', text:'Fournisseur : relancer pour les délais', due:'2027-02-01', priority:'Haute', status:'À faire'}
  ];
  S['batcave-business'] = [
    {id:'b1', moisISO:'2026-10', mois:'Oct. 2026', ca:0, couts:240, benef:-240},
    {id:'b2', moisISO:'2026-11', mois:'Nov. 2026', ca:430, couts:380, benef:50},
    {id:'b3', moisISO:'2026-12', mois:'Déc. 2026', ca:1250, couts:700, benef:550},
    {id:'b4', moisISO:'2027-01', mois:'Janv. 2027', ca:1900, couts:980, benef:920},
    {id:'b5', moisISO:'2027-02', mois:'Févr. 2027', ca:2600, couts:1300, benef:1300}
  ];
  /* Entrees completes : sourate, page, juz et statut. Une entree incomplete (vieille
     sauvegarde, import partiel) doit rester lisible -- c'est ce que verifie le test. */
  S['batcave-coran'] = [
    {id:'c1', date:DEBUT, sourate:'Al-Mulk', page:562, juz:29, statut:'mémorisée', revision:DEBUT},
    {id:'c2', date:'2026-11-01', sourate:'Ya-Sin', page:440, juz:22, statut:'en cours', revision:'2027-02-01'},
    {id:'c3', date:FIN, sourate:'Ar-Rahman', page:531, juz:27, statut:'à mémoriser', revision:null},
    /* volontairement amputee : elle ne doit pas afficher « undefined » */
    {id:'c4', date:'2026-12-01', page:1, revision:null}
  ];
  S['batcave-duaas'] = [{id:'d1', date:DEBUT, texte:'Duaa du voyage'}, {id:'d2', date:'2027-01-18', texte:'Duaa avant l\'examen'}];
  S['batcave-matieres'] = MATIERES;
  return S;
}
