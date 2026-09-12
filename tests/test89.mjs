/* ===== 296) Le registre des clés, vérifié sur le code lui-même =====

   Trois listes gouvernent la vie des donnees, et rien ne les tenait alignees :

     CLES_CONNUES / PREFIXES_CONNUS  ce que le verificateur de coherence considere comme
                                     normal. Une cle absente = fausse alerte au demarrage.
     REINIT_GARDER                   ce que le nouveau depart conserve. Une cle de saisie
                                     ici = des donnees de septembre qui reviennent lundi.

   Le 12 septembre, cinq cles ecrites par le code manquaient au registre, dont deux qui
   sont gardees au nouveau depart -- l'alerte aurait donc survecu a la remise a zero.
   Ce test relit le SOURCE et refuse ce genre d'ecart. Il ne lance aucun navigateur :
   c'est de l'analyse statique, et c'est pour ca qu'il ne peut pas passer a cote. */
import { readFileSync } from 'fs';
let errs = 0;
const ok = (c,m) => { if(c) console.log('  ok  '+m); else { errs++; console.log('  FAIL '+m); } };
/* Les commentaires sont retires AVANT toute analyse, pour deux raisons. La premiere est
   une apostrophe francaise dans un commentaire (« l'alerte ») : elle s'apparie avec la
   quote suivante et decale la lecture de toute la liste qui suit -- c'est ce qui a fait
   echouer ce test a sa premiere execution, alors que le code etait juste. La seconde est
   qu'une cle seulement CITEE dans un commentaire n'est pas une cle ecrite. */
const src = readFileSync('../batcave.html', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

const liste = (nom) => {
  const d = src.indexOf('var ' + nom + ' = [');
  if(d < 0) return null;
  const f = src.indexOf('];', d);
  return [...src.slice(d, f).matchAll(/'([^']+)'/g)].map(x => x[1]);
};
const connues  = liste('CLES_CONNUES');
const prefixes = liste('PREFIXES_CONNUS');
const gardees  = liste('REINIT_GARDER');
const gpref    = liste('REINIT_PREFIXES_GARDER');
ok(connues && prefixes && gardees && gpref, 'les quatre listes sont lisibles dans le source');

const couverte = (k) => connues.includes(k) || prefixes.some(p => k.startsWith(p));

/* ----- 1) toute cle ECRITE par le code est couverte par le registre ----- */
const ecrites = new Set();
for(const m of src.matchAll(/save\(\s*'batcave-([a-z0-9-]+)'/g)) ecrites.add(m[1]);
for(const m of src.matchAll(/save\(\s*'batcave-([a-z0-9-]+)-?'\s*\+/g)) ecrites.add(m[1]);
for(const m of src.matchAll(/'batcave-([a-z0-9-]+-)'\s*\+/g)) ecrites.add(m[1]);
const nues = [...ecrites].filter(k => !couverte(k)).sort();
ok(nues.length === 0, nues.length === 0
  ? 'les ' + ecrites.size + ' clés écrites par le code sont toutes dans le registre'
  : 'clés écrites mais absentes du registre : ' + nues.map(k => 'batcave-' + k).join(', '));

/* ----- 2) toute cle GARDEE au nouveau depart est couverte ----- */
const gnues = gardees.filter(k => !couverte(k)).sort();
ok(gnues.length === 0, gnues.length === 0
  ? 'les ' + gardees.length + ' clés gardées au nouveau départ sont toutes dans le registre'
  : 'gardées mais absentes du registre : ' + gnues.map(k => 'batcave-' + k).join(', '));

/* ----- 3) aucune cle DATEE n'est gardee : ce serait une saisie qui survit ----- */
const DATEES = [/^journal-/, /^cal-/, /^meals-/, /^sport-\d/, /^gcal-2/, /^fc-logged-/, /^fixed-logged-/,
                /^manque-traite-/, /^rattrapage-vu-/, /^archive-/];
const datees = gardees.concat(gpref).filter(k => DATEES.some(r => r.test(k)));
ok(datees.length === 0, datees.length === 0
  ? 'aucune clé datée dans la liste des clés gardées — les saisies du quotidien partent toutes'
  : 'clés datées gardées par erreur : ' + datees.join(', '));

/* ----- 4) les decisions de calendrier, elles, DOIVENT etre gardees ----- */
const DECISIONS = ['vacances', 'jours-exclus', 'jours-sans-cours', 'portes', 'examens', 'examens-heures',
                   'journees', 'habits', 'fixed-charges', 'budget-limits', 'notion-url', 'copie-vierge'];
const perdues = DECISIONS.filter(k => !gardees.includes(k));
ok(perdues.length === 0, perdues.length === 0
  ? 'les ' + DECISIONS.length + ' décisions de configuration sont gardées : ' + DECISIONS.join(' · ')
  : 'décisions perdues au nouveau départ : ' + perdues.join(', '));

/* ----- 5) et les SAISIES, elles, doivent bien partir ----- */
const SAISIES = ['sessions', 'taches', 'transactions', 'addictions', 'habitlog', 'revue', 'sport-log',
                 'cours-suivi', 'espagnol', 'mesures', 'experiences', 'anki', 'insights-vu',
                 'chrono-seance', 'seance-duree', 'goals', 'coran', 'duaas'];
const restees = SAISIES.filter(k => gardees.includes(k));
ok(restees.length === 0, restees.length === 0
  ? 'les ' + SAISIES.length + ' catégories de saisie partent bien à la remise à zéro'
  : 'saisies gardées par erreur : ' + restees.join(', '));

console.log(errs ? '\n' + errs + ' ECHEC(S)' : '\nTOUT VERT');
process.exit(errs ? 1 : 0);
