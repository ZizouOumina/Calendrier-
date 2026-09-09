/* Pilote la saisie au pas de la séance du jour comme le ferait un doigt : les boutons
   + et − du nombre de séries, puis ceux de chaque série, puis le lest, puis « Enregistrer ».
   Le bloc se redessine à chaque appui : on le re-interroge à chaque tour, jamais de
   référence gardée sur un bouton. */
export async function saisirSeries(fr, reps, charge = 0, sel = '.sport-card.today .saisie'){
  return fr.evaluate(({sel, reps, charge}) => {
    const bloc = document.querySelector(sel);
    if(!bloc) throw new Error('bloc de saisie introuvable : ' + sel);
    const clic = q => { const b = bloc.querySelector(q); if(!b || b.disabled) return false; b.click(); return true; };
    const nb = () => bloc.querySelectorAll('.serie').length;
    const nombre = el => Number(String(el.textContent).replace(',', '.').replace(/[^\d.]/g, ''));
    let g = 0;
    while(nb() < reps.length && g++ < 20) if(!clic('[data-pas="nb"][data-d="1"]')) break;
    g = 0;
    while(nb() > reps.length && g++ < 20) if(!clic('[data-pas="nb"][data-d="-1"]')) break;
    const val = i => nombre(bloc.querySelectorAll('.serie')[i].querySelector('.v'));
    reps.forEach((cible, i) => {
      let k = 0;
      while(val(i) < cible && k++ < 400) if(!clic('[data-pas="rep"][data-i="' + i + '"][data-d="1"]')) break;
      k = 0;
      while(val(i) > cible && k++ < 400) if(!clic('[data-pas="rep"][data-i="' + i + '"][data-d="-1"]')) break;
    });
    if(bloc.querySelector('[data-pas="charge"]')){
      const kg = () => nombre(bloc.querySelector('[data-pas="charge"]').parentNode.querySelector('.v'));
      let k = 0;
      while(kg() < charge - 0.01 && k++ < 200) if(!clic('[data-pas="charge"][data-d="1"]')) break;
      k = 0;
      while(kg() > charge + 0.01 && k++ < 200) if(!clic('[data-pas="charge"][data-d="-1"]')) break;
    }
    bloc.querySelector('[data-valider]').click();
    return true;
  }, {sel, reps, charge});
}
/* « effacer » : retire la séance du jour pour cet exercice et décoche. */
export async function effacerSaisie(fr, sel = '.sport-card.today .saisie'){
  return fr.evaluate(s => {
    const b = document.querySelector(s).querySelector('[data-effacer]');
    if(!b) return false;
    b.click(); return true;
  }, sel);
}
/* Les valeurs actuellement affichées dans le bloc, en « 8/7/6 ». */
export async function valeursSaisie(fr, sel = '.sport-card.today .saisie'){
  return fr.evaluate(s => {
    const b = document.querySelector(s);
    if(!b) return null;
    return [...b.querySelectorAll('.serie .v')].map(v => v.textContent.trim()).join('/');
  }, sel);
}
