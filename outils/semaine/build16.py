import json, math
# La semaine du 16 au 22 novembre 2026 : la salle et le JJB reprennent, des pates a midi et du riz le soir,
# deux sessions de batch (dimanche 14:30, mardi 19:10), tout au frigo. Les revisions : quand, jamais quoi.
import os
SP = os.path.dirname(os.path.abspath(__file__)) + '/'   # ce dossier : les donnees lues, le gabarit ; la page sort a la racine du depot
S = json.load(open(SP + 'semaine16.json'))

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

# ---------- les blocs qui deviennent des creneaux de revision ----------
# 10 novembre, ses mots : « tu me dis juste de quand a quand reviser, pas quoi, je vais organiser moi mes revisions »
ETUDE = {'Anki 1', 'Anki 2', 'Anki matinal', 'Étudier en avance', 'Question ouverte ou autre', 'Lire', 'Approfondir',
         'Simulation dentaire', 'Réexpliquer', "Cartes d'erreurs de la semaine", 'Clore le cours du jour'}
PROJETS = {'Projets perso 3', 'Projets perso matinal'}   # revision quand la Batcave y met le rattrapage (📚), projet sinon

ESP = {
 'Español · gramática': ('Espagnol · gramática', 'Le point de grammaire de la semaine (Dossier Español, section 06) : chaque règle lue, dix phrases écrites et dix dites à voix haute, puis les exercices corrigés à la main.'),
 'Español · hablar': ('Espagnol · hablar', '15 min de shadowing sur l’un de tes cours, puis 45 min de conversation : tuteur, compañero, ou en dictée avec Claude.'),
 'Español · escribir': ('Espagnol · escribir', 'Une question d’examen en espagnol, sur le sujet de cours que tu veux : 25 min sans dictionnaire, puis la correction avec Claude (« examen »).'),
 'Español · escribir largo': ('Espagnol · escribir largo', '300 mots chronométrés (30 min) sur un sujet d’examen, sans dictionnaire, puis « corrige » et les cartes d’erreurs.'),
 'Español · tutor': ('Espagnol · tutor', 'Séance de tuteur : 3 min de conversation, 12 min à expliquer le cours de la veille, 10 min de corrections, 5 min de jeu de rôle en usted. Dix cartes d’erreurs après.'),
 'Español · simulación': ('Espagnol · l’épreuve du dimanche', 'Le passage 2 sur 4 de l’épreuve (onglet Études), la même que dimanche dernier. 45 min, dans cet ordre : 25 min pour écrire 200 mots sur un tema vu cette semaine, sans dictionnaire ni slides, puis « corrige » dans le projet Español (les erreurs pour 100 mots) ; 5 min à voix haute sur le même tema, enregistré au téléphone (les minutes avant ta première pause de trois secondes) ; 5 min, dix verbes × trois temps à voix haute, chronomètre en main (les secondes) ; 10 min, chaque erreur devient une carte dans Español::0 Errores. Les 15 min qui restent : une réponse de type examen sur un autre tema, puis « examen » avec Claude. Les trois chiffres se saisissent à la clôture du soir.'),
 'Español · balance de la semana': ('Espagnol · bilan de la semaine', '« balance » dans le projet Español, avec les chiffres de la semaine : les trois de l’épreuve de ce matin, les pages lues et les minutes de conversation. Le code d’erreur dominant devient le point de grammaire de la semaine prochaine.'),
}
SEANCE = {1: 'haut du corps, en volume', 2: 'bas du corps (squat), puis le sac', 4: 'haut du corps, lourd', 6: 'le second bas et les bras, puis le sac'}

def bloc(iso, dow, h, lab, suivant):
    sardines = dow in (2, 4)
    if lab == 'Douche + préparation':
        return ('soin', 'Aérer, douche et soins', '')
    if lab == 'Petit-déjeuner + Coran (1 page)':
        return ('repas', 'Lance le riz, puis le shake et une page de Coran', '')
    if lab == 'Déjeuner':
        return ('repas', 'Déjeuner' + (', un repas frais' if dow == 0 else ''), '')
    if lab == '😴 Micro-sieste':
        return ('soin', 'Micro-sieste', '20 min, alarme mise. Pas plus, sinon tu dormiras mal ce soir.')
    if lab == 'Collation entraînement':
        return ('repas', 'Collation', '50 g d’amandes, ' + ('une boîte de sardines ou de maquereau' if sardines else '3 œufs durs') + ', 7 dattes. Tant qu’il reste du fromage de ta mère : une portion en plus (2 Vache qui rit, 30 g de Caprice des Dieux ou 30 g de Philadelphia).')
    if lab == 'Trajet salle':
        return ('sport', 'Départ pour la salle', 'Un grand verre d’eau avant de partir : à jeun, c’est prévu, le shake t’attend au retour. Dans le sac : tenue, serviette, gourde pleine, cadenas' + (', bandes et gants pour le sac' if dow in (2, 6) else '') + '. Avant de fermer : clés, portefeuille, téléphone.')
    if lab == 'Sport':
        return ('sport', 'La salle · ' + SEANCE[dow], '5 min de vélo ou de rameur avec ton podcast espagnol, les séries d’approche, puis la séance de l’onglet Sport, charges déjà calculées. Squat et développé couché dans le rack, barres de sécurité réglées. Fini à 07:55.')
    if lab == 'Retour de la salle':
        return ('sport', 'Retour à pied', '20 min : le jour se lève pendant ton retour, c’est ta lumière du matin.')
    if lab == 'Collation combat':
        return ('repas', 'Collation avant le JJB', 'Une banane, 2 galettes de riz avec 15 g de Nutella, 25 min avant le tatami. Remplis ta gourde : aujourd’hui, 3,5 à 4 L d’eau.')
    if lab == 'Trajet club':
        return ('sport', 'Départ pour le club', '10 min à pied. Dans le sac : kimono (ou short) et rashguard, protège-dents, gourde pleine, serviette, tongs. Ongles courts.')
    if lab == '🥋 JJB':
        return ('sport', 'JJB, jusqu’à ' + suivant, 'Le protège-dents. Tape tôt sur une clé ou un étranglement : un débutant qui attend se blesse. Bois entre les rounds, et pose tes questions en espagnol.')
    if lab == 'Retour du club':
        return ('sport', 'Retour : le shake de récup, la douche, la machine', '')
    if lab == 'Trajet cours':
        pb = (' Prends la poubelle en sortant (les emballages au conteneur jaune).' if dow in (1, 4) else '') + ' Avant de fermer : clés, portefeuille, téléphone, gourde.'
        if h == '15:00':
            return ('cours', 'Départ pour le cours', 'Avant de partir : tapis enlevés du sol, le robot passe à 15:45 et à 18:15.' + pb + ' En route, un podcast en espagnol.')
        return ('cours', 'Départ pour le cours', 'Un podcast en espagnol en marchant.' + pb + ' Arrivé avant 17:30 : parle avec les compañeros, pas avec ton téléphone.')
    if lab == 'Cours':
        return ('cours', 'Cours, jusqu’à ' + suivant, '')
    if lab == 'Trajet retour':
        return ('cours', 'Retour', '')
    if lab == 'Dîner':
        return ('repas', 'Dîner', '')
    if lab == 'Temps libre':
        if dow == 2: return None   # mardi : la seconde session de batch, ajoutee plus bas
        if dow == 0: return ('libre', 'La revue de la semaine, puis libre', '10 min de revue dans la Batcave, 5 min pour tes mails et tes factures, puis libre.')
        return ('libre', 'Temps libre', '')
    if lab == '🚿 Douche du soir':
        return ('soin', 'Douche du soir', '')
    if lab == '📖 Écran off — lecture papier':
        return ('soin', 'Écrans coupés', '')
    if lab == 'Brossage de dents':
        return ('soin', 'Dents', '')
    if lab == 'Coucher':
        return ('soin', 'Au lit', 'Si tu ne dors pas au bout de 20 min, lève-toi, lis 10 min sous une lumière faible, puis reviens.')
    if lab in ESP:
        t, d = ESP[lab]; return ('esp', t, d)
    if lab == 'Trajet mosquée':
        return ('foi', 'Départ pour la mosquée', 'Avant de fermer : clés, portefeuille, téléphone.' + (' Le kimono étendu avant de partir.' if dow == 5 else ''))
    if lab.startswith('Jumu'):
        return ('foi', 'Jumu’ah', 'La khutba, puis la prière vers 14 h.')
    if lab == '🛒 Courses de la semaine':
        return ('maison', 'Le coiffeur, puis les courses de la semaine', 'Avant de partir, 5 min : regarde le frigo et le placard, et coche dans l’onglet Courses ce que tu as déjà. D’abord le coiffeur (30 €, prévu au budget). Puis les courses : cette semaine, seulement les produits de chaque semaine — au comptoir, 420 g de poulet et 490 g de viande hachée ; 18 œufs, en 3 boîtes de 6. Les réserves (riz, pâtes, flocons) et les produits des deux semaines reviennent le 28. Un produit de salle de bain ou de ménage fini dans la semaine ? Tu l’as touché « fini » dans l’onglet Courses : il est sur la liste d’aujourd’hui.')
    if lab == 'Rangement des courses':
        return ('maison', 'Rangement des courses', 'D’abord la viande de mardi au congélateur, crue : 280 g de poulet et 280 g de viande hachée, à plat dans deux sacs congélation, la date dessus (cru, le poulet ne tient que deux jours au frigo). Le reste de la viande au frigo, en bas : c’est celle de demain. Puis les surgelés, le frais, le sec, les produits de salle de bain et de ménage à leur place, et les tickets saisis dans la Batcave, onglet Budget : la nourriture dans Nourriture, le reste dans Soin et santé ou Maison et ménage.')
    if lab == '🍲 Batch cooking de la semaine':
        return ('maison', 'Batch cooking, la première session', '')
    if lab.startswith('🧽 Ménage'):
        return ('maison', 'Ménage', 'À ton retour de la laverie (vers 16:30) : le lit refait avec la parure propre, puis aspirateur-serpillière dans tout l’appart (réservoir vidé et rincé après), salle de bain, poussière. Le linge propre plié et rangé. À la fin, sors la poubelle.')
    if lab == '🧘 Mobilité des hanches':
        return ('soin', 'Mobilité des hanches', '10 min au sol : 90/90, 2 × 1 min par côté.')
    return False

JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
COURT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
NOTES = {
 1: ['La salle reprend : départ 06:40, puis le JJB à 10:30.', 'En rentrant du JJB : le kimono en machine.', 'Au dîner : la viande de mardi passe du congélateur au frigo.', 'Le coiffeur samedi : prends rendez-vous pour 13:30 si le tien en prend.'],
 2: ['La salle à 07:00 : bandes et gants dans le sac.', 'Collation : les sardines à la place des œufs.', '19:10 : la seconde session de batch, avec une machine de vêtements en même temps.'],
 3: ['JJB à 10:30 : la collation à 10:05, le kimono en machine en rentrant.', 'Serviettes et taie d’oreiller propres.', 'Douche du matin : finis par 30 à 60 s d’eau froide.'],
 4: ['La salle à 07:00.', 'Collation : les sardines à la place des œufs.', '20:40 : plie et range le linge.'],
 5: ['JJB à 10:30 : le kimono en machine en rentrant, étendu avant la mosquée.', '13:15 : Jumu’ah à la mosquée.', 'Douche du matin : finis par 30 à 60 s d’eau froide.'],
 6: ['La salle à 07:00 : bandes et gants dans le sac.', '13:30 : le coiffeur, puis les courses de la semaine.', 'Au rangement : la viande de mardi au congélateur, crue.'],
 0: ['Au réveil : pesée à jeun et tour de taille.', '12:20 : un repas frais, pas de boîte (pâtes, 3 œufs, brocoli).', '14:30 : la première session de batch, une heure, 5 boîtes. 15:30 : la laverie (draps, taies, serviettes), puis le ménage à ton retour.'],
}
EN_PLUS = {
 1: ['Shampoing', 'Serviette de visage'], 2: ['Shampoing'], 3: ['Shampoing', 'Serviettes de visage et de corps', 'Taie d’oreiller', 'Douche froide'],
 4: ['Shampoing', 'Cou — flexion et extension, 3 × 12-20'], 5: ['Shampoing', 'Serviette de visage', 'Douche froide'], 6: ['Shampoing', 'Courses faites', 'Coupe de cheveux'],
 # 11 novembre, la nuit : les ongles tombent un dimanche sur deux (15, 29 novembre), pas le 22 -- la Batcave ne les demande pas
 0: ['Pesée à jeun', 'Rasage', 'Draps et taies', 'Serviettes de visage et de corps', 'Douche froide', 'Ménage du dimanche'],
}
CHAQUE_JOUR = ['Lit fait', 'Lumière du matin', 'Les cinq prières', 'Créatine', 'Étirements', '8 000 pas', 'Téléphone hors de la chambre',
               'Sadaqah', 'Nouvelles à la famille', 'Revue du jour', '30 min d’espagnol avec un natif', 'Les dix formules', '20 pages en espagnol']
SAC_SALLE = 'le sac de salle (tenue, serviette, gourde, cadenas'
SAC_JJB = 'le sac de JJB (kimono propre ou short, rashguard, protège-dents, serviette, tongs)'

jours = []
for J in S:
    iso, dow = J['iso'], J['dow']
    g = J['blocs']
    rows = []
    rows.append({'t': '05:20', 'k': 'soin', 'titre': 'Réveil' + (', puis la pesée' if dow == 0 else ''), 'd': ''})
    creneaux = []
    for i, b in enumerate(g):
        lab, h = b['l'], b['h']
        fin = g[i + 1]['h'] if i + 1 < len(g) else ''
        if lab in ETUDE or (lab in PROJETS and b['c'].startswith('📚')):
            creneaux.append((mn(h), mn(fin)))
            continue
        if lab in PROJETS:
            # 12 novembre : l'e-commerce commence le 13 decembre -- pendant le mois d'espagnol, ces blocs vont au
            # livrable de la semaine, sinon aux revisions ; la consigne est celle de la Batcave
            t = ('Projet · une tâche décidée la veille' if lab == 'Projets perso matinal' else
                 'Le livrable de la semaine' if 'finir le livrable' in b['c'] else 'Le livrable de la semaine, sinon révisions')
            rows.append({'t': h, 'fin': fin, 'k': 'projet', 'titre': t, 'd': b['c']})
            continue
        r = bloc(iso, dow, h, lab, fin)
        if r is False: raise SystemExit('bloc inconnu : ' + lab)
        if r is None: continue
        k, t, d = r
        rows.append({'t': h, 'k': k, 'titre': t, 'd': d})
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
    if dow in (6, 0):
        # le week-end, la grille n'a pas de bloc pour la collation : elle se mange quand meme
        k_, t_, d_ = bloc(iso, dow, '', 'Collation entraînement', '')
        rows.append({'t': '15:45', 'k': k_, 'titre': t_ + (', après le rangement' if dow == 6 else ', après le batch'), 'd': d_})
    if dow in (1, 3, 5):
        rows.append({'t': '13:00' if dow != 5 else '13:10', 'k': 'maison', 'titre': 'Étends le kimono et le rashguard', 'd': 'À l’air libre, à l’envers, jamais au sèche-linge.'})
    soir = {
      1: ('Prépare demain', 'Le sac de salle (tenue, serviette, gourde, cadenas, bandes et gants pour le sac) et le sac de cours prêts, vêtements posés.'),
      3: ('Prépare demain', 'Le sac de salle (tenue, serviette, gourde, cadenas) et le sac de cours prêts, vêtements posés.'),
      4: ('Plie le linge, puis prépare demain', 'Plie et range le linge de mardi (10 min). ' + SAC_JJB[0].upper() + SAC_JJB[1:] + ' et le sac de cours prêts, vêtements posés.'),
      5: ('Prépare demain', 'Le sac de salle (tenue, serviette, gourde, cadenas, bandes et gants pour le sac) prêt, vêtements posés.'),
      6: ('Prépare demain', 'Vêtements posés. Rien à sortir du congélateur : demain midi, un repas frais.'),
      0: ('Prépare lundi', 'Le sac de salle (tenue, serviette, gourde, cadenas) et ' + SAC_JJB + ' prêts, le sac de cours, vêtements posés.'),
    }
    if dow in soir:
        t, d = soir[dow]
        rows.append({'t': '20:40', 'k': 'maison', 'titre': t, 'd': d})
    if dow == 0:
        rows.append({'t': '15:30', 'k': 'maison', 'titre': 'La laverie', 'd': '', 'pas': ['Défais le lit : draps, taies, serviettes et lavettes dans le sac.', 'Départ 15:35 : la laverie est à 5 min à pied.', 'À la laverie : un lavage à 60 °C, sans adoucissant si tu as le choix, puis le séchage — 45 min en tout, ≈ 8 €. Le linge sorti vers 16:25, de retour vers 16:30.', 'Tes 20 pages en espagnol pendant que ça tourne.', 'Le ticket dans la Batcave : Budget, catégorie Maison et ménage.']})
    if dow == 2:
        # 9 novembre au soir : « si je divise le batch cooking en deux jours, comme ca je congele ni riz ni pates »
        rows += [
          {'t': '19:10', 'k': 'maison', 'titre': 'Lance la machine, puis la seconde session de batch', 'd': '', 'pas': [
             'La machine : tes vêtements de la semaine, programme rapide, 30 à 40 °C, une dose d’adoucissant. La tenue de salle de ce matin attend le kimono de demain : jamais d’adoucissant sur le sport.',
             'Une grande casserole d’eau salée sur le feu. Quand elle bout : 500 g de pâtes (mercredi à samedi midi), une minute de moins que le paquet, égouttées, un filet d’huile.',
             'Pendant ce temps, le poulet (280 g, décongelé depuis hier soir) à la poêle, feu vif : 4 min par face, puis 3 min à couvert.',
             'La viande hachée (280 g), en deux fournées, 10 min chacune.',
             'Les légumes surgelés (640 g), sans les décongeler : le brocoli 7 min, les épinards 5 min à couvert.',
             'Tout refroidir 20 min à découvert ; pendant ce temps, la vaisselle et le plan de travail.',
             '8 boîtes, toutes au frigo, le jour écrit dessus : mercredi à samedi, midi (pâtes, poulet, brocoli) et soir (viande hachée, épinards).']},
          {'t': '20:25', 'k': 'maison', 'titre': 'Le sol de la cuisine, puis étends le linge', 'd': '5 min d’aspirateur-serpillière dans la cuisine (réservoir vidé et rincé après), puis le linge sur l’étendoir.'},
          {'t': '20:40', 'k': 'maison', 'titre': 'Prépare demain', 'd': SAC_JJB[0].upper() + SAC_JJB[1:] + ' et le sac de cours prêts, vêtements posés.'},
        ]
    rows.sort(key=lambda r: (mn(r['t']), 3 if r.get('en') else (2 if r.get('fin') else 1)))

    # ---------- les routines, etape par etape (9 novembre : « vraiment tout ce que je dois faire ») ----------
    serv = []
    if dow in (0, 1, 3, 5): serv.append('de visage')
    if dow in (0, 3): serv.append('de corps')
    PAS = {
      'Réveil': ['Alarme coupée, loin du lit. Lumières à fond.', 'Toilettes.'] +
                (['Pesée à jeun et tour de taille, notés dans la Batcave.'] if dow == 0 else []) +
                ['Un grand verre d’eau.', 'Les dents : 2 min.', 'Le lit fait.'],
      'Aérer, douche et soins': ['Fenêtres grandes ouvertes, 10 min.', 'Le visage lavé avec ton nettoyant, à la main.'] +
                (['Le shampoing.'] if dow != 0 else []) + ['Le corps au gel doux.'] +
                (['Pour finir, 30 à 60 s d’eau froide.'] if dow in (0, 3, 5) else []) +
                ['Sèche en tamponnant, sans frotter' + ((' : serviette' + ('s ' if len(serv) > 1 else ' ') + ' et '.join(serv) + ' propre' + ('s' if len(serv) > 1 else '')) if serv else '') + '.',
                 'Le Skinoren en couche fine, sur la peau sèche, là où tu as des boutons.', 'Déodorant.', 'La barbe brossée.',
                 'Habillé avec les vêtements posés hier soir, cheveux coiffés.', 'Fenêtres fermées.'] if dow != 0 else None,
      'Lance le riz, puis le shake et une page de Coran': [
                'Le riz : 125 g rincés trois fois, l’eau au trait, une pincée de sel iodé. Cuve lancée : c’est le riz du soir' +
                (' (à midi, tu cuis des pâtes fraîches).' if dow == 0 else ' (à midi, ce sont les pâtes de ta boîte).'),
                'Le shake : 400 ml de boisson d’avoine, 150 g de skyr, 80 g de flocons, une banane, 100 g de fruits rouges, 20 g de miel, 30 g d’amandes. 40 s de mixeur.',
                'Une page de Coran pendant que tu bois.', 'Le blender rincé.', 'Ta gourde de 1,5 L remplie, à finir avant le déjeuner.',
                'Quand le riz est cuit : en boîte, au frigo dès qu’il est tiède.',
                'La sadaqah du jour, même petite.'],
      'Déjeuner': ['La boîte du midi (pâtes, poulet, brocoli) à la poêle : 2 à 3 cuillères d’eau, couvercle, 4 à 5 min, brûlante jusqu’au cœur.',
                '20 ml d’huile d’olive crue, sel iodé, épices.', 'La vaisselle tout de suite.', 'Ta gourde remplie une deuxième fois.'],
      'Déjeuner, un repas frais': ['Une grande casserole d’eau salée sur le feu. Quand elle bout : 125 g de pâtes, le temps du paquet.',
                'Pendant ce temps, 80 g de brocoli surgelé à la poêle, 7 min à couvert, puis 3 œufs au plat ou brouillés dans 10 ml d’huile.',
                'Les pâtes égouttées, 10 ml d’huile d’olive crue, sel iodé, épices.', 'La vaisselle tout de suite.', 'Ta gourde remplie une deuxième fois.'],
      'Dîner': (['D’abord, 30 secondes : la viande crue de mardi passe du congélateur au frigo, dans une assiette creuse, en bas. Elle décongèle pour demain soir.'] if dow == 1 else []) +
               ['La boîte du soir (viande hachée, épinards) et le riz du matin, ensemble à la poêle.', '15 ml d’huile crue, sel iodé, épices.',
                'La créatine, 5 g, avec le repas.', 'Le lave-vaisselle rempli et lancé (une pastille), la cuve du rice cooker lavée à la main, le plan de travail essuyé.', 'Ensuite, plus rien à manger jusqu’à demain.'],
      'Retour : le shake de récup, la douche, la machine': ['500 ml d’eau en rentrant.', 'Le shake de récup : 250 ml de boisson d’avoine, une banane, 20 g de flocons, au mixeur.',
                'La douche tout de suite, 5 min, gel doux partout : la peau sort du tatami.',
                'Kimono et rashguard en machine, 30 °C, à l’envers' + (', avec la tenue de salle de ce matin.' if dow == 1 else ', avec la tenue de salle de mardi.' if dow == 3 else ', avec la tenue de salle de jeudi.' if dow == 5 else '.')],
      'Batch cooking, la première session': [
                'Une grande casserole d’eau salée sur le feu. Quand elle bout : 250 g de pâtes (lundi et mardi midi), une minute de moins que le paquet, égouttées, un filet d’huile.',
                'Pendant ce temps, le poulet (140 g) à la poêle, feu vif : 4 min par face, puis 3 min à couvert.',
                'La viande hachée (210 g), en une fournée, 10 min.',
                'Les légumes surgelés (400 g), sans les décongeler : le brocoli 7 min, les épinards 5 min à couvert.',
                'Les 15 œufs durs de la semaine : 10 min dans l’eau bouillante, puis eau froide. En coquille, au frigo.',
                'Tout refroidir 20 min à découvert ; pendant ce temps, la vaisselle et le plan de travail.',
                '5 boîtes, toutes au frigo, le jour écrit dessus : ce soir (viande hachée, épinards), puis lundi et mardi, midi (pâtes, poulet, brocoli) et soir (viande hachée, épinards).',
                'La viande de mardi reste au congélateur jusqu’à lundi soir. La vaisselle, le plan de travail essuyé. À 15:30, la laverie.'],
      'Retour': ['En marchant : une minute de résumé oral du cours, puis appelle ou écris à ta famille.'] + (['Tapis remis après 18:30.'] if dow in (2, 3, 4, 5) else []),
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
    if dow == 4:
        PAS['Écrans coupés'] = PAS['Écrans coupés'][:3] + ['5 min d’étirements, puis le cou : flexion et extension, 3 × 12-20.'] + PAS['Écrans coupés'][4:]
    for r in rows:
        cle = r['titre'].split(',')[0] if r['titre'].startswith('Réveil') else r['titre']
        if cle in PAS:
            r['pas'] = PAS[cle]; r['d'] = ''
    # ---------- les cinq prieres, a leur place dans la journee ----------
    PR = dict((n, t) for n, t in prieres(int(iso[8:])))
    ordre = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
    def contexte(tm):
        c = None
        for r in rows:
            if r.get('en') or r['k'] == 'foi': continue
            if mn(r['t']) <= tm: c = r
        return c
    def fin_de(c):
        return min(mn(r['t']) for r in rows if not r.get('en') and r['k'] != 'foi' and mn(r['t']) > mn(c['t']))
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
        elif titre == 'Départ pour le cours':
            d = 'Au cours, à la première pause, avant ' + suite + ' : ablutions, puis la prière.'
        elif titre.startswith('Lance la machine'):
            d = 'Pendant que l’eau des pâtes chauffe : ablutions, puis la prière.'
        elif titre.startswith('Batch cooking'):
            d = 'Pendant que tout refroidit : ablutions, puis la prière.'
        elif titre.startswith('Le coiffeur'):
            t, en, d = mn('15:45'), False, 'Après le rangement des courses : ablutions, puis la prière.'
        elif titre == 'Espagnol · tutor':
            t, en, d = fin_de(c), False, 'Juste après le tuteur : ablutions, puis la prière.'
        elif titre.startswith('Déjeuner') or titre == 'Dîner':
            d = 'Juste après le ' + ('déjeuner' if titre.startswith('Déjeuner') else 'dîner') + ' : ablutions, puis la prière.'
        elif c and c['k'] in ('etude', 'projet', 'esp'):
            d = 'Une pause de 5 min : ablutions, puis la prière.'
        elif c and c['k'] == 'sport':
            d = 'Après la séance : ablutions, puis la prière.'
        rows.append({'t': hh(t), 'k': 'foi', 'en': en, 'titre': n + (' (' + PR[n] + ')' if hh(t) != PR[n] else ''), 'd': d})
    rows.sort(key=lambda r: (mn(r['t']), 0 if (r['k'] == 'foi' and not r.get('en')) else (3 if r.get('en') else (2 if r.get('fin') else 1))))
    jours.append({'iso': iso, 'dow': dow, 'jour': JOURS[dow], 'court': COURT[dow], 'num': int(iso[8:]),
                  'rattrapage': 'Révisions : %d h %02d dans la journée' % (total_rev // 60, total_rev % 60) + ((' · %s au minuteur, comme le tableau de bord' % ((('%d h %02d' % (J['cible']['rev'] // 60, J['cible']['rev'] % 60)) if J['cible']['rev'] % 60 else ('%d h' % (J['cible']['rev'] // 60))) if J['cible']['rev'] >= 60 else ('%d min' % J['cible']['rev']))) if J.get('cible') else ''),
                  'prieres': prieres(int(iso[8:])), 'notes': NOTES[dow], 'enPlus': EN_PLUS[dow], 'rows': rows})

MOIS = ['Le frigo vidé et nettoyé, le samedi des courses, avant de ranger.', 'Le filtre et le joint de la machine à laver nettoyés.', 'La bouilloire et la cuve du rice cooker détartrées (l’eau d’Alicante est calcaire).', 'Les factures et le budget relus le 24, avant le virement du 25.']
PLUS_RARE = ['Brosse à dents : tous les 3 mois (la Batcave te le rappelle).', 'Coiffeur : toutes les 3 semaines, le prochain le samedi 12 décembre.', 'Oreiller lavé : tous les 3 à 6 mois.', 'Couette lavée : 1 à 2 fois par an, en laverie si elle ne rentre pas dans ta machine.']
data = {'jours': jours, 'chaqueJour': CHAQUE_JOUR, 'mois': MOIS, 'plusRare': PLUS_RARE}
json.dump(data, open(SP + 'data16.json', 'w'), ensure_ascii=False, indent=0)
t = open(SP + 'template16.html', encoding='utf-8').read()
s = json.dumps(data, ensure_ascii=False)
assert '</script' not in s.lower()
open(SP + '../../semaine-du-16-novembre.html', 'w', encoding='utf-8').write(t.replace('__DATA__', s))
for j in jours: print(j['iso'], len(j['rows']), 'lignes', j['rattrapage'], j['prieres'][0])
