#!/usr/bin/env python3
"""« Ta semaine, jour par jour » : une seule page, toutes les semaines, chaque jour heure par heure.

12 novembre, ses mots : « donc il me faut un guide a la semaine, pour chaque jour, precisement ».

- Du vendredi 13 au dimanche 15 et du lundi 16 au dimanche 22 novembre : les jours viennent de build11.py et de
  build16.py, ecrits bloc par bloc (le depart, la reprise de la salle) -- lances ici tels quels.
- Les semaines suivantes (SEMAINES) sont construites a partir de la Batcave seule : semaines/<lundi>.json, sorti par
  tests/zz-semaine.mjs <sortie> <lundi> 7. La consigne de chaque bloc est celle que la Batcave affiche ; les cases a
  cocher sont celles du tableau de bord ce jour-la (cycles compris : photos, ongles, coupe, brosse a dents) ; les
  grammes du batch du mardi se calculent sur les repas de mercredi a samedi.

  python3 outils/semaine/build_guide.py      -> ta-semaine.html a la racine du depot
"""
import json, math, os, re, subprocess

SP = os.path.dirname(os.path.abspath(__file__)) + '/'
SEMAINES = ['2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28', '2027-01-04', '2027-01-11', '2027-01-18']
# 12 novembre, « que je n'aie plus besoin de toucher quoi que ce soit avant le debut du 2e semestre » : jusqu'au dimanche 24 janvier.
# Les jours sans cours de la Batcave (JOURS_SANS_COURS_LISTE, periodeGrille) : le 8 decembre ferie, les vacances de Noel
# (du 23 decembre au 6 janvier), les partiels (periode « partiels » des semaines extraites), puis les 21 et 22 janvier entre
# les deux semestres.
FERIES = {'2026-12-08': 'l’Immaculée Conception'}
VACANCES = ('2026-12-23', '2027-01-06')
INTERSEMESTRE = ('2027-01-21', '2027-01-22')
ES_FIN = '2026-12-12'                     # le dernier jour du mois d'espagnol (ES_REPRISE_FIN dans la Batcave)

def hh(m): return '%02d:%02d' % (m // 60, m % 60)
def de(x): return ('d’' if x[:1] in 'AEIOUÁÉÍÓÚHaeiouáéíóúh' else 'de ') + x
def mn(h): a, b = h.split(':'); return int(a) * 60 + int(b)

# ---------- heures de priere (Alicante, Ligue islamique mondiale 18/17, Asr standard) : build16.py, pour toute date ----------
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
def prieres(iso):
    y, m, d = (int(x) for x in iso.split('-'))
    j = jd(y, m, d) - LNG / 360
    dc, _ = sun(j + 13 / 24)
    asr = tang(-math.degrees(math.atan(1 / (1 + math.tan(math.radians(abs(LAT - dc)))))), 13, j, False)
    return [['Fajr', fmt(tang(18, 5, j, True))], ['Dhuhr', fmt(12 - sun(j + .5)[1] + 1 / 60)], ['Asr', fmt(asr)],
            ['Maghrib', fmt(tang(.833, 18, j, False) + 1 / 60)], ['Isha', fmt(tang(17, 18, j, False))]]

JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
COURT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
def nom_mois(iso): return MOIS[int(iso[5:7]) - 1]
def date_longue(iso, dow): return JOURS[dow].lower() + ' ' + str(int(iso[8:])) + ' ' + nom_mois(iso)

ETUDE = {'Anki 1', 'Anki 2', 'Anki matinal', 'Étudier en avance', 'Question ouverte ou autre', 'Lire', 'Approfondir',
         'Simulation dentaire', 'Réexpliquer', "Cartes d'erreurs de la semaine"}
PROJ = {'Projets perso 1', 'Projets perso 2', 'Projets perso 3', 'Projets perso 4', 'Projets perso 5', 'Projets perso 6', 'Projets perso matinal'}
ESP = {'Español · gramática': 'Espagnol · gramática', 'Español · hablar': 'Espagnol · hablar', 'Español · escribir': 'Espagnol · escribir',
       'Español · escribir largo': 'Espagnol · escribir largo', 'Español · tutor': 'Espagnol · tutor',
       'Español · simulación': 'Espagnol · l’épreuve du dimanche', 'Español · balance de la semana': 'Espagnol · bilan de la semaine'}
SEANCE = {1: 'haut du corps, en volume', 2: 'bas du corps (squat), puis le sac', 4: 'haut du corps, lourd', 6: 'le second bas et les bras, puis le sac'}
SAC_JJB = 'le sac de JJB (kimono propre ou short, rashguard, protège-dents, serviette, tongs)'
# les cases de chaque jour (la Batcave, 12 novembre) : elles ne vont pas dans « en plus aujourd'hui »
QUOTIDIENNES = {'Lit fait', 'Étirements faits', 'Fajr', 'Dhuhr', "Jumu'ah (~14h)", 'Asr', 'Maghrib', 'Isha', 'Téléphone hors de la chambre',
                'Sadaqah du jour', 'Revue de la veille / plan du lendemain', 'Nouvelles à la famille', 'Marche — 8 000 pas',
                '30 min en espagnol avec un natif', 'Les dix formules du jour', '20 pages lues en espagnol', 'Créatine — 5 g',
                'Lumière du matin — 15 min dehors, dès qu’il fait jour'}
COURTS = {'Serviette de visage changée': 'Serviette de visage', 'Serviette de corps changée': 'Serviette de corps',
          'Taie d’oreiller changée': 'Taie d’oreiller', 'Draps et taies d’oreiller changés': 'Draps et taies', 'Pesée, à jeun': 'Pesée à jeun',
          'Rasage — aisselles et parties intimes': 'Rasage', 'Douche froide — 30 à 60 s en fin de douche': 'Douche froide',
          'Ménage du dimanche': 'Ménage du dimanche', 'Photos — peau et corps': 'Photos de la peau et du corps',
          'Ongles — mains ; pieds les dimanches de photo': 'Ongles des mains'}

# ---------- une consigne de la Batcave, coupee en etapes ----------
def phrases(t):
    t = (t or '').strip()
    if not t: return []
    parts = re.split(r'(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ý0-9«(])', t)
    out = []
    for p in parts:
        # « a ; b ; c » hors des parentheses : une etape chacun
        prof, morceaux, cur = 0, [], ''
        i = 0
        while i < len(p):
            ch = p[i]
            if ch == '(': prof += 1
            elif ch == ')': prof = max(0, prof - 1)
            if prof == 0 and p.startswith(' ; ', i):
                morceaux.append(cur); cur = ''; i += 3; continue
            cur += ch; i += 1
        morceaux.append(cur)
        for k, m in enumerate(morceaux):
            m = m.strip()
            if not m: continue
            m = m[0].upper() + m[1:]
            if not m.endswith(('.', '!', '?', '»')): m += '.'
            out.append(m)
    return out

def sport_texte(c, dow):
    noms = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
    out = []
    for p in re.split(r'(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ý0-9«(])', c.strip()):
        m = re.match(r'(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\b', p)
        if m:
            if p.startswith('Mardi et samedi'):
                if dow not in (2, 6): continue
            elif m.group(1).lower() != noms[dow]: continue
        out.append(p)
    return ' '.join(out)

def somme(repas, nom, cle): return sum(x['q'] for x in repas.get(nom, []) if x['c'] == cle)

# ---------- un jour construit depuis la Batcave ----------
def construire(J, semaine, k):
    iso, dow, g = J['iso'], J['dow'], J['blocs']
    prec = semaine[k - 1] if k > 0 else None
    suiv = semaine[k + 1] if k + 1 < len(semaine) else None
    labs = [b['l'] for b in g]
    hab = [h['label'] for h in (J.get('duJour') or [])]
    a = lambda mot: any(mot in h for h in hab)
    consigne = {b['l']: b['c'] for b in g}
    rows = []

    # le reveil
    titre = 'Réveil' + (', puis la pesée' + (' et les photos' if a('Photos') else '') if a('Pesée') else '')
    pas = ['Alarme coupée, loin du lit. Lumières à fond.', 'Toilettes.']
    if a('Pesée'): pas.append('Pesée à jeun et tour de taille, notés dans la Batcave.')
    if a('Photos'): pas.append('Les photos de la peau et du corps : même endroit, même lumière qu’au point de départ.')
    pas += ['Un grand verre d’eau.', 'Les dents : 2 min.', 'Le lit fait.']
    rows.append({'t': '05:20', 'k': 'soin', 'titre': titre, 'd': '', 'pas': pas})

    creneaux, clore = [], 0
    batch_mardi = None
    tapis = any(b['l'] == 'Trajet cours' and b['h'] == '15:00' for b in g)
    jjb = '🥋 JJB' in labs
    for i, b in enumerate(g):
        lab, h, c = b['l'], b['h'], b['c']
        fin = g[i + 1]['h'] if i + 1 < len(g) else ''
        if lab in ETUDE or (lab in PROJ and c.startswith('📚')):
            creneaux.append((mn(h), mn(fin))); continue
        if lab == 'Clore le cours du jour':
            clore += mn(fin) - mn(h)
            rows.append({'t': h, 'fin': fin, 'k': 'etude', 'titre': 'Clore le cours du jour', 'd': c}); continue
        if lab in PROJ:
            if lab == 'Projets perso matinal': t = 'Projet · une tâche décidée la veille'
            elif c.startswith('Fiscalité'): t = 'Projet · fiscalité'
            elif c.startswith('Réserve'): t = 'Projet · réserve'
            elif c.startswith('Bilan de la semaine'): t = 'Projet · bilan de la semaine'
            elif 'finir le livrable' in c: t = 'Le livrable de la semaine'
            elif iso <= ES_FIN: t = 'Le livrable de la semaine, sinon révisions'
            else: t = 'Projet · e-commerce'
            rows.append({'t': h, 'fin': fin, 'k': 'projet', 'titre': t, 'd': c}); continue
        if lab in ESP:
            rows.append({'t': h, 'fin': fin, 'k': 'esp', 'titre': ESP[lab], 'd': c}); continue
        # les partiels (12 novembre) : la Batcave pose la veille et le matin « Préparer · Examen · … », le départ, l'examen
        if lab.startswith('Préparer · '):
            # la veille d'un examen, ou d'un devoir a rendre (une presentation orale, un dossier) : a la place de la cloture du soir
            clore += mn(fin) - mn(h)
            quoi = lab[len('Préparer · '):]
            titre = ('Préparer l’examen ' + de(quoi[len('Examen · '):])) if quoi.startswith('Examen · ') else ('Préparer · ' + quoi)
            rows.append({'t': h, 'fin': fin, 'k': 'etude', 'titre': titre, 'd': c}); continue
        if lab.startswith('Trajet · Examen · '):
            rows.append({'t': h, 'k': 'cours', 'titre': 'Départ pour l’examen ' + de(lab[len('Trajet · Examen · '):]), 'd': c}); continue
        if lab.startswith('Examen · '):
            rows.append({'t': h, 'fin': fin, 'k': 'rdv', 'titre': 'Examen ' + de(lab[len('Examen · '):]) + ', jusqu’à ' + fin, 'd': c}); continue
        r = None
        if lab == 'Douche + préparation': r = ('soin', 'Aérer, douche et soins', '', phrases(c))
        elif lab == 'Petit-déjeuner + Coran (1 page)':
            P = J['repas']['Petit-déjeuner']; q = {x['c']: x['q'] for x in P}
            attendu = {'avoine', 'skyr', 'flocons', 'banane', 'miel', 'amandes', 'fruitsrouges'}
            if set(q) != attendu: raise SystemExit(iso + ' : le shake a changé dans la Batcave : ' + json.dumps(q))
            riz = somme(J['repas'], 'Dîner', 'riz') + somme(J['repas'], 'Déjeuner', 'riz')
            midi = 'à midi, tu cuis des pâtes fraîches' if 'repas frais' in consigne.get('Déjeuner', '') else 'à midi, ce sont les pâtes de ta boîte'
            r = ('repas', 'Lance le riz, puis le shake et une page de Coran', '', [
                'Le riz : %d g rincés trois fois, l’eau au trait, une pincée de sel iodé. Cuve lancée : c’est le riz du soir (%s).' % (riz, midi),
                'Le shake : %d ml de boisson d’avoine, %d g de skyr, %d g de flocons, une banane, %d g de fruits rouges, %d g de miel, %d g d’amandes. 40 s de mixeur.'
                % (q['avoine'], q['skyr'], q['flocons'], q['fruitsrouges'], q['miel'], q['amandes']),
                'Une page de Coran pendant que tu bois.', 'Le blender rincé.', 'Ta gourde de 1,5 L remplie, à finir avant le déjeuner.',
                'Quand le riz est cuit : en boîte, au frigo dès qu’il est tiède.', 'La sadaqah du jour, même petite.'])
        elif lab == 'Déjeuner':
            r = ('repas', 'Déjeuner' + (', un repas frais' if 'repas frais' in c else ''), '', phrases(c) + ['La vaisselle tout de suite.', 'Ta gourde remplie une deuxième fois.'])
        elif lab == '😴 Micro-sieste': r = ('soin', 'Micro-sieste', c, None)
        elif lab == 'Collation entraînement': r = ('repas', 'Collation', c, None)
        elif lab == 'Collation combat': r = ('repas', 'Collation avant le JJB', c, None)
        elif lab == 'Trajet salle': r = ('sport', 'Départ pour la salle', c, None)
        elif lab == 'Sport': r = ('sport', 'La salle · ' + SEANCE.get(dow, 'la séance du jour'), sport_texte(c, dow), None)
        elif lab == 'Retour de la salle': r = ('sport', 'Retour à pied', c, None)
        elif lab == 'Trajet club': r = ('sport', 'Départ pour le club', c, None)
        elif lab == '🥋 JJB': r = ('sport', 'JJB, jusqu’à ' + fin, c, None)
        elif lab == 'Retour du club': r = ('sport', 'Retour : le shake de récup, la douche, la machine', '', phrases(c))
        elif lab == 'Trajet cours': r = ('cours', 'Départ pour le cours', c, None)
        elif lab == 'Cours': r = ('cours', 'Cours, jusqu’à ' + fin, c, None)
        elif lab == 'Trajet retour': r = ('cours', 'Retour', '', phrases(c) + (['Tapis remis après 18:30.'] if tapis else []))
        elif lab == 'Dîner':
            r = ('repas', 'Dîner', '', phrases(c) + ['Le lave-vaisselle rempli et lancé (une pastille), la cuve du rice cooker lavée à la main, le plan de travail essuyé.'])
        elif lab == 'Temps libre':
            if 'deuxième session de batch' in c and batch_mardi is None:
                batch_mardi = (h, fin)
                continue
            if 'revue du dimanche' in c: r = ('libre', 'La revue de la semaine, puis libre', c, None)
            else: r = ('libre', 'Temps libre', '', None)
        elif lab == '🚿 Douche du soir': r = ('soin', 'Douche du soir', '', phrases(c))
        elif lab == '📖 Écran off — lecture papier':
            r = ('soin', 'Écrans coupés', '', ['La clôture du jour dans la Batcave (2 min), et un coup d’œil à demain sur cette page.',
                 'Téléphone en charge hors de la chambre, réveil posé loin du lit.', 'Fenêtre ouverte 10 min, puis fermée.',
                 '5 min d’étirements' + (', puis le cou : flexion et extension, 3 × 12-20.' if a('Cou') else '.'), 'Tes 20 pages en espagnol, sur papier.'])
        elif lab == 'Brossage de dents': r = ('soin', 'Dents', '', ['Brossage, 2 min.', 'Le fil dentaire.', 'Toilettes.'])
        elif lab == 'Douche + brossage de dents':
            r = ('soin', 'Douche et dents', '', phrases(c) or ['La clôture du jour dans la Batcave (2 min), téléphone en charge hors de la chambre.',
                 'Douche tiède, 10 min.', 'Brossage, 2 min, et le fil dentaire.'])
        elif lab == 'Coucher': r = ('soin', 'Au lit', 'Si tu ne dors pas au bout de 20 min, lève-toi, lis 10 min sous une lumière faible, puis reviens.', None)
        elif lab == 'Trajet mosquée': r = ('foi', 'Départ pour la mosquée', c + (' Le kimono étendu avant de partir.' if jjb else ''), None)
        elif lab.startswith('Jumu'): r = ('foi', 'Jumu’ah', c, None)
        elif lab == '🛒 Courses de la semaine':
            coif = a('Coupe de cheveux')
            r = ('maison', ('Le coiffeur, puis les courses de la semaine' if coif else 'Les courses de la semaine'),
                 ('D’abord le coiffeur (30 €, prévu au budget). Puis les courses. ' if coif else '') + c +
                 ' La liste est calculée dans l’onglet Courses de la Batcave (nourriture, soin, ménage) : coche en magasin, le ticket dans Budget le jour même.', None)
        elif lab == 'Rangement des courses': r = ('maison', 'Rangement des courses', '', phrases(c))
        elif lab == '🍲 Batch cooking de la semaine':
            ph = phrases(c)
            coupe = next((n for n, x in enumerate(ph) if x.startswith('Puis, vers 15:30')), len(ph))
            r = ('maison', 'Batch cooking, la première session', '', ph[:coupe] + ['À 15:30, la laverie.'])
        elif lab.startswith('🧽 Ménage'): r = ('maison', 'Ménage', c, None)
        elif lab == '🧘 Mobilité des hanches': r = ('soin', 'Mobilité des hanches', c, None)
        if r is None: raise SystemExit(iso + ' : bloc inconnu : ' + lab)
        kk, t, d, p = r
        row = {'t': h, 'k': kk, 'titre': t, 'd': d}
        if p: row['pas'] = p
        rows.append(row)

    # les revisions, d'un seul tenant
    creneaux.sort(); blocs = []
    for x, z in creneaux:
        if blocs and x <= blocs[-1][1]: blocs[-1][1] = max(blocs[-1][1], z)
        else: blocs.append([x, z])
    total = sum(z - x for x, z in blocs) + clore
    sans_salle = 'Sport' not in labs
    for x, z in blocs:
        d = 'À 08:00 : 15 min de lumière, fenêtre grande ouverte.' if (sans_salle and x <= mn('08:00') < z) else ''
        du = z - x
        lib = ('%d min' % du) if du < 60 else ('%d h' % (du // 60) + (' %02d' % (du % 60) if du % 60 else ''))
        rows.append({'t': hh(x), 'fin': hh(z), 'k': 'etude', 'titre': 'Révisions · ' + lib, 'd': d})

    # ce que la grille n'a pas en bloc
    if 'Collation entraînement' not in labs and dow in (6, 0):
        texte = '50 g d’amandes, 3 œufs durs, 7 dattes. Tant qu’il reste du fromage de ta mère : une portion en plus (2 Vache qui rit, 30 g de Caprice des Dieux ou 30 g de Philadelphia).'
        rows.append({'t': '15:45', 'k': 'repas', 'titre': 'Collation' + (', après le rangement' if dow == 6 else ', après le batch'), 'd': texte})
    if jjb:
        rows.append({'t': '13:10' if 'Trajet mosquée' in labs else '13:00', 'k': 'maison', 'titre': 'Étends le kimono et le rashguard',
                     'd': 'À l’air libre, à l’envers, jamais au sèche-linge.'})
    if batch_mardi:
        h0 = mn(batch_mardi[0])
        q = lambda nom, cle: sum(somme(j['repas'], nom, cle) for j in semaine[k + 1:k + 5])
        pates, poulet, hachee = q('Déjeuner', 'pates'), q('Déjeuner', 'poulet'), q('Dîner', 'hachee')
        leg = q('Déjeuner', 'legumes') + q('Dîner', 'legumes')
        rows.append({'t': batch_mardi[0], 'k': 'maison', 'titre': 'Lance la machine, puis la seconde session de batch', 'd': '', 'pas': [
            'La machine : tes vêtements de la semaine, programme rapide, 30 à 40 °C, une dose d’adoucissant. La tenue de salle de ce matin attend le kimono de demain : jamais d’adoucissant sur le sport.',
            'Une grande casserole d’eau salée sur le feu. Quand elle bout : %d g de pâtes (mercredi à samedi midi), une minute de moins que le paquet, égouttées, un filet d’huile.' % pates,
            'Pendant ce temps, le poulet (%d g, décongelé depuis hier soir) à la poêle, feu vif : 4 min par face, puis 3 min à couvert.' % poulet,
            'La viande hachée (%d g), en deux fournées, 10 min chacune.' % hachee,
            'Les légumes surgelés (%d g), sans les décongeler : le brocoli 7 min, les épinards 5 min à couvert.' % leg,
            'Tout refroidir 20 min à découvert ; pendant ce temps, la vaisselle et le plan de travail.',
            '8 boîtes, toutes au frigo, le jour écrit dessus : mercredi à samedi, midi (pâtes, poulet, brocoli) et soir (viande hachée, épinards).']})
        t = h0 + 75
        diner = next((b for b in g if b['l'] == 'Dîner'), None)
        if diner:
            fd = mn(g[g.index(diner) + 1]['h'])
            if mn(diner['h']) <= t < fd: t = fd
        rows.append({'t': hh(t), 'k': 'maison', 'titre': 'Le sol de la cuisine, puis étends le linge',
                     'd': '5 min d’aspirateur-serpillière dans la cuisine (réservoir vidé et rincé après), puis le linge sur l’étendoir.'})
    if '🍲 Batch cooking de la semaine' in labs and dow == 0:
        rows.append({'t': '15:30', 'k': 'maison', 'titre': 'La laverie', 'd': '', 'pas': [
            'Défais le lit : draps, taies, serviettes et lavettes dans le sac.', 'Départ 15:35 : la laverie est à 5 min à pied.',
            'À la laverie : un lavage à 60 °C, sans adoucissant si tu as le choix, puis le séchage — 45 min en tout, 8 €. Le linge sorti vers 16:25, de retour vers 16:30.',
            'Tes 20 pages en espagnol pendant que ça tourne.', 'Le ticket dans la Batcave : Budget, catégorie Maison et ménage.']})
    # le soir : preparer demain, d'apres la grille de demain
    if suiv is not None or dow == 0:
        ls = [b['l'] for b in suiv['blocs']] if suiv else []
        sacs = []
        if 'Sport' in ls: sacs.append('le sac de salle (tenue, serviette, gourde, cadenas' + (', bandes et gants pour le sac' if suiv['dow'] in (2, 6) else '') + ')')
        if '🥋 JJB' in ls: sacs.append(SAC_JJB)
        if 'Cours' in ls: sacs.append('le sac de cours')
        exam = next((l for l in ls if l.startswith('Examen · ')), None)
        if exam: sacs.append('les affaires de l’examen ' + de(exam[len('Examen · '):]) + ' (pièce d’identité, convocation, stylos, montre)')
        d = ''
        if dow == 4: d = 'Plie et range le linge de mardi (10 min). '
        if sacs: d += (sacs[0][0].upper() + sacs[0][1:] + (', ' + ', '.join(sacs[1:-1]) if len(sacs) > 2 else '') + (' et ' + sacs[-1] if len(sacs) > 1 else '')) + (' prêts' if len(sacs) > 1 else ' prêt') + ', vêtements posés.'
        else: d += 'Vêtements posés.'
        if dow == 6: d += ' Rien à sortir du congélateur : demain midi, un repas frais.'
        if suiv:
            tp = '20:40'
            for r_ in rows:
                if r_['titre'].startswith('Préparer') and r_.get('fin') and mn(r_['t']) < mn('20:40') < mn(r_['fin']): tp = r_['fin']
            rows.append({'t': tp, 'k': 'maison', 'titre': ('Plie le linge, puis prépare demain' if dow == 4 else 'Prépare demain'), 'd': d})
    rows.sort(key=lambda r: (mn(r['t']), 3 if r.get('en') else (2 if r.get('fin') else 1)))

    # les cinq prieres, a leur place (build16.py)
    PR = dict((n, t) for n, t in prieres(iso))
    ordre = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
    def contexte(tm):
        cx = None
        for r in rows:
            if r.get('en') or r['k'] == 'foi': continue
            if mn(r['t']) <= tm: cx = r
        return cx
    def fin_de(cx):
        return min(mn(r['t']) for r in rows if not r.get('en') and r['k'] != 'foi' and mn(r['t']) > mn(cx['t']))
    diner = next(r for r in rows if r['titre'] == 'Dîner')
    for n_, nom in enumerate(ordre):
        if nom == 'Dhuhr' and any(l.startswith('Jumu') for l in labs): continue
        t = mn(PR[nom]); cx = contexte(t); titre = cx['titre'] if cx else ''
        ensuite = PR[ordre[n_ + 1]] if n_ + 1 < len(ordre) else None
        en, d = True, 'Ablutions, puis la prière (5 min).'
        if titre.startswith('Cours,'):
            if nom == 'Isha': t, en, d = mn(diner['t']), False, 'En rentrant, avant de manger : ablutions, puis la prière.'
            else: d = 'À la première pause du cours, avant ' + ensuite + '.'
        elif titre == 'Retour':
            t, en, d = mn(cx['t']) + 30, False, 'En rentrant : ablutions, puis la prière.'
        elif titre == 'Micro-sieste':
            t, en, d = mn(cx['t']) + 20, False, 'Au réveil de la sieste : ablutions, puis la prière. Le bloc suivant commence 5 min plus tard.'
        elif titre == 'Départ pour le cours':
            d = 'Au cours, à la première pause, avant ' + ensuite + ' : ablutions, puis la prière.'
        elif titre.startswith('Départ pour l’examen') or (cx and cx['k'] == 'rdv' and titre.startswith('Examen ')):
            ex = next(r for r in rows if r['k'] == 'rdv' and r['titre'].startswith('Examen '))
            t, en, d = mn(ex['fin']), False, 'En sortant de l’examen' + (', avant ' + ensuite if ensuite else '') + ' : ablutions, puis la prière.'
        elif titre.startswith('Lance la machine'):
            d = 'Pendant que l’eau des pâtes chauffe : ablutions, puis la prière.'
        elif titre.startswith('Batch cooking'):
            d = 'Pendant que tout refroidit : ablutions, puis la prière.'
        elif titre.startswith('Le coiffeur') or titre.startswith('Les courses'):
            t, en, d = mn('15:45'), False, 'Après le rangement des courses : ablutions, puis la prière.'
        elif titre == 'Espagnol · tutor':
            t, en, d = fin_de(cx), False, 'Juste après le tuteur : ablutions, puis la prière.'
        elif titre.startswith('Déjeuner') or titre == 'Dîner':
            d = 'Juste après le ' + ('déjeuner' if titre.startswith('Déjeuner') else 'dîner') + ' : ablutions, puis la prière.'
        elif cx and cx['k'] in ('etude', 'projet', 'esp'):
            d = 'Une pause de 5 min : ablutions, puis la prière.'
        elif cx and cx['k'] == 'sport':
            d = 'Après la séance : ablutions, puis la prière.'
        rows.append({'t': hh(t), 'k': 'foi', 'en': en, 'titre': nom + (' (' + PR[nom] + ')' if hh(t) != PR[nom] else ''), 'd': d})
    rows.sort(key=lambda r: (mn(r['t']), 0 if (r['k'] == 'foi' and not r.get('en')) else (3 if r.get('en') else (2 if r.get('fin') else 1))))

    # a ne pas oublier
    N = []
    if prec is not None and prec.get('espagnol') and not J.get('espagnol'):
        N.append('Les blocs Projets perso reviennent : l’e-commerce commence aujourd’hui (Dossier E-commerce, semaine 1). Chaque bloc dit quoi faire.')
    exam = next((b for b in g if b['l'].startswith('Examen · ')), None)
    if exam:
        dep = next((b['h'] for b in g if b['l'].startswith('Trajet · Examen · ')), None)
        N.append('Examen ' + de(exam['l'][len('Examen · '):]) + ' à ' + exam['h'] + (' : départ ' + dep + ', ' if dep else ' : ') + 'pièce d’identité et convocation.')
    if dow in (1, 2, 3, 4, 5) and 'Cours' not in labs and not exam:
        if J.get('periode') == 'partiels': N.append('Partiels : pas de cours. Les révisions de la page, à la Batcave pour le détail.')
        elif VACANCES[0] <= iso <= VACANCES[1]: N.append('Vacances de Noël : pas de cours. La journée suit la grille de cette page.')
        elif INTERSEMESTRE[0] <= iso <= INTERSEMESTRE[1]: N.append('Entre les deux semestres : pas de cours. Le second commence lundi 25 janvier.')
        else: N.append('Jour férié' + (' (' + FERIES[iso] + ')' if iso in FERIES else '') + ' : pas de cours. L’après-midi suit la grille de cette page.')
    if suiv is not None:
        ex2 = next((b for b in suiv['blocs'] if b['l'].startswith('Examen · ')), None)
        if ex2: N.append('Demain à ' + ex2['h'] + ' : examen ' + de(ex2['l'][len('Examen · '):]) + '. Ce soir, coucher à l’heure.')
    if 'Sport' in labs: N.append('La salle à 07:00' + (' : bandes et gants dans le sac.' if dow in (2, 6) else '.'))
    if jjb: N.append('JJB à 10:30 : la collation à 10:05, le kimono en machine en rentrant' + (', étendu avant la mosquée.' if 'Trajet mosquée' in labs else '.'))
    if 'Trajet mosquée' in labs: N.append('13:15 : Jumu’ah à la mosquée.')
    if 'passe du congélateur au frigo' in consigne.get('Dîner', ''): N.append('Au dîner : la viande de mardi passe du congélateur au frigo.')
    if batch_mardi: N.append(batch_mardi[0] + ' : la seconde session de batch, avec une machine de vêtements en même temps.')
    if 'sardines' in consigne.get('Collation entraînement', ''): N.append('Collation : les sardines à la place des œufs.')
    if a('Taie d’oreiller changée') and not a('Draps'): N.append('Serviettes et taie d’oreiller propres.')
    if a('Douche froide'): N.append('Douche du matin : finis par 30 à 60 s d’eau froide.')
    if dow == 4: N.append('20:40 : plie et range le linge.')
    if '🛒 Courses de la semaine' in labs:
        N.append('13:30 : ' + ('le coiffeur, puis ' if a('Coupe de cheveux') else '') + 'les courses de la semaine.')
        N.append('Au rangement : la viande de mardi au congélateur, crue.')
    if dow == 0:
        N.append('Au réveil : pesée à jeun et tour de taille' + (', puis les photos du point d’étape.' if a('Photos') else '.'))
        if 'Español · simulación' in labs:
            m = re.search(r'passage (\d) sur (\d)', consigne['Español · simulación'])
            N.append('11:20 : l’épreuve d’espagnol' + (', passage ' + m.group(1) + ' sur ' + m.group(2) if m else '') + ' — les trois chiffres à la clôture du soir.')
        N.append('12:20 : un repas frais, pas de boîte (pâtes, 3 œufs, brocoli).')
        N.append('14:30 : la première session de batch. 15:30 : la laverie, puis le ménage à ton retour.')
        if a('Ongles'): N.append('Les ongles' + (', mains et pieds.' if a('Photos') else ', des mains.'))
        if a('Brosse à dents'): N.append('Une brosse à dents neuve.')
    if dow == 1 and suiv is not None:
        sam = next((j for j in semaine if j['dow'] == 6), None)
        if sam and any('Coupe de cheveux' in h['label'] for h in (sam.get('duJour') or [])):
            N.append('Le coiffeur samedi : prends rendez-vous pour 13:30.')
    if J.get('espagnol') and suiv is not None and not suiv.get('espagnol'):
        N.append('Dernier jour du mois d’espagnol : demain, les blocs Projets perso reviennent pour l’e-commerce.')
    en_plus = []
    for h in hab:
        if h in QUOTIDIENNES: continue
        x = COURTS.get(h, h)
        if x == 'Ongles des mains' and a('Photos'): x = 'Ongles des mains et des pieds'
        en_plus.append(x)
    cib = J.get('cible') or {}
    rev = cib.get('rev') or 0
    ligne = 'Révisions : %d h %02d dans la journée' % (total // 60, total % 60)
    if rev:
        ligne += ' · %s au minuteur, comme le tableau de bord' % ((('%d h %02d' % (rev // 60, rev % 60)) if rev % 60 else ('%d h' % (rev // 60))) if rev >= 60 else ('%d min' % rev))
    return {'iso': iso, 'dow': dow, 'jour': JOURS[dow], 'court': COURT[dow], 'num': int(iso[8:]), 'mois': nom_mois(iso),
            'rattrapage': ligne, 'prieres': prieres(iso), 'notes': N, 'enPlus': en_plus, 'rows': rows}

# ---------- l'en-tete de chaque semaine ----------
COMMUNS = ['Les révisions : tu choisis quoi réviser, la page te dit seulement quand.',
           'Les habitudes se cochent dans la Batcave. Si un bloc y change, c’est elle qui a raison.',
           'Une envie de snus : bois de l’eau, mâche un chewing-gum, marche 5 minutes. Elle passe.']

def tete(S, jours):
    lundi = S[0]['iso']
    espagnol = any(j.get('espagnol') for j in S)
    fin_es = next((j for j in S if j.get('espagnol') and j['iso'] == ES_FIN), None)
    debut_ecom = next((j for j in S if not j.get('espagnol')), None) if espagnol else None
    sous = 'Réveil 05:20 · coucher 21:35 · ' + ('mois d’espagnol jusqu’au samedi 12 décembre' if espagnol and not debut_ecom else
                                                ('fin du mois d’espagnol, l’e-commerce commence dimanche' if debut_ecom else 'l’e-commerce, une semaine du dossier'))
    examens = [(j, b) for j in S for b in j['blocs'] if b['l'].startswith('Examen · ')]
    partiels = any(j.get('periode') == 'partiels' for j in S)
    vacances = any(VACANCES[0] <= j['iso'] <= VACANCES[1] for j in S)
    inter = any(INTERSEMESTRE[0] <= j['iso'] <= INTERSEMESTRE[1] for j in S)
    if examens: sous = 'Réveil 05:20 · coucher 21:35 · partiels : ' + ', '.join(b['l'][len('Examen · '):] + ' ' + COURT[j['dow']] + '. ' + str(j['num'] if 'num' in j else int(j['iso'][8:])) for j, b in examens)
    elif partiels and vacances: sous = 'Réveil 05:20 · coucher 21:35 · vacances de Noël, puis les partiels'
    elif partiels: sous = 'Réveil 05:20 · coucher 21:35 · partiels'
    elif vacances: sous = 'Réveil 05:20 · coucher 21:35 · vacances de Noël, pas de cours'
    elif inter: sous = 'Réveil 05:20 · coucher 21:35 · entre les deux semestres'
    L = ['La salle lundi, mardi, jeudi et samedi à 07:00 ; le JJB lundi, mercredi et vendredi à 10:30. La séance du jour est dans l’onglet Sport de la Batcave.']
    mardi = next((j for j in S if j['dow'] == 2), None)
    hb = next((b['h'] for b in mardi['blocs'] if b['l'] == 'Temps libre' and 'deuxième session de batch' in b['c']), '19:10') if mardi else '19:10'
    L.append('Des pâtes tous les midis (un repas frais le dimanche), du riz tous les soirs. Le batch cooking : dimanche 14:30 et mardi ' + hb + ', tout au frigo.')
    ev = []   # les evenements de la semaine, dans l'ordre des jours
    for j in S:
        ls = [b['l'] for b in j['blocs']]
        hab = [h['label'] for h in (j.get('duJour') or [])]
        jl = date_longue(j['iso'], j['dow']).capitalize()
        ex = next((b for b in j['blocs'] if b['l'].startswith('Examen · ')), None)
        if ex:
            dep = next((b['h'] for b in j['blocs'] if b['l'].startswith('Trajet · Examen · ')), None)
            ev.append(jl + ' : examen ' + de(ex['l'][len('Examen · '):]) + ' à ' + ex['h'] + (', départ ' + dep if dep else '') + ' — la veille au soir et le matin, sa préparation.')
        elif j['dow'] in (1, 2, 3, 4, 5) and 'Cours' not in ls and j['iso'] in FERIES:
            ev.append(jl + ' : jour férié (' + FERIES[j['iso']] + '), pas de cours — l’après-midi suit la grille.')
        elif j['dow'] in (1, 2, 3, 4, 5) and 'Cours' not in ls and not (VACANCES[0] <= j['iso'] <= VACANCES[1]) and j.get('periode') != 'partiels' and not (INTERSEMESTRE[0] <= j['iso'] <= INTERSEMESTRE[1]):
            ev.append(jl + ' : jour férié, pas de cours — l’après-midi suit la grille.')
        if 'Español · simulación' in ls:
            m = re.search(r'passage (\d) sur (\d)', next(b['c'] for b in j['blocs'] if b['l'] == 'Español · simulación'))
            ev.append(jl + ' : l’épreuve d’espagnol' + (', passage ' + m.group(1) + ' sur ' + m.group(2) if m else '') + '.')
        if fin_es is j: ev.append(jl + ' : le dernier jour du mois d’espagnol.')
        if any('Coupe de cheveux' in h for h in hab): ev.append(jl + ' : le coiffeur, avant les courses.')
        if debut_ecom is j: ev.append(jl + ' : les blocs Projets perso reviennent, l’e-commerce commence (Dossier E-commerce).')
        if any('Photos' in h for h in hab): ev.append(jl + ' : les photos du point d’étape, au réveil.')
    if vacances:
        L.append('Vacances de Noël : pas de cours du mercredi 23 décembre au mercredi 6 janvier. Les journées suivent la grille sans cours de cette page ; la salle et le JJB continuent.')
    if partiels:
        L.append('Partiels : la Batcave est en mode partiels (pas de cours) ; chaque examen a sa préparation la veille au soir et le matin, et la page le dit jour par jour. Les cours de la fac restent dans ton agenda.')
    if inter:
        L.append('Jeudi 21 et vendredi 22 janvier : entre les deux semestres, pas de cours. Le second semestre commence lundi 25 janvier.')
    L += ev
    if not espagnol: L.append('Les blocs Projets perso sont à la boutique : chacun dit quoi faire dans le Dossier E-commerce. Un devoir de la fac passe toujours avant.')
    d = int(lundi[8:])
    return {'cle': lundi, 'titre': 'Semaine du ' + (('1er' if d == 1 else str(d)) + ' ' + nom_mois(lundi)), 'sous': sous, 'tete': L + COMMUNS, 'jours': jours}

# ---------- les deux premieres semaines, telles qu'elles existent ----------
def entete_gabarit(nom):
    t = open(SP + nom, encoding='utf-8').read()
    h1 = re.search(r'<h1>(.*?)</h1>', t).group(1)
    sous = re.search(r'<p class="sous">(.*?)</p>', t).group(1)
    lis = re.findall(r'<li>(.*?)</li>', re.search(r'<header class="tete">(.*?)</header>', t, re.S).group(1), re.S)
    return h1, sous, [re.sub(r'\s+', ' ', x).strip() for x in lis]

def semaine_ecrite(script, data, gabarit, cle):
    subprocess.run(['python3', SP + script], check=True, stdout=subprocess.DEVNULL)
    D = json.load(open(SP + data, encoding='utf-8')); os.remove(SP + data)
    for j in D['jours']: j['mois'] = nom_mois(j['iso'])
    h1, sous, lis = entete_gabarit(gabarit)
    return {'cle': cle, 'titre': h1, 'sous': sous, 'tete': lis, 'jours': D['jours']}, D

def main():
    s11, D11 = semaine_ecrite('build11.py', 'data11.json', 'template11.html', '2026-11-13')
    s16, D16 = semaine_ecrite('build16.py', 'data16.json', 'template16.html', '2026-11-16')
    semaines = [s11, s16]
    for lundi in SEMAINES:
        S = json.load(open(SP + 'semaines/' + lundi + '.json', encoding='utf-8'))
        if len(S) != 7 or S[0]['iso'] != lundi: raise SystemExit(lundi + ' : la semaine extraite ne commence pas ce lundi')
        jours = [construire(J, S, k) for k, J in enumerate(S)]
        semaines.append(tete(S, jours))
        for J in S:
            for b in J['blocs']:
                if any(m in b['c'] for m in ('[object', 'undefined', 'NaN')): raise SystemExit(J['iso'] + ' : consigne cassée : ' + b['l'])
    coif = sorted({J['iso'] for lundi in SEMAINES for J in json.load(open(SP + 'semaines/' + lundi + '.json', encoding='utf-8'))
                   if any('Coupe de cheveux' in h['label'] for h in (J.get('duJour') or []))})
    rare = [x for x in D16['plusRare'] if not x.startswith('Coiffeur')]
    rare.insert(1, 'Coiffeur : toutes les 3 semaines, le samedi avant les courses (21 novembre' + ''.join(', ' + str(int(i[8:])) + ' ' + nom_mois(i) for i in coif) + '…).')
    data = {'semaines': semaines, 'chaqueJour': D16['chaqueJour'], 'mois': D16['mois'], 'plusRare': rare}
    t = open(SP + 'template-guide.html', encoding='utf-8').read()
    s = json.dumps(data, ensure_ascii=False)
    assert '</script' not in s.lower()
    open(SP + '../../ta-semaine.html', 'w', encoding='utf-8').write(t.replace('__DATA__', s))
    for se in semaines:
        print(se['cle'], se['titre'], len(se['jours']), 'jours')
        for j in se['jours'][:7]:
            print('   ', j['iso'], len(j['rows']), 'lignes ·', j['rattrapage'], '· notes', len(j['notes']), '· en plus', ', '.join(j['enPlus']))

if __name__ == '__main__':
    main()
