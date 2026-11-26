#!/usr/bin/env python3
"""Le plan de rattrapage des temas, écrit dans la Batcave (RATTRAPAGE_TEMAS).

26 novembre 2026, ses mots : « fais moi un plan pour rattraper les cours », « j'ai pas touché un cours depuis le début
de l'année », « il faut que je rattrape les temas tout en gardant la période d'espagnol dans ma journée », puis « on va
commencer le rattrapage samedi ».

Le plan remplit les blocs d'étude et de projets de la grille RÉELLE (grilles.json, extraite par grilles.mjs avec sa
sauvegarde), jamais l'espagnol, ni la clôture du cours, ni la préparation d'une veille d'échéance :
  1. ce qu'une échéance datée demande passe ce jour-là (FORCE) ;
  2. le reste suit la file, dans l'ordre des examens (Anatomía, Epidemiología, Biología, un tema court d'Antropología
     sur quatre) ;
  3. un tema donné en cours après le départ entre dans la file le lendemain (ARRIVEES).
1 h 30 par tema, 40 min en Antropología ; 15 min d'Anki chaque matin dès le deuxième jour.

    python3 outils/rattrapage/plan.py            # écrit les entrées entre les deux repères de batcave.html
    python3 outils/rattrapage/plan.py --voir     # montre le plan sans rien écrire

Pour le régénérer (un départ qui bouge, des temas déjà faits) : changer DEBUT, retirer de FILE ce qui est fait, relancer
grilles.mjs puis ce script, puis ré-extraire les semaines du guide (outils/semaine/LISEZMOI.md).
"""
import json, os, sys

ICI = os.path.dirname(os.path.abspath(__file__))
BATCAVE = os.path.join(ICI, '..', '..', 'batcave.html')
G = json.load(open(os.path.join(ICI, 'grilles.json'), encoding='utf-8'))

DEBUT = '2026-11-28'          # le samedi 28, le jour 1
FILE_DES = '2026-12-01'       # avant : seulement les échéances de la semaine (le système nerveux, la génétique)
PRIS = {'Anki 1', 'Anki 2', 'Anki matinal', 'Étudier en avance', 'Question ouverte ou autre', 'Lire', 'Approfondir',
        "Cartes d'erreurs de la semaine", 'Simulation dentaire', 'Réexpliquer', 'Projets perso 3', 'Projets perso matinal'}
mn = lambda h: int(h[:2]) * 60 + int(h[3:])
hm = lambda m: '%02d:%02d' % (m // 60, m % 60)

AN = {'1.1': 'Homeostasis I', '1.2': 'Homeostasis II', '2.1 I': 'Fisiología de la sangre I', '2.1 II': 'Fisiología de la sangre II',
      '2.2': 'Coagulación', '2.3': 'Tipos de sangre', '3.1 a': 'Introducción a la histología', '3.1 b': 'Tejido epitelial',
      '3.2': 'Tejido conjuntivo', '4 I': 'Piel I', '4 II': 'Piel II', '5': 'Introducción a la anatomía', '6.1': 'Sistema esquelético I',
      '6.2': 'Sistema esquelético II', '6.3': 'Tejido óseo y cartilaginoso', '10.1': 'Sistema nervioso I', '10.2': 'Sistema nervioso II',
      '11': 'Tejido nervioso', '12.1': 'Potencial de acción', '12.2': 'Transmisión sináptica', '13.1': 'Sistema somatosensorial',
      '13.2': 'Sistema nervioso autónomo', '7': 'Sistema muscular', '8': 'Tejido muscular',
      '9.1': 'Fisiología del músculo esquelético', '9.2': 'Fisiología del músculo cardíaco y liso'}
BI = {'1': 'Introducción a la Biología Celular', '2': 'Membrana plasmática', '3': 'Citoesqueleto', '4': 'Síntesis y degradación de proteínas',
      '5': 'Sistema de endomembranas', '6': 'Mitocondria', '7': 'El núcleo interfásico', '8': 'Mitosis', '9': 'Meiosis',
      '10': 'Aspectos generales de la genética humana', '11': 'Herencia mendeliana', '12': 'Transmisión de caracteres mendelianos',
      '13': 'Polimorfismos genéticos', '14': 'Técnicas de análisis en genética humana'}
EP = {'1': 'Concepto de salud y determinantes', '2': 'Demografía estática', '3': 'Demografía dinámica', '4': 'Sistemas de información sanitaria',
      '5': 'Introducción a la estadística', '6': 'Medidas de asociación y contraste de hipótesis', '7': 'Epidemiología descriptiva',
      '8': 'Estudios de casos y controles', '9': 'Estudios de morbilidad y mortalidad', '10': 'Estudios de cohortes',
      '11': 'Ensayos clínicos', '12': 'Inmunización activa y pasiva', '13': 'Enfermedades transmisibles', '14': 'Transmisión intestinal', '15': 'VIH',
      '16': 'Hepatitis', '17': 'Transmisión aérea, tuberculosis y gripe', '19': 'Cáncer', '20': 'Diabetes y obesidad',
      '21': 'Enfermedades cardiovasculares y neurodegenerativas'}
AT = {'1': 'Introducción a la Antropología', '2': 'Los modelos asistenciales', '3': 'La ética profesional', '4': 'Paleodontología y paleopatologías',
      '5': 'La Antigüedad', '6': 'La Edad Media', '7': 'El Renacimiento', '8': 'El siglo XVIII', '9': 'El siglo XIX', '10': 'El siglo XX'}
def an(k): return {'nom': 'Anatomía ' + k.replace(' a', ' (introducción)').replace(' b', ' (epitelial)'), 'det': AN[k], 'min': 90, 'tema': True}
def bi(k): return {'nom': 'Biología ' + k, 'det': BI[k], 'min': 90, 'tema': True}
def ep(k): return {'nom': 'Epidemiología ' + k, 'det': EP[k], 'min': 90, 'tema': True}
def at(k): return {'nom': 'Antropología ' + k, 'det': AT[k] + ', version courte', 'min': 40, 'tema': True}
def x(nom, det, m): return {'nom': nom, 'det': det, 'min': m, 'tema': False}
ANKI = lambda: x('Anki', 'les cartes des jours d’avant', 15)

# Ce que les échéances demandent, au jour dit (cronogramas de le-semestre.html et ses échéances saisies dans la Batcave)
FORCE = {
 '2026-11-28': [at('4'), x('Actividad 1 d’Antropología', 'à rendre avant le lundi 30 sur Canvas (10 %) : lis la consigne, identifie et interprète les restes, cite tes sources, puis rends-la. Déjà rendue : prends le tema suivant', 120), an('10.1'), an('10.2')],
 '2026-11-29': [an('11'), an('12.1'), an('12.2'), an('13.1')],
 '2026-11-30': [an('13.2'), bi('10'), bi('11'), bi('12')],
 '2026-12-01': [x('Láminas 3', 'celles de demain, le sistema muscular : les planches du cours sur Canvas, nomme chaque muscle sans regarder la légende', 50),
                x('Cuestionario 3 d’Anatomía', 'celui de demain : T10 à T13 de tête sur une feuille, puis vérifiés dans le cours', 60)],
 '2026-12-02': [x('Cuestionario 3 d’Anatomía', 'celui de cet après-midi : dernier passage, tes cartes de T10 à T13', 45)],
 '2026-12-03': [at('7'), at('8'), at('9')],
 '2026-12-04': [x('Cuestionario d’Antropología', 'celui de cet après-midi : T7 à T9 de tête, puis vérifiés ; le T10 est donné aujourd’hui, parcours ses diapos si elles sont sur Canvas', 45)],
 '2026-12-05': [an('7'), an('8')],
 '2026-12-10': [x('Actividad 5 d’Antropología', 'le jeu historique, en groupe (15 %, à rendre avant le 15) : ta part, et un message au groupe. Déjà faite : prends le tema suivant', 60)],
 '2026-12-12': [an('9.1'), an('9.2')],
 '2026-12-13': [x('Problemas de genética', 'ceux du séminaire du 1er, refaits sans regarder la correction : l’évaluation est mardi (15 %)', 60)],
 '2026-12-14': [x('Problemas de genética', 'un dernier entraînement : trois problèmes, réponses courtes et justifiées, comme demain', 60)],
 '2026-12-15': [x('Cuestionario 4 d’Anatomía', 'celui de demain : T7 à T9 de tête sur une feuille, puis vérifiés dans le cours', 60)],
 '2026-12-16': [x('Cuestionario 4 d’Anatomía', 'celui de cet après-midi : dernier passage, tes cartes de T7 à T9', 45)],
 '2026-12-17': [x('Actividad 3 d’Antropología', 'les casos éticos (10 %), à rendre avant demain sur Canvas. Déjà rendue : prends le tema suivant', 60)],
}
# Ce que la journée a de particulier : dit dans le premier bloc
NOTE = {
 '2026-11-28': 'L’Actividad 1 d’Antropología se rend avant lundi : elle passe ce matin. Puis le système nerveux : le cuestionario 3 d’Anatomía (T10 à T13) est mercredi.',
 '2026-11-29': 'Le système nerveux toute la journée : le cuestionario 3 d’Anatomía (T10 à T13) est mercredi.',
 '2026-11-30': 'La génétique de Biología avant le séminaire de demain, 15:30.',
 '2026-12-01': 'Biología 12 finie avant le séminaire de 15:30 ; puis les láminas et le cuestionario 3 de demain.',
 '2026-12-02': 'Le cuestionario 3 et les láminas 3 d’Anatomía sont à 17:30 : un dernier passage ce matin.',
 '2026-12-03': 'Antropología 7 à 9 : le cuestionario T7 à T10 est demain, 17:30.',
 '2026-12-04': 'Le cuestionario d’Antropología est à 17:30 : T7 à T9 de tête ce matin.',
 '2026-12-05': 'Anatomía 7 et 8, données mercredi et jeudi : le cuestionario 4 (T7 à T9) est le 16 décembre.',
 '2026-12-10': 'Le jeu historique d’Antropología (actividad 5, 15 %) se rend avant le 15 : ta part ce matin.',
 '2026-12-12': 'Anatomía 9.1 et 9.2, données mercredi et jeudi : le cuestionario 4 (T7 à T9) est mercredi.',
 '2026-12-13': 'L’évaluation des problèmes de génétique (15 %) est mardi : une heure d’entraînement.',
 '2026-12-14': 'Demain, 15:30 : l’évaluation des problèmes de génétique. Un dernier entraînement.',
 '2026-12-15': 'Demain : le simulacro de Biología à 15:30 et le cuestionario 4 d’Anatomía à 17:30.',
 '2026-12-16': 'Le cuestionario 4 d’Anatomía est à 17:30 : un dernier passage ce matin.',
 '2026-12-17': 'L’actividad 3 d’Antropología (10 %) se rend avant demain.',
}
# Les temas donnés en cours après le départ : dans la file le lendemain du cours (Anatomía 7 à 9 sont dans FORCE)
ARRIVEES = {
 '2026-12-03': [bi('13')], '2026-12-04': [ep('16')], '2026-12-05': [ep('17'), at('10')],
 '2026-12-10': [bi('14')], '2026-12-11': [ep('19')], '2026-12-12': [ep('20')], '2026-12-18': [ep('21')],
}
# La file au départ : ce qui a été donné avant le 27 novembre et qu'aucune échéance ne réclame à une date précise
A = [an(k) for k in ['1.1', '1.2', '2.1 I', '2.1 II', '2.2', '2.3', '3.1 a', '3.1 b', '3.2', '4 I', '4 II', '5', '6.1', '6.2', '6.3']]
E = [ep(k) for k in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']]
B = [bi(k) for k in ['1', '2', '3', '4', '5', '6', '7', '8', '9']]
T = [at(k) for k in ['1', '2', '3', '5', '6']]

def construire():
    file = []
    a, e, b, t = list(A), list(E), list(B), list(T)
    while a or e or b or t:
        for L in (a, e, b):
            if L: file.append(L.pop(0))
        if t and len(file) % 4 == 3: file.append(t.pop(0))
        if not (a or e or b) and t: file.append(t.pop(0))
    jours = [d for d in sorted(G) if d >= DEBUT]
    plan, finis, reste = {}, {}, None
    for k, iso in enumerate(jours):
        file += ARRIVEES.get(iso, [])
        blocs = [(mn(h), mn(f), lab) for h, f, lab in G[iso] if lab in PRIS]
        a_faire = ([ANKI()] if k > 0 else []) + list(FORCE.get(iso, []))
        if reste: a_faire.insert(1 if a_faire and a_faire[0]['nom'] == 'Anki' else 0, reste); reste = None
        if not (a_faire[1:] if k > 0 else a_faire) and not file: break          # plus rien à rattraper : la grille ordinaire revient
        segs, i, t0 = {lab: [] for _, _, lab in blocs}, 0, 0
        while i < len(blocs):
            deb, fin, lab = blocs[i]
            t0 = max(t0, deb)
            if t0 >= fin: i += 1; continue
            if not a_faire:
                if iso >= FILE_DES and file: a_faire.append(file.pop(0))
                elif iso >= FILE_DES: break                                       # la file est vide : les blocs suivants gardent leur consigne
                else:
                    segs[lab].append({'nom': 'Marge', 'det': 'tes cartes du jour dans Anki, et ce qui a pris du retard', 'de': t0, 'a': fin, 'suite': False, 'fin_de': False}); t0 = fin; continue
            it = a_faire[0]
            dispo = fin - t0
            if dispo < 20 and it['min'] > dispo and not it.get('_entame'):       # on ne commence pas un morceau de moins de 20 min
                segs[lab].append({'nom': 'Marge', 'det': 'tes cartes du jour dans Anki', 'de': t0, 'a': fin, 'suite': False, 'fin_de': False}); t0 = fin; continue
            pris = min(dispo, it['min'])
            segs[lab].append({'nom': it['nom'], 'det': it['det'], 'de': t0, 'a': t0 + pris, 'suite': pris < it['min'], 'fin_de': bool(it.get('_entame')), 'tema': it['tema']})
            t0 += pris; it['min'] -= pris
            if it['min'] <= 0: a_faire.pop(0)
            else: it['_entame'] = True
        if a_faire:                                                               # ce qui déborde passe à demain, en tête
            reste = a_faire[0] if a_faire[0]['min'] > 0 else None
            for y in reversed(a_faire[1:]): file.insert(0, y)
        plan[iso] = {lab: L for lab, L in segs.items() if L}
        finis[iso] = [s['nom'] for L in segs.values() for s in L if s.get('tema') and not s['suite']]
    return plan, finis, [y['nom'] for y in file] + ([reste['nom']] if reste else [])

def de(n): return ("d’" if n[0] in 'AEIOUÁÉÍÓÚaeiou' else 'de ') + n

def entrees(plan, finis):
    jours, out = sorted(plan), []
    for k, iso in enumerate(jours, 1):
        blocs, labs, lignes = plan[iso], list(plan[iso]), []
        for bi_, lab in enumerate(labs):
            segs, noms = blocs[lab], []
            for s in segs:
                if s['nom'] in ('Marge', 'Anki'): continue
                n = s['nom'] + ((' (suite)' if s['suite'] else ' (fin)') if s['fin_de'] else '')
                if n not in noms: noms.append(n)
            if not noms: noms = ['Anki' if any(s['nom'] == 'Anki' for s in segs) else 'Marge']
            phrases = []
            if bi_ == 0:
                n = len(finis[iso])
                phrases.append('Rattrapage, jour %d sur %d : %s aujourd’hui, {MINUTEUR} au minuteur.' % (k, len(jours), ('%d tema%s fini%s' % (n, 's' if n > 1 else '', 's' if n > 1 else '')) if n else 'les échéances d’abord'))
                if NOTE.get(iso): phrases.append(NOTE[iso])
            for s in segs:
                plage = hm(s['de']) + ' → ' + hm(s['a'])
                if s['nom'] == 'Marge': phrases.append(plage + ' : marge, ' + s['det'] + '.')
                elif s['nom'] == 'Anki': phrases.append(plage + ' : Anki, ' + s['det'] + '.')
                elif s['fin_de'] and s['suite']: phrases.append(plage + ' : la suite ' + de(s['nom']) + ' (la fin au bloc suivant).')
                elif s['fin_de']: phrases.append(plage + ' : la fin ' + de(s['nom']) + '.')
                else:
                    suite = (' (la suite au bloc suivant)' if bi_ < len(labs) - 1 else ' (la suite demain matin)') if s['suite'] else ''
                    phrases.append(plage + ' : ' + s['nom'] + ' · ' + s['det'] + suite + '.')
            txt = ' · '.join(noms[:3]) + ' — ' + ' '.join(phrases)
            lignes.append('%s: {t:%s%s}' % (json.dumps(lab, ensure_ascii=False), json.dumps(txt, ensure_ascii=False), ', p:1' if bi_ == 0 else ''))
        out.append('    %s: {%s}' % (json.dumps(iso), ',\n                   '.join(lignes)))
    return ',\n'.join(out)

if __name__ == '__main__':
    plan, finis, restants = construire()
    total = 0
    for iso in sorted(plan):
        total += len(finis[iso])
        print(iso, '· %d fini(s), %d en tout :' % (len(finis[iso]), total), ', '.join(finis[iso]))
        if '--voir' in sys.argv:
            for lab, L in plan[iso].items():
                print('     ', lab, '|', ' ; '.join(hm(s['de']) + '-' + hm(s['a']) + ' ' + ('fin ' if s['fin_de'] else '') + s['nom'] + (' →' if s['suite'] else '') for s in L))
    print(len(plan), 'jours ·', total, 'temas finis · restent', len(restants), restants)
    if '--voir' in sys.argv: sys.exit(0)
    js = entrees(plan, finis)
    s = open(BATCAVE, encoding='utf-8').read()
    a, b = '    /* <rattrapage-genere> */\n', '\n    /* </rattrapage-genere> */'
    if s.count(a) != 1 or s.count(b) != 1: raise SystemExit('repères <rattrapage-genere> introuvables dans batcave.html')
    i, j = s.index(a) + len(a), s.index(b)
    open(BATCAVE, 'w', encoding='utf-8').write(s[:i] + js + s[j:])
    print('écrit dans batcave.html :', len(js), 'caractères')
