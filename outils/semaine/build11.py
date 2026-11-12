import json, math
import os
SP = os.path.dirname(os.path.abspath(__file__)) + '/'   # ce dossier : les donnees lues, le gabarit ; la page sort a la racine du depot
# 11 novembre : « on commence tout tout tout demain jeudi 12 novembre » -- jour 1 le jeudi 12 ; la grille vient de la Batcave
# 12 novembre, 9 h : la viande jetee, « on commence tout demain petante » -- jour 1 le vendredi 13, trois jours
S = json.load(open(SP + 'grille11.json'))
S = [j for j in S if '2026-11-13' <= j['iso'] <= '2026-11-15']

def hh(m): return '%02d:%02d' % (m // 60, m % 60)
def mn(h): a, b = h.split(':'); return int(a) * 60 + int(b)

# ---------- heures de priere (Alicante, Ligue islamique mondiale 18/17, Asr standard) ----------
LAT, LNG, TZ = 38.3452, -0.4810, 1
def jd(y, m, d):
    if m <= 2: y -= 1; m += 12
    A = y // 100; B = 2 - A + A // 4
    return math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + d + B - 1524.5
def sun(j):
    D = j - 2451545.0
    g = math.radians((357.529 + 0.98560028 * D) % 360); q = (280.459 + 0.98564736 * D) % 360
    L = math.radians((q + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g)) % 360); e = math.radians(23.439 - 0.00000036 * D)
    RA = (math.degrees(math.atan2(math.cos(e) * math.sin(L), math.cos(L))) / 15) % 24
    return math.degrees(math.asin(math.sin(e) * math.sin(L))), ((q / 15 - RA) + 12) % 24 - 12
def tang(a, t, j, avant):
    dc, eq = sun(j + t / 24); dc = math.radians(dc); la = math.radians(LAT)
    h = math.degrees(math.acos((-math.sin(math.radians(a)) - math.sin(dc) * math.sin(la)) / (math.cos(dc) * math.cos(la)))) / 15
    return 12 - eq + (-h if avant else h)
def fmt(h): m = int(round((h + TZ - LNG / 15) * 60)); return '%02d:%02d' % (m // 60, m % 60)
def prieres(d):
    j = jd(2026, 11, d) - LNG / 360
    dc, _ = sun(j + 13 / 24)
    asr = tang(-math.degrees(math.atan(1 / (1 + math.tan(math.radians(abs(LAT - dc)))))), 13, j, False)
    return [['Fajr', fmt(tang(18, 5, j, True))], ['Dhuhr', fmt(12 - sun(j + .5)[1] + 1 / 60)], ['Asr', fmt(asr)],
            ['Maghrib', fmt(tang(.833, 18, j, False) + 1 / 60)], ['Isha', fmt(tang(17, 18, j, False))]]

# ---------- textes ----------
MAT = {'A': 'Anatomía T', 'B': 'Biología celular ', 'E': 'Epidemiología ', 'R': 'Antropología ', 'D': 'Documentación '}
CONTEXTE = {'A2': 'Pour la practica 1 de cette semaine (groupes sanguins).', 'B10': 'Pour la practica 4 de cette semaine (ADN).',
            'A10': 'Pour la practica 2, la semaine prochaine (système nerveux).', 'A11': 'Pour la practica 2, la semaine prochaine.',
            'A12': 'Pour la practica 2, la semaine prochaine.', 'E6': "Pour l'examen RR/OR des 26 et 27 novembre.",
            'E8': "Pour l'examen RR/OR des 26 et 27 novembre.", 'E10': "Pour l'examen RR/OR des 26 et 27 novembre."}
PROTO_LONG = 'Survol 10 min, partie par partie 45 min sans IA, « tema » dans le Projet Dentaire 20 min, vérification dans le cours 5 min, puis 8 à 10 cartes et « vérifie mes cartes ».'
PROTO_COURT = 'Version courte, 40 min : l’essentiel et tes cartes, sans « tema ».'
SPORT = {'Trajet salle', 'Sport', 'Retour de la salle', 'Collation combat', 'Trajet club', '🥋 JJB', 'Retour du club'}
PRENABLE = {'Anki 1', 'Anki 2', 'Anki matinal', 'Étudier en avance', 'Question ouverte ou autre', 'Lire', 'Approfondir',
            'Simulation dentaire', 'Réexpliquer', 'Projets perso 3', 'Projets perso matinal', "Cartes d'erreurs de la semaine"}
ESP = {
 'Español · gramática': ('Espagnol · gramática', 'Le point de grammaire de la semaine (Dossier Español, section 06) : chaque règle lue, dix phrases écrites et dix dites à voix haute, puis les exercices corrigés à la main.'),
 'Español · hablar': ('Espagnol · hablar', '15 min de shadowing sur l’un de tes cours, puis 45 min de conversation : tuteur, compañero, ou en dictée avec Claude.'),
 'Español · escribir': ('Espagnol · escribir', 'Une question d’examen en espagnol, sur le sujet de cours que tu veux : 25 min sans dictionnaire, puis la correction avec Claude (« examen »).'),
 'Español · escribir largo': ('Espagnol · escribir largo', '300 mots chronométrés (30 min) sur un sujet d’examen, sans dictionnaire, puis « corrige » et les cartes d’erreurs.'),
 'Español · tutor': ('Espagnol · tutor', 'Séance de tuteur : 3 min de conversation, 12 min à expliquer le cours de la veille, 10 min de corrections, 5 min de jeu de rôle en usted. Dix cartes d’erreurs après.'),
 'Español · simulación': ('Espagnol · l’épreuve du dimanche', 'Le premier passage de l’épreuve (onglet Études) : ta ligne de départ, le diagnostic. 45 min, dans cet ordre : 25 min pour écrire 200 mots sur un tema vu cette semaine, sans dictionnaire ni slides, puis « corrige » dans le projet Español (les erreurs pour 100 mots) ; 5 min à voix haute sur le même tema, enregistré au téléphone (les minutes avant ta première pause de trois secondes) ; 5 min, dix verbes × trois temps à voix haute, chronomètre en main (les secondes) ; 10 min, chaque erreur devient une carte dans Español::0 Errores. Les 15 min qui restent : une réponse de type examen sur un autre tema, puis « examen » avec Claude. Les trois chiffres se saisissent à la clôture du soir.'),
 'Español · balance de la semana': ('Espagnol · bilan de la semaine', '« balance » dans le projet Español, avec les chiffres de la semaine : les trois de l’épreuve de ce matin, les pages lues et les minutes de conversation. Le code d’erreur dominant devient le point de grammaire de la semaine prochaine.'),
}

def bloc(iso, dow, h, lab, suivant):
    sardines = dow in (2, 4)
    if lab == 'Douche + préparation':
        d = 'Fenêtres grandes ouvertes 10 min pendant ce temps. Visage : nettoyant Avène à la main. Dos : gel au peroxyde 5 %, 1 à 2 min, puis rincé.'
        if dow != 0: d += ' Shampoing.'
        if dow in (0, 3, 5): d += ' Finis par 30 à 60 s d’eau froide.'
        d += ' Puis Skinoren en couche fine (visage et dos) et SPF 50 sur le visage.'
        lin = []
        if dow in (0, 1, 3, 5): lin.append('de visage')
        if dow in (0, 3): lin.append('de corps')
        if lin: d += ' Serviette' + ('s ' if len(lin) > 1 else ' ') + ' et '.join(lin) + ' propre' + ('s' if len(lin) > 1 else '') + '.'
        return ('soin', 'Aérer, douche et soins', d)
    if lab == 'Petit-déjeuner + Coran (1 page)':
        return ('repas', 'Lance le riz, puis le shake et une page de Coran',
                'D’abord le riz : 250 g rincés trois fois, l’eau au trait, une pincée de sel iodé ; il cuit pendant le shake. Le shake : 400 ml de boisson d’avoine, 150 g de skyr, 80 g de flocons, une banane, 100 g de fruits rouges, 20 g de miel, 30 g d’amandes. Ensuite, le riz du midi reste au chaud dans la cuve, celui du soir part en boîte au frigo dès qu’il est tiède. Rince le blender tout de suite, et remplis ta gourde de 1,5 L : à finir avant le déjeuner.')
    if lab == 'Déjeuner':
        return ('repas', 'Déjeuner', 'Le riz du midi et la boîte du jour (poulet, brocoli), réchauffée à la poêle avec 2 à 3 cuillères d’eau, couvercle, 4 à 5 min. 20 ml d’huile d’olive crue sur le riz, sel iodé, épices. Vaisselle tout de suite (5 min), et ta gourde remplie une deuxième fois.')
    if lab == '😴 Micro-sieste':
        return ('soin', 'Micro-sieste', '20 min, alarme mise. Pas plus, sinon tu dormiras mal ce soir.')
    if lab == 'Collation entraînement':
        return ('repas', 'Collation', '50 g d’amandes, ' + ('une boîte de sardines ou de maquereau' if sardines else '3 œufs durs') + ', 7 dattes. Tant qu’il reste du fromage de ta mère : une portion en plus (2 Vache qui rit, 30 g de Caprice des Dieux ou 30 g de Philadelphia).')
    if lab == 'Trajet cours':
        pb = (' Prends la poubelle en sortant (les emballages au conteneur jaune).' if dow in (1, 4) else '') + ' Avant de fermer : clés, portefeuille, téléphone, gourde.'
        if h == '15:00':
            return ('cours', 'Départ pour le cours', 'Avant de partir : tapis enlevés du sol, le robot passe à 15:45 et à 18:15.' + pb + ' En route, un podcast en espagnol.')
        return ('cours', 'Départ pour le cours', 'Un podcast en espagnol en marchant.' + pb + ' Arrivé avant 17:30 : parle avec les compañeros, pas avec ton téléphone.')
    if lab == 'Cours':
        return ('cours', 'Cours, jusqu’à ' + suivant, '')
    if lab == 'Trajet retour':
        d = 'En marchant : une minute de résumé oral du cours. Puis tes révisions Anki (dentaire et espagnol).'
        if dow in (2, 3, 4, 5): d += ' Tapis remis après 18:30.'
        return ('cours', 'Retour', d)
    if lab == 'Dîner':
        return ('repas', 'Dîner', 'Le riz du matin et la boîte du soir (viande hachée, épinards), réchauffés ensemble à la poêle. 15 ml d’huile crue, sel iodé, épices. La créatine (5 g) avec. Ensuite, plus rien jusqu’au lendemain. Après : le lave-vaisselle rempli et lancé (une pastille), la cuve du rice cooker lavée à la main, le plan de travail essuyé (10 min).')
    if lab == 'Clore le cours du jour':
        return ('etude', 'Clore le cours du jour', '20 min par cours, en espagnol : « cierra » dans le projet Dentaire avec tes « ? » d’amphi, et ce que le prof a souligné en cartes.')
    if lab == 'Temps libre':
        if dow == 2: return ('maison', 'Le linge et l’aspirateur, puis temps libre', 'Plie et range le linge sec de dimanche. Lance une machine avec tes vêtements de la semaine (30 à 40 °C). Pendant qu’elle tourne : aspirateur-serpillière, 10 à 15 min, cuisine et pièce principale, puis vide et rince le réservoir d’eau sale. Le reste est libre.')
        if dow == 6: return ('libre', 'Temps libre', '')
        if dow == 0: return ('libre', 'La revue de la semaine, puis libre', '10 min de revue dans la Batcave, 5 min pour tes mails et tes factures, puis libre.')
        return ('libre', 'Temps libre', '')
    if lab == '🚿 Douche du soir':
        return ('soin', 'Douche du soir', '10 min, eau tiède. Eau seule sur les cheveux et le corps, gel doux aux aisselles, à l’aine et aux pieds. 5 min après : le Skinoren. Lumières basses.')
    if lab == '📖 Écran off — lecture papier':
        return ('soin', 'Écrans coupés', 'Clôture du jour dans la Batcave (2 min). Téléphone en charge hors de la chambre, réveil loin du lit. Fenêtre ouverte 10 min, puis noir complet. Tes 20 pages en espagnol, sur papier.')
    if lab == 'Brossage de dents':
        return ('soin', 'Dents', 'Brossage 2 min, puis le fil dentaire.')
    if lab == 'Coucher':
        return ('soin', 'Au lit', 'Si tu ne dors pas au bout de 20 min, lève-toi, lis 10 min sous une lumière faible, puis reviens.')
    if lab in ESP:
        t, d = ESP[lab]; return ('esp', t, d)
    if lab == 'Trajet mosquée':
        return ('foi', 'Départ pour la mosquée', 'Avant de fermer : clés, portefeuille, téléphone.')
    if lab.startswith('Jumu'):
        return ('foi', 'Jumu’ah', 'La khutba, puis la prière vers 14 h.')
    if lab == '🛒 Courses de la semaine':
        return ('maison', 'Courses de la semaine', 'Avant de partir, 10 min : regarde le frigo et le placard, puis fais le tour de la salle de bain et de la cuisine, et coche dans l’onglet Courses ce que tu as déjà. Cette fois, les produits des deux semaines reviennent : légumes surgelés, boisson d’avoine, fruits rouges, galettes de riz, dattes. En plus : 3 paquets de pâtes de 500 g. Dès lundi 16, des pâtes tous les midis et le riz le soir ; le 28, les pâtes entrent dans les réserves du mois. Nouveau : les rayons « Soin et santé » et « Maison et ménage », 27 produits, tous à vérifier aujourd’hui. N’achète que ce qui te manque, chez Mercadona (la lessive chez Alcampo) ; prends au moins le sel du lave-vaisselle et ses pastilles « Todo en 1 », l’eau d’Alicante est très calcaire.')
    if lab == 'Rangement des courses':
        return ('maison', 'Rangement des courses', 'D’abord la viande de mardi au congélateur, crue : 280 g de poulet et 280 g de viande hachée, à plat dans deux sacs congélation, la date dessus (cru, le poulet ne tient que deux jours au frigo). Le reste de la viande au frigo, en bas : c’est celle de demain. Puis les surgelés, le frais, le sec, les produits de salle de bain et de ménage à leur place, et les tickets saisis dans la Batcave, onglet Budget : la nourriture dans Nourriture, le reste dans Soin et santé ou Maison et ménage.')
    if lab == '🍲 Batch cooking de la semaine':
        return ('maison', 'Batch cooking, la première session', '')
    if lab.startswith('🧽 Ménage'):
        return ('maison', 'Ménage', 'À ton retour de la laverie (vers 16:30) : le lit refait avec la parure propre, puis aspirateur-serpillière dans tout l’appart (réservoir vidé et rincé après), salle de bain, poussière. Le linge propre plié et rangé. À la fin, sors la poubelle.')
    if lab == '🧘 Mobilité des hanches':
        return ('soin', 'Mobilité des hanches', '10 min au sol : 90/90, 2 × 1 min par côté.')
    return None

JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
COURT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
NOTES = {
 5: ['Jour 1 : tout commence ce matin, réveil 05:20.', 'La viande achetée hier est au frigo : le batch de 11:00 la cuit, 15 à 20 min, sans passer par le congélateur.', '08:00 : appelle le centro de salud (rendez-vous et prise de sang), si ce n’est pas fait.', '11:00 : le batch de démarrage (jusqu’à dimanche midi), avec une machine de vêtements en même temps ; le déjeuner en sort tout chaud.', '13:15 : Jumu’ah à la mosquée.', 'Douche du matin : finis par 30 à 60 s d’eau froide.', 'Écris au proprio pour le montant des 2 mois d’eau et d’électricité, puis vire-le.'],
 6: ['13:30 : les courses, plus 3 paquets de pâtes et les produits de soin et de ménage qui te manquent.', 'Au rangement : la viande de mardi au congélateur, crue.', 'Le soir : plie et range le linge d’hier.'],
 0: ['Au réveil : pesée à jeun, tour de taille, et les photos du point de départ (peau et corps) : c’est à elles que tu compareras les suivantes.', '11:20 : l’épreuve d’espagnol, le premier passage (le diagnostic).', '14:30 : la première session de batch, une heure, 5 boîtes (la seconde mardi soir). 15:30 : la laverie (draps, taies, serviettes), puis le ménage à ton retour.', 'Demain, la salle reprend à 07:00 (départ 06:40) et le JJB à 10:30, si le médecin est d’accord : les sacs se préparent ce soir.'],
}
EN_PLUS = {
 1: ['Shampoing', 'Serviette de visage'], 2: ['Shampoing'], 3: ['Shampoing', 'Serviettes de visage et de corps', 'Taie d’oreiller', 'Douche froide'],
 4: ['Shampoing', 'Cou — flexion et extension, 3 × 12-20'], 5: ['Shampoing', 'Serviette de visage', 'Douche froide'], 6: ['Shampoing', 'Courses faites'],
 0: ['Pesée à jeun', 'Photos — peau et corps', 'Brosse à dents neuve', 'Rasage', 'Ongles des mains et des pieds', 'Draps et taies', 'Serviettes de visage et de corps', 'Douche froide', 'Ménage du dimanche'],
}
CHAQUE_JOUR = ['Lit fait', 'Lumière du matin', 'Les cinq prières', 'Créatine', 'Étirements', '8 000 pas', 'Téléphone hors de la chambre',
               'Sadaqah', 'Nouvelles à la famille', 'Revue du jour', '30 min d’espagnol avec un natif', 'Les dix formules', '20 pages en espagnol']

jours = []
for J in S:
    iso, dow = J['iso'], J['dow']
    g = J['blocs']
    rows = []
    # 11 novembre, la nuit : le dimanche 15 est l'ancre des photos (ancre-dimanche-v3) -- la premiere serie, au depart
    rows.append({'t': '05:20', 'k': 'soin', 'titre': 'Réveil' + (', puis la pesée et les photos' if dow == 0 else ''),
                 'd': ('Pesée à jeun et tour de taille, avant de boire ou manger, puis les photos du point de départ. ' if dow == 0 else '') + 'Alarme loin du lit, lumières à fond, lit fait.'})
    creneaux = []
    for i, b in enumerate(g):
        lab, h = b['l'], b['h']
        if lab in PRENABLE:
            creneaux.append((mn(h), mn(g[i + 1]['h']) if i + 1 < len(g) else mn(h) + 60))
            continue
        suivant = g[i + 1]['h'] if i + 1 < len(g) else ''
        r = bloc(iso, dow, h, lab, suivant)
        if r is None: raise SystemExit('bloc inconnu : ' + lab)
        k, t, d = r
        rows.append({'t': h, 'k': k, 'titre': t, 'd': d})
    # 10 novembre, ses mots : « tu me dis juste de quand à quand réviser, pas quoi, je vais organiser moi mes révisions »
    creneaux.sort()
    blocs_rev = []
    for a, z in creneaux:
        if blocs_rev and a <= blocs_rev[-1][1]: blocs_rev[-1][1] = max(blocs_rev[-1][1], z)
        else: blocs_rev.append([a, z])
    total_rev = sum(z - a for a, z in blocs_rev)
    for a, z in blocs_rev:
        d = 'À 08:00 : 15 min de lumière, fenêtre grande ouverte.' if (dow in (0, 3, 5) and a <= mn('08:00') < z) else ''
        duree = z - a
        lib = ('%d min' % duree) if duree < 60 else ('%d h' % (duree // 60) + (' %02d' % (duree % 60) if duree % 60 else ''))
        rows.append({'t': hh(a), 'fin': hh(z), 'k': 'etude', 'titre': 'Révisions · ' + lib, 'd': d})
    temas = 0
    for a, z, typ, obj in []:
        if typ == 'tema':
            temas += 1
            code = obj['m'] + str(obj['n'])
            titre = MAT[obj['m']] + str(obj['n']) + (' · ' + obj['titre'] if obj.get('titre') else '')
            d = (CONTEXTE.get(code, '') + ' ' if code in CONTEXTE else '') + (PROTO_COURT if obj['m'] in 'RD' else PROTO_LONG)
            if dow in (0, 3, 5) and a <= mn('08:00') < z: d += ' À 08:00, une pause : 15 min de lumière, fenêtre grande ouverte.'
            rows.append({'t': hh(a), 'fin': hh(z), 'k': 'etude', 'titre': titre, 'd': d})
        elif typ == 'reste':
            rows.append({'t': hh(a), 'fin': hh(z), 'k': 'etude', 'titre': 'Tes cartes du jour', 'd': 'Puis « vérifie mes cartes ».'})
        elif typ == 'epingle':
            rows.append({'t': hh(a), 'fin': hh(z), 'k': 'etude', 'titre': 'Cuestionario IA de demain',
                         'd': 'Lis l’article Vidal-Alaball et al. 2024 (sur Canvas) et note cinq idées. Il compte pour 10 %, présence obligatoire.'})
    if dow in (6, 0):
        # le week-end, la grille n'a pas de bloc pour la collation : elle se mange quand meme
        k_, t_, d_ = bloc(iso, dow, '', 'Collation entraînement', '')
        rows.append({'t': '15:45' if dow == 6 else '16:25', 'k': k_, 'titre': t_ + (', après le rangement' if dow == 6 else ', avant le ménage'), 'd': d_})
    if iso == '2026-11-13':
        rows.append({'t': '08:00', 'k': 'rdv', 'titre': 'Appelle le centro de salud, si ce n’est pas fait',
                     'd': 'Rendez-vous et prise de sang. Dis ce que tu as eu (soif, perte de poids, fatigue) et que tu as arrêté le snus. Demande aussi le dosage de la vitamine D.'})
    soir = {
      1: ('Prépare demain', 'Sac prêt (ordi chargé, gourde, cours), vêtements posés.'),
      2: ('Étends le linge, puis prépare demain', 'Le linge sur l’étendoir. Sac prêt, vêtements posés.'),
      3: ('Prépare demain', 'Sac prêt (ordi chargé, gourde, cours), vêtements posés. Rien à sortir du congélateur : tout est au frigo jusqu’à samedi.'),
      4: ('Prépare demain', 'Sac prêt (ordi chargé, gourde, cours), vêtements posés. Rien à sortir du congélateur : tout est au frigo jusqu’à samedi.'),
      5: ('Prépare demain', 'Vêtements posés. Rien à sortir du congélateur : les boîtes de samedi sont au frigo. Le linge de ce midi finit de sécher.'),
      6: ('Plie le linge, puis prépare demain', 'Plie et range le linge d’hier (10 min). Vêtements posés. Rien à sortir du congélateur : la boîte de demain midi est au frigo.'),
      0: ('Prépare lundi', 'Si le médecin t’a donné son feu vert : le sac de salle (tenue, serviette, gourde, cadenas) et le sac de JJB (kimono ou short, rashguard, protège-dents, serviette, tongs) prêts, demain c’est la salle à 07:00 et le JJB à 10:30. Le sac de cours (ordi chargé, gourde), vêtements posés.'),
    }
    t, d = soir[dow]
    rows.append({'t': '20:40', 'k': 'maison', 'titre': t, 'd': d})
    if dow == 0:
        rows.append({'t': '15:30', 'k': 'maison', 'titre': 'La laverie', 'd': '', 'pas': ['Défais le lit : draps, taies, serviettes et lavettes dans le sac.', 'Départ 15:35 : la laverie est à 5 min à pied.', 'À la laverie : un lavage à 60 °C, sans adoucissant si tu as le choix, puis le séchage — 45 min en tout, 8 €. Le linge sorti vers 16:25, de retour vers 16:30.', 'Tes 20 pages en espagnol pendant que ça tourne.', 'Le ticket dans la Batcave : Budget, catégorie Maison et ménage.']})
    rows.sort(key=lambda r: (mn(r['t']), 1 if r.get('en') else 0))

    # ---------- les routines, etape par etape (9 novembre : « vraiment tout ce que je dois faire ») ----------
    serv = []
    if dow in (0, 1, 3, 5): serv.append('de visage')
    if dow in (0, 3): serv.append('de corps')
    PAS = {
      'Réveil': ['Alarme coupée, loin du lit. Lumières à fond.', 'Toilettes.'] +
                (['Pesée à jeun et tour de taille, notés dans la Batcave.',
                  'Les photos du point de départ, peau et corps : le visage et le dos pour la peau, le corps de face et de profil. Même endroit, même lumière : tu les referas toutes les 4 semaines (13 décembre, 10 janvier, 7 février).'] if dow == 0 else []) +
                ['Un grand verre d’eau.', 'Les dents : 2 min' + (', avec une brosse neuve (celle des courses d’hier).' if dow == 0 else '.'), 'Le lit fait.'],
      'Aérer, douche et soins': ['Fenêtres grandes ouvertes, 10 min.', 'Le visage lavé avec ton nettoyant, à la main.'] +
                (['Le shampoing.'] if dow != 0 else []) + ['Le corps au gel doux.'] +
                (['Pour finir, 30 à 60 s d’eau froide.'] if dow in (0, 3, 5) else []) +
                ['Sèche en tamponnant, sans frotter' + ((' : serviette' + ('s ' if len(serv) > 1 else ' ') + ' et '.join(serv) + ' propre' + ('s' if len(serv) > 1 else '')) if serv else '') + '.',
                 'Le Skinoren en couche fine, sur la peau sèche, là où tu as des boutons.', 'Déodorant.', 'La barbe brossée.',
                 'Habillé avec les vêtements posés hier soir, cheveux coiffés.', 'Fenêtres fermées.'] if dow != 0 else None,
      'Lance le riz, puis le shake et une page de Coran': [
                'Le riz : 250 g rincés trois fois, l’eau au trait, une pincée de sel iodé. Cuve lancée.',
                'Le shake : 400 ml de boisson d’avoine, 150 g de skyr, 80 g de flocons, une banane, 100 g de fruits rouges, 20 g de miel, 30 g d’amandes. 40 s de mixeur.',
                'Une page de Coran pendant que tu bois.', 'Le blender rincé.', 'Ta gourde de 1,5 L remplie, à finir avant le déjeuner.',
                'Quand le riz est cuit : celui du midi reste au chaud dans la cuve, celui du soir part en boîte au frigo dès qu’il est tiède.',
                'La sadaqah du jour, même petite.'],
      'Déjeuner': ['La boîte du midi (poulet, brocoli) à la poêle : 2 à 3 cuillères d’eau, couvercle, 4 à 5 min.',
                'Le riz de la cuve, 20 ml d’huile d’olive crue, sel iodé, épices.', 'La vaisselle tout de suite.', 'Ta gourde remplie une deuxième fois.'],
      'Dîner': ['La boîte du soir (viande hachée, épinards) et le riz du frigo, ensemble à la poêle.', '15 ml d’huile crue, sel iodé, épices.',
                'La créatine, 5 g, avec le repas.', 'Le lave-vaisselle rempli et lancé (une pastille), la cuve du rice cooker lavée à la main, le plan de travail essuyé.', 'Ensuite, plus rien à manger jusqu’à demain.'],
      'Douche du soir': ['10 min, eau tiède, jamais brûlante.', 'Eau seule sur les cheveux et le corps ; gel doux aux aisselles, à l’aine et aux pieds.',
                'Sèche en tamponnant, puis le pyjama.', 'La barbe brossée.', '5 min après, sur la peau bien sèche : le Skinoren.', 'Lumières basses : une seule lampe.'],
      'Écrans coupés': ['La clôture du jour dans la Batcave (2 min), et un coup d’œil à demain sur cette page.',
                'Téléphone en charge hors de la chambre, réveil posé loin du lit.', 'Fenêtre ouverte 10 min, puis fermée.',
                '5 min d’étirements.', 'Tes 20 pages en espagnol, sur papier.'],
      'Dents': ['Brossage, 2 min.', 'Le fil dentaire.', 'Toilettes.'],
    }
    if PAS['Aérer, douche et soins'] is None:
        PAS['Aérer, douche et soins'] = ['Fenêtres grandes ouvertes, 10 min.', 'Le visage lavé avec ton nettoyant, à la main.',
            'Le corps au gel doux.', 'Le rasage : aisselles et parties intimes.',
            'Pour finir, 30 à 60 s d’eau froide.', 'Sèche en tamponnant : serviettes de visage et de corps propres.',
            'Le Skinoren en couche fine, sur la peau sèche, là où tu as des boutons.', 'Déodorant.', 'La barbe brossée, et taillée si besoin.',
            'Habillé avec les vêtements posés hier soir, cheveux coiffés.', 'Fenêtres fermées.']
    if dow == 0:
        PAS['Douche du soir'] = PAS['Douche du soir'][:3] + ['Les ongles des mains et des pieds coupés.'] + PAS['Douche du soir'][3:]
        PAS['Écrans coupés'] = ['La clôture du jour dans la Batcave : ce soir elle demande aussi ton tour d’épaules (au plus large, bras le long du corps). Puis un coup d’œil à demain sur cette page.'] + PAS['Écrans coupés'][1:]
    if dow == 4:
        PAS['Écrans coupés'] = PAS['Écrans coupés'][:3] + ['5 min d’étirements, puis le cou : flexion et extension, 3 × 12-20.'] + PAS['Écrans coupés'][4:]
    # 9 novembre au soir : deux sessions de batch, tout au frigo ; dimanche 15, la premiere
    PAS['Batch cooking, la première session'] = [
        'Une grande casserole d’eau salée sur le feu. Quand elle bout : 250 g de pâtes (lundi et mardi midi), une minute de moins que le paquet, égouttées, un filet d’huile.',
        'Pendant ce temps, le poulet (140 g) à la poêle, feu vif : 4 min par face, puis 3 min à couvert.',
        'La viande hachée (210 g), en une fournée, 10 min.',
        'Les légumes surgelés (400 g), sans les décongeler : le brocoli 7 min, les épinards 5 min à couvert.',
        'Les 15 œufs durs de la semaine : 10 min dans l’eau bouillante, puis eau froide. En coquille, au frigo.',
        'Tout refroidir 20 min à découvert.',
        '5 boîtes, toutes au frigo, le jour écrit dessus : ce soir (viande hachée, épinards), puis lundi et mardi, midi (pâtes, poulet, brocoli) et soir (viande hachée, épinards).',
        'La viande de mardi reste au congélateur. La vaisselle, le plan de travail essuyé. À 15:30, la laverie.']
    for r in rows:
        cle = r['titre'].split(',')[0] if r['titre'].startswith('Réveil') else r['titre']
        if cle in PAS:
            r['pas'] = PAS[cle]; r['d'] = ''
        if r['titre'] == 'Retour':
            r['d'] = 'En marchant : appelle ou écris à ta famille.' + (' Tapis remis après 18:30.' if dow in (2, 3, 4, 5) else '')
    if iso == '2026-11-13':
        # 12 novembre : le batch de demarrage passe au vendredi 13, la viande achetee la veille, fraiche
        for r in rows:
            if r['titre'] == 'Batch cooking, la première session':
                r['titre'] = 'Lance une machine, puis le batch de démarrage'
                r['fin'] = '12:20'
                r['pas'] = ['La machine : tes vêtements de la semaine, à 30 ou 40 °C.',
                    'Les 9 œufs dans l’eau bouillante, 10 min, puis dans l’eau froide : les collations de vendredi, samedi et dimanche.',
                    'La viande achetée hier, sortie du frigo, dans deux poêles en même temps à feu moyen-vif : tout le poulet en morceaux (≈ 210 g) dans l’une, toute la viande hachée (≈ 140 g) dans l’autre, émiettée. 15 à 20 min ; le poulet est cuit quand le cœur n’est plus rose, la viande hachée quand elle est brune partout.',
                    'Les légumes surgelés, sans les décongeler : 240 g de brocoli 7 min, 160 g d’épinards 5 min à couvert.',
                    'Ton déjeuner sort de là : 70 g de poulet et 80 g de brocoli.',
                    'Le reste refroidit 20 min à découvert, puis 4 boîtes, le jour écrit dessus, toutes au frigo : ce soir et samedi soir (70 g de viande hachée, épinards), samedi et dimanche midi (70 g de poulet, brocoli). Cuite, la viande tient trois jours.',
                    'La vaisselle, le plan de travail essuyé, puis 5 min d’aspirateur-serpillière dans la cuisine (réservoir vidé et rincé après).']
                r['d'] = ''
            if r['titre'] == 'Déjeuner':
                r['pas'] = ['Tout chaud, du batch : 70 g de poulet et 80 g de brocoli, avec le riz de la cuve.',
                            '20 ml d’huile d’olive crue, sel iodé, épices.', 'Ta gourde remplie une deuxième fois.']
        rows.append({'t': '13:05', 'k': 'maison', 'titre': 'Étends le linge', 'd': 'Sur l’étendoir, 5 min, avant de partir à la mosquée.'})
        rows.sort(key=lambda r: (mn(r['t']), 1 if r.get('en') else 0))
    if False:
        rows[:] = [r for r in rows if r['titre'] not in ('Dîner', 'Le linge et l’aspirateur, puis temps libre', 'Étends le linge, puis prépare demain')]
        for r in rows:
            if r['titre'] == 'Déjeuner':
                r['pas'] = ['Pas encore de boîte aujourd’hui : 3 œufs au plat ou brouillés (5 min) et 80 g de brocoli surgelé à la poêle.',
                            'Le riz de la cuve, 20 ml d’huile d’olive crue, sel iodé, épices.', 'La vaisselle tout de suite.', 'Ta gourde remplie une deuxième fois.']
        rows += [
          {'t': '18:05', 'k': 'maison', 'titre': 'Lance la machine, puis le batch cooking', 'd': '', 'pas': [
             'La machine : tes vêtements de la semaine, à 30 ou 40 °C.', 'Les 12 œufs dans l’eau bouillante, 10 min, puis dans l’eau froide.',
             'Le poulet (490 g) à la poêle, feu vif : 4 min par face, puis 3 min à couvert.', 'La viande hachée (490 g) en deux fournées, 10 min chacune.',
             'Les légumes surgelés, sans les décongeler : le brocoli 7 min, les épinards 5 min à couvert.', 'Ce qui ne part pas dans ton assiette refroidit à découvert.']},
          {'t': '19:00', 'k': 'repas', 'titre': 'Dîner', 'd': '', 'pas': [
             'Une portion de viande hachée et d’épinards, tout juste cuite, avec le riz du matin.', '15 ml d’huile crue, sel iodé, épices.', 'La créatine, 5 g, avec le repas.']},
          {'t': '19:25', 'k': 'maison', 'titre': 'Les boîtes', 'd': '', 'pas': [
             'Partage le reste en 9 boîtes : 5 midis (poulet, brocoli), 4 soirs (viande hachée, épinards). Un peu plus de viande que d’habitude, environ 100 g par boîte : c’est bon pour reprendre tes kilos.',
             'Au frigo : mercredi, jeudi et vendredi.', 'Au congélateur : samedi midi et soir, dimanche midi.', 'Le jour écrit sur chaque boîte.', 'La vaisselle, le plan de travail essuyé.']},
          {'t': '19:50', 'k': 'maison', 'titre': 'Étends le linge', 'd': 'Sur l’étendoir.'},
          {'t': '20:00', 'fin': '20:20', 'k': 'etude', 'titre': 'Révisions · 20 min', 'd': ''},
          {'t': '20:20', 'k': 'maison', 'titre': 'Aspirateur-serpillière dans la cuisine', 'd': '10 min après la cuisine, puis vide et rince le réservoir d’eau sale.'},
          {'t': '20:40', 'k': 'maison', 'titre': 'Prépare demain', 'd': 'Sac prêt (ordi chargé, gourde, cours), vêtements posés.'},
        ]
        rows.sort(key=lambda r: (mn(r['t']), 1 if r.get('en') else 0))
    # ---------- les cinq prieres, a leur place dans la journee ----------
    PR = dict((n, t) for n, t in prieres(int(iso[8:])))
    ordre = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
    def contexte(tm):
        c = None
        for r in rows:
            if r.get('en') or r['k'] == 'foi': continue
            if mn(r['t']) <= tm: c = r
        return c
    diner = next(r for r in rows if r['titre'] == 'Dîner')
    for i, n in enumerate(ordre):
        if n == 'Dhuhr' and dow == 5: continue          # le vendredi, la Jumu'ah
        t = mn(PR[n]); c = contexte(t); titre = c['titre'] if c else ''
        suite = PR[ordre[i + 1]] if i + 1 < len(ordre) else None
        en, d = True, 'Ablutions, puis la prière (5 min).'
        if titre.startswith('Cours,'):   # « Courses de la semaine » commence aussi par « Cours »
            if n == 'Isha': t, en, d = mn(diner['t']), False, 'En rentrant, avant de manger : ablutions, puis la prière.'
            else: d = 'À la première pause du cours, avant ' + suite + '.'
        elif titre == 'Retour':
            t, en, d = mn(c['t']) + 30, False, 'En rentrant : ablutions, puis la prière.'
        elif titre == 'Micro-sieste':
            t, en, d = t - (t - mn(c['t'])) + 20, False, 'Au réveil de la sieste : ablutions, puis la prière. Le bloc suivant commence 5 min plus tard.'
        elif titre in ('Déjeuner', 'Dîner'):
            d = 'Juste après le ' + titre.lower() + ' : ablutions, puis la prière.'
        elif c and c['k'] == 'etude':
            d = 'Une pause de 5 min : ablutions, puis la prière.'
        rows.append({'t': hh(t), 'k': 'foi', 'en': en, 'titre': n + (' (' + PR[n] + ')' if hh(t) != PR[n] else ''), 'd': d})
    rows.sort(key=lambda r: (mn(r['t']), 0 if (r['k'] == 'foi' and not r.get('en')) else (2 if r.get('en') else 1)))
    jours.append({'iso': iso, 'dow': dow, 'jour': JOURS[dow], 'court': COURT[dow], 'num': int(iso[8:]),
                  'rattrapage': 'Révisions : %d h %02d dans la journée' % (total_rev // 60, total_rev % 60) + ((' · %s au minuteur, comme le tableau de bord' % ((('%d h %02d' % (J['cible']['rev'] // 60, J['cible']['rev'] % 60)) if J['cible']['rev'] % 60 else ('%d h' % (J['cible']['rev'] // 60))) if J['cible']['rev'] >= 60 else ('%d min' % J['cible']['rev']))) if J.get('cible') else ''),
                  'prieres': prieres(int(iso[8:])), 'notes': NOTES[dow], 'enPlus': EN_PLUS[dow], 'rows': rows})

MOIS = ['Le frigo vidé et nettoyé, le samedi des courses, avant de ranger.', 'Le filtre et le joint de la machine à laver nettoyés.', 'La bouilloire et la cuve du rice cooker détartrées (l’eau d’Alicante est calcaire).', 'Les factures et le budget relus le 24, avant le virement du 25.']
PLUS_RARE = ['Brosse à dents : tous les 3 mois (la Batcave te le rappelle).', 'Coiffeur : toutes les 3 semaines, le prochain le samedi 21.', 'Oreiller lavé : tous les 3 à 6 mois.', 'Couette lavée : 1 à 2 fois par an, en laverie si elle ne rentre pas dans ta machine.']
json.dump({'jours': jours, 'chaqueJour': CHAQUE_JOUR, 'mois': MOIS, 'plusRare': PLUS_RARE}, open(SP + 'data11.json', 'w'), ensure_ascii=False, indent=0)
t = open(SP + 'template11.html', encoding='utf-8').read()
open(SP + '../../semaine-du-9-novembre.html', 'w', encoding='utf-8').write(t.replace('__DATA__', json.dumps({'jours': jours, 'chaqueJour': CHAQUE_JOUR, 'mois': MOIS, 'plusRare': PLUS_RARE}, ensure_ascii=False)))
for j in jours: print(j['iso'], len(j['rows']), 'lignes', j['rattrapage'], j['prieres'][0])
