#!/usr/bin/env python3
"""Analyse de la saison simulée (zz-saison.mjs) : chaque règle liste les jours qui la violent.
   python3 zz-saison.py <saison.json>"""
import json, sys, datetime as dt, collections

S = json.load(open(sys.argv[1], encoding='utf-8'))
J = S['jours']
d = lambda iso: dt.date.fromisoformat(iso)
regles = collections.OrderedDict()
def regle(nom): regles.setdefault(nom, []); return regles[nom]

# périodes sans cours ni programme habituel
NOEL = ('2026-12-23', '2027-01-06')

for j in J:
    iso, dow, lab = j['iso'], j['dow'], [x[6:] for x in j['grille']]
    hab = {h['id'] for h in j['hab']}
    rap = [r['h'] + ' ' + r['titre'] for r in j['rap']]
    # -- tous les jours
    if not any(l == 'Coucher' for l in lab): regle('chaque jour : un coucher').append(iso)
    if not any(l in ('Brossage de dents', 'Douche + brossage de dents') for l in lab): regle('chaque jour : le brossage du soir dans la grille').append(iso)
    if not any(l.startswith('Déjeuner') for l in lab): regle('chaque jour : un déjeuner').append(iso)
    if not any(l.startswith('Dîner') for l in lab): regle('chaque jour : un dîner').append(iso)
    vus = collections.Counter(j['grille'])
    if any(n > 1 for n in vus.values()): regle('aucun bloc en double').append(iso)
    if any(n > 1 for n in collections.Counter(rap).values()): regle('aucun rappel en double dans l’agenda').append(iso)
    if any('ERREUR' in x for x in j['grille'] + rap): regle('aucune erreur de calcul').append(iso)
    # -- le dimanche : batch, laverie, ménage, pesée
    if dow == 0:
        if '🍲 Batch cooking de la semaine' not in lab: regle('dimanche : le batch de 14:30').append(iso)
        if not j['batch'] or 'la laverie' not in j['batch']: regle('dimanche : la laverie (draps, taies, serviettes)').append(iso)
        if not j['menage']: regle('dimanche : le ménage').append(iso)
        elif 'retour de la laverie' in j['menage'] and not (j['batch'] and 'la laverie' in j['batch']): regle('pas de contradiction : « au retour de la laverie » sans laverie').append(iso)
        for h in ('core-pesee-dim', 'core-entretien-semaine', 'core-menage-dim', 'core-draps'):
            pass
        if 'core-entretien-semaine' not in hab: regle('dimanche : la case « Robot et aspirateur nettoyés »').append(iso)
        if j['menage'] and 'brosses démêlées' not in j['menage']: regle('dimanche : le ménage dit l’entretien du robot et de l’aspirateur').append(iso)
        if not any('Pesée à jeun' in r for r in rap): regle('dimanche : la notification de la pesée').append(iso)
    # -- le mardi : la seconde session de batch et la machine
    S2 = iso >= '2027-01-25'   # le second semestre : sa grille est provisoire (l'emploi du temps n'est pas encore donné)
    if dow == 2 and not (j['libre'] and 'deuxième session de batch' in j['libre']):
        regle('mardi : la seconde session de batch' + (' (second semestre, grille provisoire)' if S2 else '')).append(iso)
    coucher = next((x[:5] for x in j['grille'] if x[6:] == 'Coucher'), None)
    if coucher and coucher > '22:00': regle('une nuit d’au moins 7 h' + (' (second semestre, grille provisoire)' if S2 else '')).append(iso + ' ' + coucher)
    # -- le samedi : les courses et le rangement
    if dow == 6:
        if '🛒 Courses de la semaine' not in lab: regle('samedi : les courses').append(iso)
        if 'Rangement des courses' not in lab: regle('samedi : le rangement des courses').append(iso)

# -- les tâches périodiques : leur rythme, leur consigne, leur notification
PER = {  # id : (jour, cycle en semaines, où la consigne le dit, mot attendu, notification)
    'core-photos-dim': (0, 4, None, None, 'Photos'),
    'core-brosse-dents': (0, 12, None, None, 'Brosse à dents neuve'),
    'core-ongles': (0, 2, None, None, 'Ongles'),
    'core-rideau-douche': (0, 4, 'menage', 'rideau de douche', 'Rideau de douche'),
    'core-detartrage': (0, 4, 'menage', 'détartrage', 'Détartrage'),
    'core-entretien-mois': (0, 4, 'menage', "l'entretien du mois", 'Entretien du mois'),
    'core-machine-filtre': (0, 4, 'menage', 'la machine à laver : le petit filtre', 'Machine à laver'),
    'core-robot-filtre': (0, 8, 'menage', 'filtre du robot est neuf', 'Filtre du robot neuf'),
    'core-robot-brosse-laterale': (0, 16, 'menage', 'brosse latérale du robot est neuve', 'Brosse latérale du robot neuve'),
    'core-robot-brosses': (0, 36, 'menage', 'brosses principales du robot sont neuves', 'Brosses du robot neuves'),
    'core-aspi-pieces': (0, 16, 'menage', "filtre de l'aspirateur-serpillière sont neufs", "Pièces de l'aspirateur neuves"),
    'core-matelas': (0, 13, 'batch', 'le matelas tourné', 'Matelas'),
    'core-oreiller': (0, 16, 'batch', "l'oreiller aussi", 'Oreiller à la laverie'),
    'core-couette': (0, 26, 'batch', 'la couette dans un second sac', 'Couette à la laverie'),
    'core-frigo': (6, 4, 'rangement', "D'abord le frigo", 'Frigo'),
    'core-cheveux': (6, 3, 'courses', 'coiffeur', 'Coiffeur'),
}
dates = collections.defaultdict(list)
for j in J:
    for h in j['hab']:
        if h['id'] in PER: dates[h['id']].append(j['iso'])
calendrier = {}
for hid, (jour, cyc, ou, mot, notif) in PER.items():
    ds = dates.get(hid, [])
    calendrier[hid] = ds
    if not ds: regle('chaque tâche périodique tombe au moins une fois dans la saison').append(hid); continue
    for a in ds:
        if d(a).isoweekday() % 7 != jour: regle('chaque tâche périodique tombe le bon jour de la semaine').append(hid + ' ' + a)
    for a, b in zip(ds, ds[1:]):
        if (d(b) - d(a)).days != cyc * 7: regle('chaque tâche périodique garde son rythme').append(hid + ' ' + a + ' → ' + b)
    for j in J:
        texte = (j.get(ou) or '') if ou else ''
        due = j['iso'] in ds
        if ou and due and mot not in texte: regle('le jour d’une tâche, sa consigne la dit').append(hid + ' ' + j['iso'])
        if ou and not due and mot in texte and hid not in ('core-cheveux',): regle('pas de contradiction : une tâche dite un jour où elle ne tombe pas').append(hid + ' ' + j['iso'])
        if due and not any(notif in r['titre'] and '🔔' in r['titre'] for r in j['rap']): regle('le jour d’une tâche, l’agenda sonne').append(hid + ' ' + j['iso'])

print('Saison simulée : %d jours, du %s au %s · %d erreurs de page' % (len(J), J[0]['iso'], J[-1]['iso'], len(S['erreurs'])))
ko = 0
for nom, v in regles.items():
    print(('  ok  ' if not v else '  KO  ') + nom + ('' if not v else ' — ' + ', '.join(v[:8]) + (' …' if len(v) > 8 else '')))
    ko += bool(v)
nb = collections.Counter(len([r for r in j['rap'] if '🔔' in r['titre']]) for j in J)
print('\nNotifications de tâches par jour :', dict(sorted(nb.items())))
print('\nLe calendrier des tâches périodiques :')
for hid, ds in calendrier.items(): print('  %-28s %s' % (hid, ' '.join(x[5:] for x in ds)))
ko1 = sum(1 for nom, v in regles.items() if v and 'provisoire' not in nom)
ko2 = sum(1 for nom, v in regles.items() if v and 'provisoire' in nom)
print('\n' + ('PREMIER SEMESTRE : AUCUNE CONTRADICTION, RIEN D’OUBLIÉ' if not ko1 else str(ko1) + ' RÈGLE(S) À REVOIR') +
      ('' if not ko2 else ' · second semestre (grille provisoire) : ' + str(ko2) + ' point(s) à reprendre avec ton emploi du temps'))
sys.exit(1 if ko1 else 0)
