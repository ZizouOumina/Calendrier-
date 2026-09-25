/* Donnees fictives partagees : six mois de saisies a partir du 24 septembre 2026, puis un
   journal allege jusqu'a la veille du point de controle. */
const z = n => String(n).padStart(2, '0');
export const isoDe = d => d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
export const plusJ = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDe(d); };
export const dow = s => new Date(s + 'T12:00:00').getDay();
/* heure d'ete europeenne : du dernier dimanche de mars au dernier dimanche d'octobre */
function dernierDimanche(annee, mois){ const d = new Date(annee, mois + 1, 0); d.setDate(d.getDate() - d.getDay()); return isoDe(d); }
export function decalage(s){ const a = Number(s.slice(0, 4)); return (s >= dernierDimanche(a, 2) && s < dernierDimanche(a, 9)) ? '+02:00' : '+01:00'; }
const ms = (s, hm) => new Date(s + 'T' + hm + ':00' + decalage(s)).getTime();
const DEBUT = '2026-09-24', COMBAT_FIN = '2027-01-24', PLEIN_J = 182;

export function seed(controle){
  const s = {}, veille = plusJ(controle, -1);
  const sessions = [], log = [], cardio = {}, hl = {}, tx = [], revues = [], livrables = {};
  ['core-lit', 'core-fajr', 'core-dhuhr', 'core-asr', 'core-maghrib', 'core-isha', 'core-creatine', 'core-revue', 'core-marche', 'core-ecran'].forEach(id => hl[id] = []);
  let k = 0;
  for(let d = DEBUT; d <= veille; d = plusJ(d, 1), k++){
    const j = dow(d), plein = k < PLEIN_J;
    const poids = Math.min(72.4, 64 + k * 0.045) + ((k % 3) - 1) * 0.15;
    s['batcave-journal-' + d] = {sommeil: String((6.7 + (k % 5) * 0.2).toFixed(1)), auLit: String((7.7 + (k % 5) * 0.2).toFixed(1)), poids: poids.toFixed(1), mood: 3 + (k % 3), water: (j === 1 || j === 2 || j === 3 || j === 5 ? 3500 : 2750) + (k % 2) * 250, coran: String(Math.min(604, 1 + k)), duaa: k % 7 === 0 ? 'duaa ' + (k / 7) : '', notes: k % 4 === 0 ? 'note du jour ' + k : '', complements: ['Créatine'], cloture: '21:' + z(5 + (k % 20)), pas: 7000 + (k % 9) * 400};
    const blocs = plein ? [['07:20', '08:20', 'cours', 'Anki 1'], ['08:20', '10:05', 'cours', 'Étudier en avance'], ['14:00', '15:00', 'projet', 'Español · gramática']] : [['07:20', '08:20', 'cours', 'Anki 1']];
    blocs.forEach((b, i) => { if(j === 0 && i === 2) return; sessions.push({id: 's' + k + '-' + i, date: d, debut: ms(d, b[0]), fin: ms(d, b[1]), duree: Math.round((ms(d, b[1]) - ms(d, b[0])) / 60000), type: b[2], label: b[3]}); });
    const seance = {1: ['Haut volume', 'Dips', 10], 2: ['Bas complet', 'Split squat bulgare', 8], 4: ['Haut lourd', 'Tractions', 6]}[j];
    if(seance && (plein || k % 7 === 4)){ const base = seance[2] + Math.floor(k / 21); log.push({id: 'l' + k, date: d, type: seance[0], exo: seance[1], series: [base, base, base - 1, base - 1], charge: k > 42 ? 1.25 * Math.floor((k - 42) / 21) : 0, unite: 'reps'}); }
    if(d <= COMBAT_FIN && d >= '2026-09-28' && (j === 1 || j === 2 || j === 3 || j === 5) && k % 9 !== 8) cardio[d] = {min: 90};
    if(j === 6 && k % 5 !== 4) cardio[d] = {min: 30};
    Object.keys(hl).forEach(id => {
      if(id === 'core-revue'){ if(j === 0) hl[id].push(d); return; }
      if(id === 'core-marche'){ if(k % 7 < 5) hl[id].push(d); return; }
      if(k % 6 !== 5) hl[id].push(d);
    });
    if(plein) s['batcave-meals-' + d] = {'0-0': true, '0-1': true, '0-2': true, '1-0': true, '1-1': true, '3-0': true};
    if(j === 6) tx.push({id: 'tx' + k, date: d, type: 'Dépense', categorie: 'Nourriture', montant: 44 + (k % 12), methode: 'Carte', label: 'Courses'});
    if(d.slice(8) === '01') tx.push({id: 'te' + k, date: d, type: 'Entrée', categorie: 'Aide familiale', montant: 800, methode: 'Virement', label: 'Mois'});
    if(d.slice(8) === '15' && plein) tx.push({id: 'tl' + k, date: d, type: 'Dépense', categorie: 'Loisirs', montant: 12, methode: 'Carte', label: 'Café'});
    if(j === 0 && plein){ const lundi = plusJ(d, -6); revues.push({id: 'rv' + k, date: lundi, marche: 'la routine du matin', coince: 'le sommeil du jeudi', ajust: 'coucher 21:30', constats: []}); livrables[lundi] = true; }
  }
  s['batcave-sessions'] = sessions; s['batcave-sport-log'] = log; s['batcave-cardio'] = cardio; s['batcave-habitlog'] = hl;
  s['batcave-transactions'] = tx; s['batcave-revue'] = revues; s['batcave-livrables'] = livrables;
  s['batcave-examens'] = {'Anatomía I': '2027-01-12', 'Bioquímica': '2027-01-14', 'Histología': '2027-01-18'};
  s['batcave-echeances'] = [{id: 'e1', date: '2026-10-06', type: 'questionnaire', matiere: 'Anatomía I', label: 'T1-3', fait: true}, {id: 'e2', date: '2026-11-18', type: 'tp', matiere: 'Biología', label: 'labo VL22', fait: true}, {id: 'e3', date: plusJ(controle, 3), type: 'rendu', matiere: 'Histología', label: 'Compte rendu', fait: false}];
  s['batcave-anki'] = {maj: veille + 'T20:00:00', source: 'manuel', paquets: {'Dentaire': {dus: 40 + (k % 30), nouvelles: 15, sangsues: 3}}, revues: 150 + (k % 60), sangsues: 3};
  s['batcave-last-manual-backup'] = veille; s['batcave-last-auto-backup'] = veille; s['batcave-last-restore-drill'] = plusJ(controle, -12);
  return s;
}

