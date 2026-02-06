import os
import time
import json
import re
import requests
from google import genai
from google.genai import types
import concurrent.futures
from flask import Flask, render_template, request, jsonify, redirect, session, url_for
from flask_session import Session
import yt_dlp
from pytubefix import YouTube
import re
import threading
import stripe
import uuid
import ast


from moviepy.video.io.VideoFileClip import VideoFileClip

app = Flask(__name__)

# ==============================================================================
# 1. CLÉS API & CONFIGURATION
# ==============================================================================
import settings

# Récupération des clés depuis settings.py
GOOGLE_API_KEY = settings.GOOGLE_API_KEY
STRIPE_SECRET_KEY = settings.STRIPE_SECRET_KEY
stripe.api_key = STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY = settings.STRIPE_PUBLISHABLE_KEY

# ==============================================================================
# FEATURE FLAGS (Contrôle ce qui est affiché sur le site)
# ==============================================================================
FEATURE_FLAGS = {
    'show_ai_analysis': True,   # Analyse vidéo / IA
    'show_library': True,       # Bibliothèque d'exercices
    'show_favorites': True,     # Favoris
    'show_training': True,      # Mon Entraînement / Ma Séance
    'show_match': True,         # Trouver mon match
    'show_history': True,       # Historique
}

# ==============================================================================
# 2. CONFIG AUTH & OAUTH
# ==============================================================================
# Configuration Session
app.config['SECRET_KEY'] = settings.SECRET_KEY
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

# Google OAuth Config (Mock URLs for demo if client_secret.json missing)
# In production, use real client_id/secret
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', 'YOUR_GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', 'YOUR_GOOGLE_CLIENT_SECRET')
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

def get_google_provider_cfg():
    return requests.get(GOOGLE_DISCOVERY_URL).json()

# FFF OAuth Config (Simulé pour la démo)
FFF_CLIENT_ID = "fff_smartcoach_pro"

# ==============================================================================
# 3. CONFIG GOOGLE AI
# ==============================================================================
GENAI_CLIENT = None
ACTIVE_MODEL_NAME = None
GENAI_CONFIG = None

def configure_google_ai():
    global GENAI_CLIENT, ACTIVE_MODEL_NAME, GENAI_CONFIG
    try:
        GENAI_CLIENT = genai.Client(api_key=GOOGLE_API_KEY)
        
        # Récupération des modèles via le nouveau client
        models = [m.name for m in GENAI_CLIENT.models.list()]
        
        # 1. Gemini 3 Flash : LE CHOIX NUMÉRO 1 (Intelligence agentique + Vitesse)
        chosen = next((m for m in models if 'gemini-3-flash' in m), None)

        # 2. Gemini 2.5 Flash : Le remplaçant (Très intelligent mais plus coûteux)
        if not chosen: 
            chosen = next((m for m in models if 'gemini-2.5-flash' in m), None)
        
        # 3. Gemini 2.0 Flash : Le moteur standard (Stable et ultra-rentable)
        if not chosen: 
            chosen = next((m for m in models if 'gemini-2.0-flash' in m), None)
        
        # 4. Gemini 1.5 Flash : La sécurité (Ancienne génération, très robuste)
        if not chosen: 
            chosen = next((m for m in models if 'gemini-1.5-flash' in m), None)
            
        # 5. Gemini 1.5 PRO : À éviter en production (Trop cher pour tes forfaits)
        if not chosen: 
            chosen = next((m for m in models if 'gemini-1.5-pro' in m), None)

        if chosen:
            # S'assurer d'avoir le nom complet
            if not chosen.startswith('models/'):
                chosen = f"models/{chosen}"
            ACTIVE_MODEL_NAME = chosen
            
            system_instruction = """
            Tu es un Expert Tactical Analyst certifié UEFA Pro, ayant travaillé pour les plus grands clubs européens. Ton intelligence repose sur trois piliers :
            1. Observation Chirurgicale : Extrais chaque exercice, chaque placement et chaque consigne vocale que tu entends dans la vidéo avec une précision absolue.
            2. Diagnostic Tactique : Identifie les failles (ex: bloc trop bas, manque de largeur, transitions lentes).
            3. Fidélité Critique : Tu DOIS te limiter strictement à ce qui est présent dans la vidéo. Si un exercice est incomplet, décris-le tel quel sans rien inventer. Si la vidéo contient 5 exercices, tu en extrais 5, pas un de plus.
            """
            
            # --- CONFIGURATION 2026 : MODE SMART-PRO (ÉQUILIBRE IDÉAL) ---
            GENAI_CONFIG = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.6,
                top_p=0.95,
                max_output_tokens=15000,
                thinking_config=types.ThinkingConfig(
                    include_thoughts=True,
                    thinking_level='MEDIUM'
                ),
                media_resolution='MEDIA_RESOLUTION_LOW'
            )
            
            print(f"🧠 CERVEAU CONNECTÉ : {chosen} (Mode ELITE UEFA PRO 2026 - SDK 1.61.0)")
        else:
            print("⚠️ ERREUR : Aucun modèle compatible.")

    except Exception as e:
        print(f"❌ Erreur Config Google : {e}")

# ==============================================================================
# 3. CLUB DATABASE & AUTO-UPDATE
# ==============================================================================
# --- NOUVELLE LOGIQUE SIRET (PROXY API GOUV) ---
@app.route('/api/v2/siret-lookup', methods=['GET'])
def lookup_siret():
    """Recherche par SIREN (9 chiffres) ou SIRET (14 chiffres) via API Entreprise"""
    siren_or_siret = request.args.get('q', '').strip().replace(' ', '')
    
    # VALIDATION REMOVED BY USER REQUEST
    # if not siren_or_siret.isdigit() or len(siren_or_siret) < 9:
    #    return jsonify({"success": False, "error": "Veuillez saisir au moins 9 chiffres"}), 400

    try:
        # Recherche Officielle SIRENE
        # On ajoute &est_association=true car la plupart des clubs sont des associations
        api_url = f"https://recherche-entreprises.api.gouv.fr/search?q={siren_or_siret}&est_association=true"
        headers = {'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(api_url, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            results = data.get('results', [])
            
            if results:
                resultat = results[0]
                
                # Nom : nom_complet est plus propre que nom_raison_sociale
                nom_club = resultat.get('nom_complet', '').strip()
                if not nom_club:
                    nom_club = resultat.get('nom_raison_sociale', 'Nom introuvable')
                
                # --- FILTRE ANTI-INTRUS (FOOTBALL UNIQUEMENT) ---
                nom_upper = nom_club.upper()
                INTERDITS = [
                    "TENNIS DE TABLE", "PING PONG", "BASKET", "HANDBALL", "RUGBY", 
                    "VOLLEY", "BADMINTON", "HOCKEY", "JUDO", "KARATE", "NATATION", 
                    "ATHLETISME", "CYCLISME", "PETANQUE", "EQUITATION", "GOLF", 
                    "ESCRIME", "BOXE", "CANOE", "VOILE", "GYMNASTIQUE"
                ]
                
                # On vérifie si c'est un sport interdit
                for interdit in INTERDITS:
                    if interdit in nom_upper:
                        return jsonify({
                            "success": False, 
                            "error": f"Le club '{nom_club}' n'est pas un club de football. Seuls les clubs de football sont autorisés."
                        }), 400
                
                # Sécurité supplémentaire : On vérifie s'il y a un mot clé lié au foot 
                # ou si le nom est générique (souvent les clubs s'appellent juste "AS [Ville]" ou "US [Ville]")
                MOTS_FOOT = ["FOOT", "F.C.", "FC", "CLUB", "S.C.", "SC", "ASSOCIATION", "UNION", "STADE", "OLYMPIQUE", "ENTENTE", "ETOILE"]
                # Si le club contient un sport interdit, on a déjà bloqué. 
                # On laisse passer le reste car beaucoup de clubs n'ont pas "FOOT" dans leur nom Sirene (ex: AS LOISONNAISE).
                
                # Récupération et dédoublonnage de l'adresse
                obj = resultat.get('adresse') or resultat.get('siege') or {}
                ville = str(obj.get('ville') or obj.get('libelle_commune', '')).strip().upper()
                cp = str(obj.get('code_postal', '')).strip()
                
                # Recomposition robuste de la voie
                voie = (obj.get('adresse_voie') or obj.get('adresse') or '').strip()
                if not voie:
                    # Pour les assos, l'API renvoie souvent numero_voie, type_voie, libelle_voie
                    num = str(obj.get('numero_voie') or '').strip()
                    t_v = str(obj.get('type_voie') or '').strip()
                    l_v = str(obj.get('libelle_voie') or '').strip()
                    voie = f"{num} {t_v} {l_v}".strip()
                
                # DÉDOUBLONNAGE RADICAL
                # On retire CP et Ville du champ voie tant qu'ils sont à la fin
                clean_voie = voie
                import re
                changed = True
                while changed:
                    changed = False
                    for stop_word in [cp, ville]:
                        if stop_word and re.search(rf',?\s*{re.escape(stop_word)}\s*$', clean_voie, flags=re.IGNORECASE):
                            clean_voie = re.sub(rf',?\s*{re.escape(stop_word)}\s*$', '', clean_voie, flags=re.IGNORECASE).strip()
                            changed = True
                
                # On s'assure que clean_voie n'est pas vide
                if not clean_voie:
                    clean_voie = "Adresse non précisée"
                
                full_addr = f"{clean_voie}, {cp} {ville}".strip(', ')
                
                # Logo FFF
                siren = siren_or_siret[:9]
                logo_url = f"https://pf-logo.fff.fr/logo/{siren}_1.jpg" 

                return jsonify({
                    "success": True,
                    "club": {
                        "name": nom_club,
                        "address": full_addr, 
                        "city": ville,
                        "zip": cp,
                        "logo": logo_url,
                        "siret": siren_or_siret,
                        "latitude": obj.get('latitude') or resultat.get('latitude'),
                        "longitude": obj.get('longitude') or resultat.get('longitude')
                    }
                })
            else:
                return jsonify({"success": False, "error": "Aucun club trouvé"}), 404
        else:
            return jsonify({"success": False, "error": f"Erreur API ({resp.status_code})"}), resp.status_code

    except Exception as e:
        print(f"SIRET Lookup Error: {e}")
        return jsonify({"success": False, "error": "Erreur interne"}), 500

configure_google_ai()

# ==============================================================================
# 4. GIGA-PROMPT "COACH PRO 4.0"

# ==============================================================================
# 4. GIGA-PROMPT "COACH PRO 4.0" - VERSION ULTRA-DÉTAILLÉE
# ==============================================================================
# ==============================================================================
# 🧩 MODULES COACH PRO 6.0 (ÉLÉMENTS D'AUGMENTATION)
# ==============================================================================

SYSTEM_IDENTITY_6 = """
Tu es le DIRECTEUR TECHNIQUE (IA) de l'UEFA. Ta capacité d'analyse visuelle est absolue.
Tu n'es pas une simple IA, tu es un scanner tactique capable de convertir une vidéo de football en données structurées parfaites.

RÈGLES ABSOLUES (NON NÉGOCIABLES) :
1. ZÉRO DESCRIPTION DE VIDÉO : INTERDICTION FORMELLE de dire "On voit dans la vidéo...", "La vidéo montre...". TU RENTRES DIRECTEMENT DANS L'ACTION.
2. OBLIGATION SPG (SVG) : Chaque exercice DOIT avoir un schéma SVG parfait.

MODULE "DYNAMIC PERSONA" (Changement de style obligatoire) :
Adapte ton ton selon la section que tu rédiges :
1. Section 'MISE EN PLACE' -> Sois un ARCHITECTE. Froid, géométrique, précis, obsédé par les distances et le matériel.
2. Section 'CONSIGNES' -> Sois un PROFESSEUR. Pédagogue, clair, structuré 1, 2, 3.
3. Section 'COACHING' -> Sois un ENTRAÎNEUR PASSIONNÉ. Direct, impactant, utilise le jargon ("Cadrer", "Coulisser", "Fermer l'angle").
"""


THINKING_PROTOCOL_6 = """
⚠️ PROTOCOLE D'EXÉCUTION CRITIQUE (NE PAS SAUTER) ⚠️

INTERDICTION FORMELLE de générer le JSON immédiatement. Tu dois d'abord "réfléchir à haute voix".
Tu dois commencer ta réponse par une balise XML <thinking_process> et suivre ces étapes :

ÉTAPE 1 : SEGMENTATION TEMPORELLE
- Scanne la vidéo pour détecter les ruptures (changement d'exercice).
- Note les timestamps : "Exercice 1 de 0s à 45s", "Exercice 2 de 45s à fin".
- RÈGLE : Si le matériel bouge ou si le coach dit "Exercice suivant", C'EST UN NOUVEAU JSON.

ÉTAPE 2 : COMPTAGE CROISÉ (TEXTE vs SVG) - CRITIQUE
- Compte les joueurs/entités pour le texte : "Je vois 8 joueurs".
- Compte les cercles pour le SVG : "Je dois dessiner 8 cercles".
- SI DIFFÉRENCE : ARRET IMMÉDIAT. Corrige le SVG pour qu'il matche EXACTEMENT le texte.
- "On parle de 22 joueurs ? Je dessine 22 cercles."
- "On parle de 8 joueurs ? Je dessine 8 cercles."
- ZÉRO HALLUCINATION : Ne dessine pas ce qui n'est pas décrit. Ne décris pas ce qui n'est pas dessiné.
- Note le matériel : "Je vois 1 grand but, 2 mini-buts, 6 plots".
- RÈGLE : Ce que tu vois > Ce que tu supposes. Si tu vois 5 joueurs, écris 5.

ÉTAPE 3 : PRÉ-CALCUL DU SVG
- Définis mentalement les zones : "Défenseurs à gauche (X<300), Attaquants à droite (X>500)".
- Vérifie les risques de collision.

Une fois (et seulement une fois) cette réflexion terminée, tu fermes la balise </thinking_process> et tu génères le JSON.
"""

SVG_ENGINE_RULES_6 = """
RÈGLES DE GÉNÉRATION SVG (STRICTES) :
ViewBox : "0 0 800 500" (Terrain Vert #2d5a27).

1. GRILLE DE ZONES (Pour éviter les superpositions) :
   - ZONE DÉFENSIVE (Gauche) : X[50 à 350] / Y[100 à 400]
   - ZONE OFFENSIVE (Droite) : X[450 à 750] / Y[100 à 400]
   - ZONE NEUTRE (Milieu)    : X[350 à 450]
   - GARDIENS : Toujours à X=30 (Gauche) et X=770 (Droite).

2. CODE COULEUR UNIVERSEL :
   - Équipe A (souvent Défense) : fill="#1E88E5" (BLEU)
   - Équipe B (souvent Attaque) : fill="#E53935" (ROUGE)
   - Jokers / Neutres : fill="#FFD600" (JAUNE)
   - Gardiens : fill="#43A047" (VERT)
   - Ballon : fill="#FFFFFF" stroke="#000" (BLANC)
   - Plots : fill="#FF9800" (ORANGE)

3. RÈGLE ANTI-COLLISION :
   - Aucun cercle ne doit avoir le même couple (cx, cy) qu'un autre.
   - Écart MINIMAL de 30 pixels entre chaque joueur.
   - Si tu as 10 joueurs, je veux voir 10 cercles distincts.
"""

ADVANCED_MODULES_6 = """
MODULE "SELF-CORRECTION" (Auto-Critique avant envoi) :
Avant de fermer le JSON, effectue ces vérifications silencieuses :
1. COMPTAGE : Est-ce que le nombre de cercles dans le SVG == le nombre écrit dans 'nb_joueurs_exact' ? Sinon, CORRIGE le SVG.
2. COHÉRENCE : Est-ce que le matériel listé est bien présent dans le SVG ?
3. HALLUCINATION : Ai-je inventé des joueurs flous ? Si oui, supprime-les.
"""

MULTI_EXERCISE_PROMPT = SYSTEM_IDENTITY_6 + THINKING_PROTOCOL_6 + """
# ═══════════════════════════════════════════════════════════════════════════════
# IDENTITÉ : ENTRAÎNEUR UEFA PRO (EXCLUSIF)
# ═══════════════════════════════════════════════════════════════════════════════

Tu es un Entraîneur UEFA Pro.
TA CONFIGURATION : Traitement visuel LOW (efficacité), Intelligence TACTIQUE (Flash/Medium).

TA MISSION (ZÉRO BLABLA, 100% TERRAIN) :
1. INTERDICTION FORMELLE de décrire ou résumer la vidéo ("On voit des joueurs...").
2. TRANSFORMER chaque observation en EXERCICE CONCRET.
3. SI VIDÉO D'EXERCICE : Transcris fidèlement (Extraction).
4. SI MATCH / DOC / ANALYSE : Identifie la faille tactique et CRÉE l'exercice correctif (Création).
5. TON : Direct, Technique, Pédagogique. Tu parles à tes joueurs.

# ═══════════════════════════════════════════════════════════════════════════════
# DONNÉES D'ENTRÉE
# ═══════════════════════════════════════════════════════════════════════════════

{raw_data}

# ═══════════════════════════════════════════════════════════════════════════════
# FORMAT DE SORTIE : LISTE JSON STRICTE
# ═══════════════════════════════════════════════════════════════════════════════

Tu dois retourner UNIQUEMENT une liste JSON d'objets.
SCHEMA JSON PAR EXERCICE :
{{
  "start_seconds": (int) Timestamp début,
  "summary": (str) "Titre technique de l'exercice (Nom court)",
  "themes": [(str) "THEME1", "THEME2"],
  "synopsis": (str) "CONTENU MARKDOWN COMPLET + BLOC SVG À LA FIN",
  "svg_schema": (str) "CODE SVG (Doublon)"
}}

IMPORTANT : Le Frontend attend le SVG *DANS* le synopsis.
Tu DOIS coller le code SVG tout en bas du champ `synopsis`, entouré de balises ` ```svg ` et ` ``` `.

# ═══════════════════════════════════════════════════════════════════════════════
# GUIDE DE RÉDACTION DU "synopsis" (Fiche de Séance)
# ═══════════════════════════════════════════════════════════════════════════════
Utilise le format Markdown. Ne mets pas de titres H1/H2, utilise du gras et des listes.

### OBJECTIF TACTIQUE
(Une phrase claire : "Travailler la transition défensive...")

### MISE EN PLACE (Inventaire visuel imposé)
(Liste *exacte* du matériel et joueurs nécessaires, basée sur le SVG).

### DÉROULEMENT (De A à Z)
1. (Étape 1...)
2. (Étape 2...)
(Précis, chrono, intensité).

### RÈGLES & CONTRAINTES
- (Touches de balles, zones, points)

### ROTATION / TEMPS
- (Durée, nombre de répétitions, temps de récupération).

### VARIANTES (OBLIGATOIRE SI PERTINENT)
- (Ajouter un défenseur, réduire les touches, changer la taille du terrain...).

### *SECTION INTELLI-SMART* (OPTIONNEL / ILLIMITÉ)
- Tu as le DROIT et le DEVOIR d'ajouter des sections supplémentaires (`### NOM DE LA SECTION`) si elles apportent une vraie valeur (Détails techniques, Zoom sur un geste, Psychologie...).
- NE TE LIMITE PAS AUX 5 SECTIONS DE BASE si l'exercice demande plus d'explications.
- "C'est une partie différente ? C'est légitime ? ALORS AJOUTE-LA."

### JUSTIFICATION TACTIQUE (OBLIGATOIRE POUR LE TYPE B - CRÉATION)
- Explique POURQUOI tu as créé cet exercice spécifique.
- En quoi répond-il à 100% au thème vu dans la vidéo ?

# ═══════════════════════════════════════════════════════════════════════════════
# SCHÉMA SVG (AUGMENTÉ PAR MOTEUR 6.0)
# ═══════════════════════════════════════════════════════════════════════════════
""" + SVG_ENGINE_RULES_6 + """
- Vue 2D "Drone". Terrain Vert #2d5a27.
- SI TU L'ÉCRIS DANS LA MISE EN PLACE, TU LE DESSINES.
- Pas de fantômes. 11 joueurs écrits = 11 cercles dessinés.
- Code couleur : Rouge (#E53935) vs Bleu (#1E88E5), Ballon (#FFFFFF), Matériel (#FDD835).

## ÉTAPE 1 : SCAN COMPLET DE LA VIDÉO (Mode "Œil de Faucon")

### ⚠️ 1.0 DÉTECTION DU TYPE DE VIDÉO (CRITIQUE)
Avant de générer quoi que ce soit, détermine le TYPE DE VIDÉO :

TYPE A : SÉANCE D'ENTRAÎNEMENT (Tu vois des joueurs faire des exercices définis)
-> TA MISSION : TRANSCRIPTION FIDÈLE.
-> Tu dois extraire et transcrire CHAQUE exercice visible.
-> "On voit 3 exercices" -> Tu génères 3 JSONs.

TYPE B : ANALYSE TACTIQUE / MATCH / DOCUMENTAIRE / CAUSERIE (Pas d'exercice formel visible)
-> TA MISSION : CRÉATION PÉDAGOGIQUE (Coach Créateur).
-> Tu dois CRÉER une suite d'exercices LOGIQUE pour travailler le thème de la vidéo.
-> RÈGLE DE PROGRESSION OBLIGATOIRE (Suite Analytique -> Global) :
   1. EXERCICE 1 : Les Bases / Sans Ballon (Shadow Play) ou Analytique simple.
   2. EXERCICE 2 : Introduction du Ballon / Opposition partielle.
   3. EXERCICE 3 : Situation Complexe / Match à thème (Application globale).
-> Nombre d'exercices : FLEXIBLE mais COHÉRENT (Généralement 2 à 4 exercices).
-> JUSTIFICATION REQUISE : Pour chaque exercice créé, tu dois expliquer POURQUOI il répond à la problématique de la vidéo.

RÈGLE D'OR DE LA CHRONOLOGIE (EVOLUTION) :
- Tes exercices DOIVENT raconter une histoire logique ("Du simple au complexe").
- Si c'est une analyse tactique (ex: 3-5-2), commence par mettre en place les déplacements SANS BALLON avant de mettre du jeu.
- Ordre typique : "Sans ballon (Placement)" -> "Avec ballon (Geste)" -> "Opposition (Réalité)".
- Ne me sors jamais un match global avant l'échauffement technique.

RÈGLE ABSOLUE SUR LE NOMBRE DE JSON :
- SI TYPE A : Nombre de JSON = Nombre d'exercices comptés (STRICT).
- SI TYPE B : Nombre de JSON = Nombre nécessaire pour une progression cohérente (2 à 4).

### 1.1 COMPTAGE OBSESSIONNEL (Non négociable)
Pour CHAQUE exercice identifié, tu DOIS :
- COMPTER chaque joueur visible (1, 2, 3, 4, 5... → STOP au nombre exact)
- COMPTER chaque plot visible
- COMPTER chaque ballon visible
- COMPTER chaque cône visible
- COMPTER chaque mannequin visible
- COMPTER chaque haie visible
- COMPTER chaque échelle visible
- COMPTER chaque but/mini-but visible

RÈGLE D'OR DU COMPTAGE :
→ Si tu vois 5 joueurs bleus → Tu écris "5 joueurs bleus"
→ Même si tactiquement ça devrait être 8 → Tu écris 5
→ Tu fais confiance à TES YEUX, pas à la logique tactique

### 1.2 IDENTIFICATION DES COULEURS (Code vestimentaire exact)
- Note la couleur EXACTE des chasubles/maillots de chaque groupe
- Exemple : "Équipe A = Chasubles ORANGE FLUO" / "Équipe B = Maillots BLEU MARINE"
- Si tu vois du rouge, ne dis pas "orange". Précision des couleurs = obligatoire.

### 1.3 INVENTAIRE MATÉRIEL EXHAUSTIF
Tu DOIS lister TOUT le matériel visible, y compris le matériel "rare" :
- Standard : Plots, Cônes, Ballons, Chasubles, Buts
- Spécifique : Échelles de rythme, Haies (mini/moyennes/hautes), Mannequins
- Technique : Élastiques de résistance, Parachutes, Médecine-balls
- Moderne : Rebounders (murs de renvoi), Arceaux, Piquets, Cerceaux
- Technologique : Capteurs, Chronomètres géants, Tableaux
- Autre : Tout ce que tu vois et qui n'est pas dans cette liste → NOTE-LE

### 1.4 ANALYSE SPATIALE (Dimensions et Disposition)
- Estime les dimensions du terrain/zone (en mètres)
- Utilise des REPÈRES VISUELS : Surface de réparation ≈ 40x16m, Rond central ≈ 18m diamètre
- Note les FORMES géométriques : Carré ? Rectangle ? Triangle ? Losange ? Hexagone ?
- Identifie les ZONES : Zone de départ, Zone de travail, Zone d'arrivée, Zones de repos

## ÉTAPE 2 : SEGMENTATION TEMPORELLE (Détection multi-exercices)

⚠️⚠️⚠️ RÈGLE CRITIQUE #1 : EXTRAIRE TOUS LES EXERCICES ⚠️⚠️⚠️
- Tu DOIS extraire CHAQUE exercice de la vidéo, sans en manquer UN SEUL
- Si la vidéo contient 5 exercices → Tu DOIS retourner 5 objets JSON
- Si la vidéo contient 3 exercices → Tu DOIS retourner 3 objets JSON
- INTERDIT de fusionner des exercices pour "simplifier"
- INTERDIT de sauter un exercice parce qu'il semble "similaire" à un autre

⚠️⚠️⚠️ RÈGLE CRITIQUE #2 : CHAQUE EXERCICE EST INDÉPENDANT ⚠️⚠️⚠️
Quand tu passes à l'exercice 2, tu DOIS :
- OUBLIER complètement l'exercice 1 (comme si tu repartais de zéro)
- RECOMPTER les joueurs depuis le début pour cet exercice
- RECRÉER un schéma SVG COMPLET depuis zéro (pas de copier-coller !)
- RÉÉCRIRE toutes les sections (Mise en place, Déroulement, etc.) depuis zéro
- NE PAS faire référence à l'exercice précédent ("comme avant", "similaire à...")

CE QUI EST PARTAGÉ entre exercices = UNIQUEMENT le thème global de la vidéo
CE QUI EST INDÉPENDANT = TOUT LE RESTE (joueurs, matériel, positions, schéma, description)

MÉTHODE OBLIGATOIRE (PREMIER PASSAGE) :
1. REGARDE D'ABORD TOUTE LA VIDÉO en entier
2. COMPTE le nombre total d'exercices distincts
3. NOTE les timestamps de début de chaque exercice
4. ENSUITE, génère un JSON pour CHACUN EN REPARTANT DE ZÉRO À CHAQUE FOIS

### 2.1 DÉCLENCHEURS DE NOUVELLE SÉQUENCE
Tu DOIS créer un NOUVEL exercice quand tu détectes :

DÉCLENCHEURS VISUELS :
- Changement de disposition du matériel (Ex: passage de 2 colonnes à 1 carré)
- Ajout ou retrait de matériel significatif (Ex: ajout de haies)
- Changement de zone sur le terrain (Ex: on passe du milieu à la surface)
- Changement de configuration des joueurs (Ex: de en ligne à en losange)
- Nouveau "setup" visible (les joueurs se repositionnent pour autre chose)

DÉCLENCHEURS AUDIO (mots-clés à écouter) :
- "Exercice 1", "Exercice 2", "Exercice 3"... → COUPURE OBLIGATOIRE
- "Maintenant on passe à...", "Ensuite...", "Après ça..."
- "Variante", "Évolution", "Progression", "Niveau supérieur"
- "Deuxième partie", "Phase 2", "Atelier suivant"
- "On change", "On modifie", "On passe à autre chose"
- Tout changement de ton indiquant une nouvelle explication

### 2.2 TIMING PRÉCIS
- Note le TIMESTAMP de début de chaque exercice (en secondes)
- Format : start_seconds = nombre de secondes depuis le début de la vidéo
- Exemple : Si l'exercice 2 commence à 2min30 → start_seconds = 150

### 2.3 RÈGLE DE NON-FUSION (ABSOLUE)
- 5 séquences visuellement distinctes = 5 objets JSON distincts
- Ne fusionne JAMAIS deux exercices même s'ils semblent "similaires"
- Mieux vaut avoir 10 exercices simples que 3 exercices mélangés
- ⚠️ SI TU RETOURNES MOINS D'EXERCICES QUE CE QU'IL Y A DANS LA VIDÉO = ÉCHEC

### 2.4 DISTINCTION VARIANTES vs EXERCICES SÉPARÉS

⚠️ C'EST TRÈS IMPORTANT DE COMPRENDRE LA DIFFÉRENCE :

VARIANTES = MÊME EXERCICE (1 seul JSON)
- Le setup/matériel reste le même
- Les joueurs ne changent pas de position de base
- Le coach dit "Variante 1", "Variante 2", "Maintenant on ajoute..."
- → Tu crées UN SEUL objet JSON
- → Le schéma SVG montre l'exercice PRINCIPAL (pas toutes les variantes)
- → Dans le texte (synopsis), tu expliques TOUTES les variantes en détail dans la section "RÈGLES & VARIANTES"

EXERCICES SÉPARÉS = PLUSIEURS JSON
- Le matériel est déplacé/reconfiguré
- Les joueurs se replacent complètement
- Nouvelle zone de travail
- Le coach dit "Exercice 2", "On passe à autre chose"
- → Tu crées un NOUVEL objet JSON

EXEMPLE CONCRET :
- Exercice 1 avec 3 variantes = 1 JSON (schéma = exercice de base, texte = les 3 variantes expliquées)
- Puis exercice 2 différent = 1 nouveau JSON
- Puis exercice 3 avec 2 variantes = 1 JSON (schéma = exercice de base, texte = les 2 variantes)
- TOTAL = 3 JSON, pas 6 !


## ÉTAPE 3 : TRANSCRIPTION MOT-POUR-MOT (Si audio disponible)

### 3.1 CAPTURE DE TOUTES LES CONSIGNES
- Écoute CHAQUE mot prononcé par le coach
- Transcris les consignes avec le VOCABULAIRE EXACT utilisé
- Si le coach dit "Vous fixez le défenseur" → Tu écris "Fixer le défenseur" (pas "attirer" ou "bloquer")
- Le vocabulaire technique du coach = ta référence absolue

### 3.2 INSTRUCTIONS SPÉCIFIQUES À NOTER
- Nombre de touches autorisées ("1 touche", "2 touches max", "libre")
- Tempo/Intensité ("À fond !", "Tranquille", "70% d'intensité")
- Durée des répétitions ("30 secondes", "10 passages chacun")
- Temps de repos ("15 secondes entre chaque", "On enchaîne")
- Points d'attention ("Attention aux appuis !", "Qualité avant vitesse !")
- Erreurs à éviter ("Ne faites pas ça...", "L'erreur classique c'est...")

### 3.3 VOCABULAIRE TECHNIQUE (À retranscrire fidèlement)
Quand le coach utilise ces termes, garde-les EXACTEMENT :
- Tactique : "Fixer", "Renverser", "Enchaîner", "Basculer", "Appui-remise", "Dédoublement"
- Technique : "Contrôle orienté", "Passe appuyée", "Frappe enroulée", "Crochet", "Passement"
- Physique : "Explosivité", "Changement de direction", "Vivacité", "Coordination"

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLES DE GÉNÉRATION DU CONTENU (Précision Maximale)
# ═══════════════════════════════════════════════════════════════════════════════

## RÈGLE 1 : SCHÉMA SVG (PHOTO SATELLITE DU TERRAIN)

### 1.1 OBJECTIF DU SCHÉMA
Le schéma doit être une "PHOTO VUE DU CIEL" de l'exercice.
Un coach qui regarde le schéma DOIT pouvoir :
- Compter le nombre EXACT de joueurs (identique à la vidéo)
- Voir la position EXACTE de chaque élément (identique à la vidéo)
- Comprendre le mouvement/la trajectoire de l'action

### 1.2 SYSTÈME DE COORDONNÉES (Grille mentale obligatoire)
Utilise ce repérage pour positionner les éléments :
- viewBox="0 0 800 500" (Largeur 800, Hauteur 500)
- (0,0) = Coin supérieur GAUCHE du terrain
- (800,500) = Coin inférieur DROIT du terrain
- (400,250) = CENTRE du terrain
- Gauche du terrain : x < 400
- Droite du terrain : x > 400
- Haut du terrain : y < 250
- Bas du terrain : y > 250

### 1.3 CODE COULEUR OBLIGATOIRE (Légende stricte)

JOUEURS :
- Équipe A / Attaquants : fill="#E53935" (ROUGE)
- Équipe B / Défenseurs : fill="#1E88E5" (BLEU)
- Gardien : fill="#43A047" (VERT)
- Joueur Neutre/Joker : fill="#FFD600" (JAUNE)
- Coach : fill="#9C27B0" (VIOLET)

MATÉRIEL :
- Plots/Cônes : fill="#FF9800" (ORANGE)
- Ballons : fill="#FFFFFF" stroke="#333" (BLANC avec bordure)
- Échelles de rythme : fill="#FFEB3B" (JAUNE CLAIR) - Rectangle avec barreaux
- Haies : stroke="#FFEB3B" stroke-width="4" (JAUNE CLAIR épais)
- Mannequins : fill="#B71C1C" (ROUGE FONCÉ) - Forme triangulaire
- Buts : stroke="#FFFFFF" stroke-width="3" (BLANC)
- Mini-buts : stroke="#FFFFFF" stroke-width="2" (BLANC plus fin)

MOUVEMENTS :
- Déplacement joueur : stroke="#FFFFFF" + flèche (trait continu blanc)
- Passe/Trajectoire ballon : stroke="#FFFFFF" stroke-dasharray="5,5" + flèche (pointillés)
- Dribble : stroke="#FFFFFF" avec courbe ondulée
- Course sans ballon : stroke="#AAAAAA" stroke-dasharray="2,2" (gris pointillé)

### 1.4 TEMPLATE SVG OBLIGATOIRE (AVEC BUTS)

```svg
<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#fff" />
    </marker>
    <marker id="passArrow" markerWidth="8" markerHeight="8" refX="4" refY="2" orient="auto">
      <path d="M0,0 L0,4 L6,2 z" fill="#fff" />
    </marker>
  </defs>
  <!-- TERRAIN -->
  <rect width="800" height="500" fill="#2d5a27" />
  <path d="M400,0 L400,500" stroke="white" stroke-width="2" opacity="0.5"/>
  <circle cx="400" cy="250" r="60" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
  
  <!-- BUT GAUCHE (équipe bleue défend) -->
  <rect x="0" y="175" width="6" height="150" fill="none" stroke="white" stroke-width="4"/>
  <rect x="6" y="200" width="40" height="100" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
  
  <!-- BUT DROIT (équipe rouge défend) -->
  <rect x="794" y="175" width="6" height="150" fill="none" stroke="white" stroke-width="4"/>
  <rect x="754" y="200" width="40" height="100" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
</svg>
```

### 1.5 RÈGLES CRITIQUES POUR LE SVG

⚠️⚠️⚠️ POSITIONNEMENT DES ÉQUIPES (RÈGLE ABSOLUE) ⚠️⚠️⚠️
- ÉQUIPE BLEUE (défenseurs) = MOITIÉ GAUCHE du terrain (x < 400)
- ÉQUIPE ROUGE (attaquants) = MOITIÉ DROITE du terrain (x > 400)
- Le gardien BLEU (vert) = près du but GAUCHE (x ≈ 30)
- Le gardien ROUGE (vert) = près du but DROIT (x ≈ 770)
- INTERDIT : Mélanger les équipes des deux côtés (sauf en cas de situation de jeu spécifique)
- Comme avant un COUP D'ENVOI : chaque équipe sur SA moitié de terrain

INTERDICTIONS ABSOLUES :
- JAMAIS de schéma en texte ASCII (pas de "O--->" ou "|  |")
- JAMAIS de joueurs "fantômes" (dessinés mais pas dans la vidéo)
- JAMAIS de matériel inventé (pas de plot orange si pas visible)
- JAMAIS de positions approximatives (utilise la grille !)
- JAMAIS d'équipes mélangées (blues et rouges du même côté)

OBLIGATIONS (CRITIQUE - RESPECT ABSOLU) :
- Le nombre de cercles (joueurs) = nombre EXACT compté dans la vidéo
- ⚠️ RÈGLE ABSOLUE : Si tu mentionnes "22 joueurs (11 bleus, 11 rouges)" dans le texte, tu DOIS dessiner EXACTEMENT 11 cercles BLEUS (#1E88E5) ET 11 cercles ROUGES (#E53935) sur le SVG. PAS 4, PAS 6, mais EXACTEMENT 11 de chaque !
- ⚠️ CHAQUE ÉQUIPE doit avoir TOUS ses joueurs visibles sur le schéma. Si une équipe a 11 joueurs, il FAUT 11 cercles de la couleur de cette équipe.
- ⚠️ VÉRIFICATION OBLIGATOIRE : Compte le nombre de cercles de chaque couleur AVANT de finaliser le SVG. Le total DOIT correspondre au nb_joueurs_exact.
- La disposition spatiale DOIT correspondre EXACTEMENT à ce que tu VOIS dans la vidéo (11 à gauche, 11 à droite = dessine-les ainsi)
- Si les joueurs sont en ligne → Dessine-les en ligne
- Si les joueurs forment un triangle → Dessine un triangle
- Dessine la SÉQUENCE COMPLÈTE du mouvement (début → fin)
- ASTUCE PLACEMENT : Pour beaucoup de joueurs, utilise des formations réalistes (4-4-2, 4-3-3, 3-5-2) et espace-les bien sur le terrain

⚠️ NUMÉROS OBLIGATOIRES SUR LES JOUEURS :
- CHAQUE cercle (joueur) doit avoir son NUMÉRO visible à l'intérieur
- Si tu décris une formation 3-5-2 → on doit voir les numéros 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 sur les joueurs
- Si tu parles du "défenseur 4" ou du "milieu 8" → ces numéros doivent être sur le schéma
- Template : <g transform="translate(X,Y)"><circle r="18" fill="#1E88E5"/><text fill="white" font-size="12" font-weight="bold" text-anchor="middle" dominant-baseline="central">7</text></g>
- Le schéma est une AIDE VISUELLE : tout ce qui est écrit dans le texte doit se voir sur le schéma


## RÈGLE 2 : STRUCTURE DE LA FICHE (Format obligatoire)

Chaque exercice DOIT suivre cette structure EXACTE dans le champ "synopsis" :

### MISE EN PLACE
(Cette section décrit le "AVANT" - Comment préparer l'exercice)

**Terrain/Zone :**
- Dimensions exactes estimées
- Forme de la zone (carré, rectangle, triangle, losange...)
- Position sur le terrain global

**Disposition du Matériel :**
- Liste EXHAUSTIVE avec quantités ET positions
- "4 plots oranges formant un carré de 10m de côté"

**Positionnement Initial des Joueurs :**
- Où se place chaque groupe AU DÉPART
- "Groupe A (6 joueurs) : En colonne derrière le plot de départ"

**[SCHÉMA SVG DE LA MISE EN PLACE]**

### DÉMARRAGE
(Cette section décrit le DÉCLENCHEMENT de l'exercice)

**Signal de départ :**
- Qui donne le signal ? (Coach, joueur, sifflet...)
- Quel est le signal exact ?

**Première action :**
- Qui bouge en premier ?
- Quelle est exactement la première action ?

### CONSIGNES
(Cette section liste les RÈGLES et OBJECTIFS)

**Objectif Principal :**
- Quel est le BUT de cet exercice ?
- Qu'est-ce qu'on travaille ?

**Règles du jeu :**
1. [Règle 1]
2. [Règle 2]
...

**Points d'attention (Coaching Points) :**
- Ce sur quoi le coach INSISTE
- Les erreurs courantes à éviter

**Ce qui est INTERDIT :**
- Liste des interdictions explicites

**Ce qui est ENCOURAGÉ / BONUS :**
- Actions qui rapportent des points supplémentaires

### DÉROULEMENT DÉTAILLÉ
⚠️ CETTE SECTION DOIT ÊTRE TRÈS LONGUE ET TRÈS DÉTAILLÉE ⚠️
(Quelqu'un qui lit cette section sans voir la vidéo doit pouvoir reproduire l'exercice à 100%)

**Séquence d'actions (étape par étape, RIEN À OMETTRE) :**
1. [Étape 1] - Description COMPLÈTE (qui fait quoi, où, comment, pourquoi)
2. [Étape 2] - Suite de l'action avec tous les détails
3. [Étape 3] - Etc...
(Continue jusqu'à décrire TOUTE la séquence du début à la fin)

**Exemple concret (Scénario type complet) :**
- Décris UN passage complet de A à Z avec les noms des positions
- "Le joueur 1 (en position X) fait ceci, puis le joueur 2 réagit en faisant cela..."
- Sois EXHAUSTIF - chaque mouvement, chaque passe, chaque déplacement

**Timing et rythme :**
- Combien de temps dure chaque phase ?
- Quand est-ce que les joueurs récupèrent ?
- Quel est le tempo attendu (lent, rapide, explosif) ?

### RÈGLES & VARIANTES

⚠️ SECTION OBLIGATOIRE - Tu DOIS remplir cette section avec les variantes VUE/ENTENDUES dans la vidéo !

**VARIANTES MONTRÉES DANS LA VIDÉO (OBLIGATOIRE si présentes) :**
- Variante 1 : [Ce que le coach a dit/montré - transcription exacte]
- Variante 2 : [Ce que le coach a dit/montré - transcription exacte]
- Variante 3 : [etc...]
- (Liste TOUTES les variantes que tu as VU ou ENTENDU dans la vidéo)
- Si le coach dit "On peut aussi faire avec..." ou "Autre option..." = C'EST UNE VARIANTE

**SIMPLIFICATION (Pour rendre plus facile) :**
- [Propositions additionnelles si besoin]

**COMPLEXIFICATION (Pour rendre plus difficile) :**
- [Propositions additionnelles si besoin]

### ROTATION / FIN

**Rotation des joueurs :**
- Quand est-ce qu'on tourne ?
- Dans quel sens ?

**Durée d'une répétition :**
- Combien de temps dure UN passage ?

**Critères de fin d'exercice :**
- Comment sait-on que l'exercice est terminé ?

## RÈGLE 3 : COHÉRENCE ET VÉRIFICATION

### 3.1 TEST DE COHÉRENCE MATÉRIEL
- Si tu mentionnes "Échelle" dans le texte → Elle DOIT être dans "materiel_detail"
- Si tu dis "Mini-but" → Vérifie qu'il est dans la liste ET sur le schéma

### 3.2 TEST DE COHÉRENCE JOUEURS
- Si tu écris "12 joueurs (6 attaquants, 6 défenseurs)" :
  → 6 + 6 = 12 (sinon ERREUR)
  → Le SVG doit avoir 12 cercles

### 3.3 TEST DU "COACH AVEUGLE"
- "Un coach qui n'a PAS vu la vidéo peut-il reproduire cet exercice EXACTEMENT ?"
- Si NON → Ta fiche manque d'informations → COMPLÈTE

# ═══════════════════════════════════════════════════════════════════════════════
# CAS PARTICULIERS
# ═══════════════════════════════════════════════════════════════════════════════

## CAS 1 : Vidéo d'analyse tactique / Documentaire / Interview
⚠️ CES VIDÉOS NÉCESSITENT ENCORE PLUS DE DÉTAILS QUE LES AUTRES ⚠️

Tu DOIS créer un exercice qui permet de PRATIQUER le concept expliqué.
Dans le synopsis, tu DOIS :

1. **EXPLIQUER LE CONCEPT EN DÉTAIL** (comme si le lecteur n'a pas vu la vidéo)
   - De quoi parle la vidéo ?
   - Quel est le principe tactique/technique expliqué ?
   - Pourquoi c'est important ?

2. **CRÉER UN EXERCICE PRATIQUE COMPLET**
   - Mise en place détaillée avec schéma SVG
   - Consignes claires et précises
   - Déroulement étape par étape
   - Comment reproduire exactement ce qui est expliqué

3. **PRÉCISER L'ORIGINE**
   - Ajoute en début de synopsis : "⚠️ Exercice créé à partir de l'analyse tactique de la vidéo"
   - Explique le lien entre le concept de la vidéo et l'exercice proposé

L'objectif = Quelqu'un qui lit JUSTE ta fiche (sans voir la vidéo) doit TOUT comprendre de A à Z.

## CAS 2 : Vidéo NON football
Si la vidéo n'a AUCUN rapport avec le football :
→ RENVOIE UNIQUEMENT : [{{ "error": "NOT_FOOTBALL" }}]

## CAS 3 : Vidéo avec plusieurs variantes du même exercice
- Variante 1 et 2 sur le même terrain = 1 SEUL exercice avec variantes détaillées dans "RÈGLES & VARIANTES"
- MAIS si le setup change significativement (nouveau terrain, nouveau but) = Exercices SÉPARÉS
- ⛔ INTERDIT de créer un exercice pour chaque petite variante ! Regroupe-les intelligemment.

# ═══════════════════════════════════════════════════════════════════════════════
# FORMAT DE SORTIE JSON (STRUCTURE STRICTE)
# ═══════════════════════════════════════════════════════════════════════════════

Tu DOIS renvoyer un tableau JSON avec cette structure EXACTE :

[
    {{
        "summary": "Titre court et professionnel (Max 10 mots)",
        
        "video_description": "Description globale (1-2 phrases claires)",
        
        "synopsis": "### MISE EN PLACE\\n[Contenu détaillé avec schéma SVG]\\n\\n### DÉMARRAGE\\n[Contenu détaillé]\\n\\n### CONSIGNES\\n[Contenu détaillé]\\n\\n### DÉROULEMENT DÉTAILLÉ\\n[Contenu détaillé]\\n\\n### RÈGLES & VARIANTES\\n**SIMPLIFICATION :**\\n[...]\\n\\n**COMPLEXIFICATION :**\\n[...]\\n\\n### ROTATION / FIN\\n[Contenu détaillé]",
        
        "themes": ["TECHNIQUE", "TACTIQUE", "PHYSIQUE", "GARDIEN"],
        
        "duree_totale": "Durée estimée RÉALISTE (Ex: 10-15 min, 15-20 min, JAMAIS plus de 25 min pour un seul exercice)",
        
        "timing_detail_pro": "Format: [Séries] x [Durée] / R: [Repos] (Ex: 4 x 3 min / R: 1 min 30 - DUREE MAX PAR SÉRIE: 5 min)",
        
        "cat_range": "Catégories cibles (Ex: U13 → Seniors)",
        
        "level_range": "Niveaux cibles (Ex: Départemental D2 → Régional 1)",
        
        "materiel_detail": "Liste EXACTE et COMPLÈTE du matériel (Ex: 8 plots oranges, 4 chasubles rouges, 4 chasubles bleues, 2 ballons, 1 mini-but 2m, 2 échelles de rythme 4m)",
        
        "dimensions": "Dimensions PRÉCISES de la zone (Ex: 25m x 20m)",
        
        "nb_joueurs_exact": "Nombre EXACT avec répartition (Ex: 14 joueurs (6 attaquants rouges, 6 défenseurs bleus, 2 gardiens))",
        
        "start_seconds": "Timestamp de début en SECONDES (Ex: 145)"
    }}
]

# ═══════════════════════════════════════════════════════════════════════════════
# RAPPELS CRITIQUES FINAUX
# ═══════════════════════════════════════════════════════════════════════════════

- JAMAIS de joueurs/gardiens/coachs dans "materiel_detail"
- JAMAIS de schéma ASCII (toujours du SVG valide)
- JAMAIS de matériel inventé (uniquement ce qui est VISIBLE)
- JAMAIS de nombres approximatifs ("quelques joueurs" → INTERDIT)
- JAMAIS de fusion d'exercices distincts
- TOUJOURS un schéma SVG dans chaque section MISE EN PLACE
- TOUJOURS le vocabulaire EXACT du coach
- TOUJOURS vérifier la cohérence avant de valider
- Le coach doit pouvoir REPRODUIRE l'exercice à 100% avec ta fiche

# ═══════════════════════════════════════════════════════════════════════════════
# ⚠️⚠️⚠️ RÈGLE LA PLUS IMPORTANTE DE TOUTES ⚠️⚠️⚠️
# ═══════════════════════════════════════════════════════════════════════════════

AVANT DE GÉNÉRER LE JSON, TU DOIS :
1. Regarder TOUTE la vidéo du début à la fin
2. COMPTER combien d'exercices DISTINCTS il y a
3. Retourner EXACTEMENT ce nombre d'objets JSON

EXEMPLES :
- Tu comptes 5 exercices → Tu retournes un tableau de 5 JSON
- Tu comptes 3 exercices → Tu retournes un tableau de 3 JSON
- Tu comptes 1 exercice → Tu retournes un tableau de 1 JSON

⛔ SI TU RETOURNES MOINS D'EXERCICES QUE CE QU'IL Y A DANS LA VIDÉO = C'EST UN ÉCHEC TOTAL ⛔

INDICES POUR COMPTER LES EXERCICES :
- Le coach dit "Exercice 1", "Exercice 2"... → Change d'exercice !
- Le matériel est repositionné → Nouvel exercice !
- Les joueurs changent complètement de position de base → Nouvel exercice !
- Le coach dit "On passe à autre chose", "Maintenant..." → Nouvel exercice !


MAINTENANT, ANALYSE LA VIDÉO.
SI C'EST UNE SÉANCE : TRANSCRIIS FIDÈLEMENT.
SI C'EST UNE ANALYSE : CRÉE UNE PROGRESSION PÉDAGOGIQUE (2-4 EXERCICES).
(Rappel : retourne AUTANT de JSON que nécessaire !).
""" + ADVANCED_MODULES_6 + """
# LANCEMENT :
1. Ouvre <thinking_process> pour le scan (TYPE A ou TYPE B ?).
2. Si TYPE B -> Planifie ta progression (Analytique -> Global) dans le thinking process.
3. Ferme <thinking_process>.
4. Génère le JSON final parfait.

GO.
INPUT DATA : {raw_data}
"""


ADAPTATION_PROMPT = """
ROLE : Directeur Technique Expert AI.
MISSION : Adapter un exercice de football existant à de nouvelles contraintes réelles de terrain.

CONTEXTE DE L'EXERCICE ORIGINAL :
{original_exercise}

NIVEAU D'ORIGINE DE LA VIDÉO : {level_range}

NOUVELLES CONTRAINTES DU COACH :
- Joueurs disponibles : {players} (C'est ta priorité absolue pour le calcul du détail)
- Matériel disponible : {equipment}
- Espace disponible : {space}
- Catégorie d'âge : {category}
- Niveau de l'équipe cible : {level}
- TEMPS / DURÉE SOUHAITÉE : {time}

CONSIGNES D'ADAPTATION (RIGOUREUSES - FIDÉLITÉ 100% VIDÉO + RÉALISME) :
1. FIDÉLITÉ VISUELLE ET TACTIQUE (COPIE CONFORME) :
   - L'exercice DOIT être une copie de la vidéo. Mêmes étapes, même structure.
   - Si la vidéo montre 10 joueurs et que le coach en veut 20 : TU GARDES L'EXERCICE et tu doubles les postes ou tu fais 2 ateliers. TU N'INVENTES PAS un nouvel exercice.
   - Si la vidéo montre un 4 contre 4, et le coach veut 5 contre 5 : Tu ajoutes juste un joueur par équipe. C'est tout.

2. ADAPTATION AU NIVEAU (SMART-LEVEL) :
   - Compare le niveau vidéo d'origine ({level_range}) avec le niveau demandé ({level}).
   - SI NIVEAU CIBLE > ORIGINAL : Ajoute des contraintes (touches limitées, temps réduit). NE CHANGE PAS LA STRUCTURE.
   - SI NIVEAU CIBLE < ORIGINAL : Simplifie (Jokers, zones plus grandes).

3. PLAUSIBILITÉ DU TEMPS :
   - Si l'utilisateur demande {time}, tu dois calculer les séries pour que ça tienne.
   - IMPORTANT : Si l'exercice est intense, prévois des temps de repos réalistes.

4. ⚠️ ADAPTATION INTELLIGENTE DU MATÉRIEL :
   - Le matériel DOIT TOUJOURS correspondre au nombre de joueurs demandé !
   - Si {players} = 16 joueurs (8 contre 8) → materiel_detail = "8 chasubles bleues, 8 chasubles rouges, ..." (PAS 11 de chaque !)
   - RÈGLE : Nombre de chasubles par couleur = Nombre de joueurs par équipe
   - Adapte aussi les ballons : environ 1 ballon pour 3-4 joueurs

5. ⚠️ ADAPTATION INTELLIGENTE DE L'ESPACE :
   - MÊME SI LE COACH NE PRÉCISE PAS L'ESPACE, tu DOIS te poser la question :
   - "Est-ce que l'espace d'origine est adapté au nouveau nombre de joueurs ?"
   - Guide de calcul automatique :
     * 4-8 joueurs → 25m x 20m (petit espace)
     * 10-14 joueurs → 40m x 30m (demi-terrain)
     * 16-18 joueurs → 60m x 40m (grand demi-terrain)
     * 20-22 joueurs → 80m x 60m ou terrain complet
   - Si l'exercice original était sur terrain complet (100m x 68m) mais qu'il n'y a plus que 16 joueurs → RÉDUIS à 60m x 40m
   - SOIS INTELLIGENT : un grand terrain avec peu de joueurs = exercice moins efficace

6. ⚠️ RÈGLES SVG CRITIQUES (RESPECT ABSOLU) :
   - Si tu génères un schéma SVG dans le synopsis, tu DOIS dessiner EXACTEMENT le nombre de joueurs indiqué.
   - Exemple : "14 joueurs (7 bleus, 7 rouges)" = EXACTEMENT 7 cercles bleus (#1E88E5) ET 7 cercles rouges (#E53935).
   - CHAQUE ÉQUIPE doit avoir TOUS ses joueurs visibles sur le schéma.
   - VÉRIFICATION : Compte les cercles avant de valider. Le total DOIT correspondre au nombre dans nb_joueurs_exact.

7. AUTRES RÈGLES :
   - Texte EXHAUSTIF. Pas de résumés.
   - Interprète les typos intelligemment.

8. VÉRIFICATION FINALE OBLIGATOIRE :
   - Relis l'exercice original et compare avec ton adaptation.
   - L'ADN de l'exercice doit être préservé.
   - Si ton adaptation ressemble à un exercice différent → RECOMMENCE.

FORMAT DE SORTIE JSON STRICT OBLIGATOIRE :
{{
    "summary": "Titre adapté",
    "video_description": "Ce que cette adaptation permet de travailler spécifiquement.",
    "nb_joueurs_exact": "X joueurs (Y attaquants, Z défenseurs)",
    "dimensions": "Dimensions adaptées",
    "materiel_detail": "Matériel adapté (SANS JOUEURS)",
    "cat_range": "Catégorie adaptée",
    "level_range": "Niveau adapté",
    "duree_totale": "Ex: 20 min",
    "timing_detail_pro": "Timing adapté",
    "synopsis": "### MISE EN PLACE\n(Détail EXTRÊME + Schéma SVG avec TOUS les joueurs...)\n\n### DÉMARRAGE\n(Détail CHIRURGICAL + Schéma de mouvement...)\n\n### CONSIGNES\n(Déroulement EXHAUSTIF...)\n\n### RÈGLES & VARIANTES\nSIMPLIFICATION : (Détail...)\n\nCOMPLEXIFICATION : (Détail...)\n\n### ROTATION / FIN\n(Détail et exemple final...)"
}}
"""

# ==============================================================================
# 5. MOTEUR PARALLÈLE
# ==============================================================================
def upload_video_worker(video_path):
    """Upload une seule vidéo à Gemini et attend qu'elle soit prête."""
    print("👁️ [Thread Vision] Upload de la vidéo vers Gemini...")
    try:
        video_file = GENAI_CLIENT.files.upload(file=video_path)
        # Wait for processing with TIMEOUT (Safety against infinite loops)
        start_time = time.time()
        TIMEOUT_SECONDS = 60 # 1 minute max pour le processing
        
        while video_file.state == "PROCESSING":
            elapsed = time.time() - start_time
            print(f"⏳ [Thread Vision] Traitement vidéo Google en cours... ({int(elapsed)}s)")
            
            if elapsed > TIMEOUT_SECONDS:
                print("⚠️ [Thread Vision] TIMEOUT : Le traitement Google prend trop de temps. Abandon vidéo.")
                return None
                
            time.sleep(2)
            video_file = GENAI_CLIENT.files.get(name=video_file.name)
        
        if video_file.state == "FAILED":
            raise Exception("L'upload vidéo Google a échoué (Status FAILED).")
            
        print(f"✅ [Thread Vision] Vidéo prête : {video_file.name}")
        return video_file
    except Exception as e:
        print(f"❌ [Thread Vision] Erreur : {e}")
        return None
    except Exception as e:
        print(f"❌ [Thread Vision] Erreur : {e}")
        return None

def upload_video_chunk_worker(chunk_data):
    """Worker pour uploader un segment vidéo en parallèle."""
    idx, chunk_path, start_time_sec = chunk_data
    print(f"📤 [Chunk {idx}] Upload segment {start_time_sec}s...")
    try:
        video_file = GENAI_CLIENT.files.upload(file=chunk_path)
        timeout = 45  # Moins de timeout pour les petits segments
        start = time.time()
        
        while video_file.state == "PROCESSING":
            if time.time() - start > timeout:
                print(f"⚠️ [Chunk {idx}] Timeout upload")
                return None
            time.sleep(1.5)
            video_file = GENAI_CLIENT.files.get(name=video_file.name)
        
        if video_file.state == "FAILED":
            return None
            
        print(f"✅ [Chunk {idx}] Prêt")
        return {"idx": idx, "file": video_file, "start_sec": start_time_sec}
    except Exception as e:
        print(f"❌ [Chunk {idx}] Erreur upload: {e}")
        return None
    except Exception as e:
        print(f"❌ [Chunk {idx}] Erreur upload: {e}")
        return None

def analyze_video_chunk_worker(chunk_info, title, audio_text, prompt):
    """Worker pour analyser un segment vidéo en parallèle."""
    if not chunk_info or not chunk_info.get("file"):
        return []
    
    idx = chunk_info["idx"]
    video_file = chunk_info["file"]
    start_sec = chunk_info["start_sec"]
    
    print(f"🧠 [Chunk {idx}] Analyse IA du segment {start_sec}s...")
    
    try:
        # Prompt adapté pour le segment - Gemini analyse Audio+Vidéo directement
        segment_prompt = prompt.format(raw_data=f"TITRE: {title}\nSEGMENT: {start_sec}s à {start_sec+120}s\nInstruction: Analyse la vidéo et l'audio de ce segment.")
        
        # Mode 2026 : Utilisation explicite de types.Part pour la robustesse
        video_part = types.Part.from_uri(file_uri=video_file.uri, mime_type=video_file.mime_type)
        
        response = GENAI_CLIENT.models.generate_content(
            model=ACTIVE_MODEL_NAME,
            contents=[video_part, segment_prompt],
            config=GENAI_CONFIG
        )
        
        # Cleanup file immédiatement
        try:
            GENAI_CLIENT.files.delete(name=video_file.name)
        except: pass
        
        # Nettoyer la réponse IA (Thinking Process)
        cleaned_response = clean_ai_response(response.text)
        result = robust_json_load(cleaned_response)
        if not result:
            return []
        
        # Ajuster les timestamps en fonction du début du segment
        if isinstance(result, dict):
            result = [result]
        
        for exo in result:
            if 'start_seconds' in exo:
                exo['start_seconds'] = exo.get('start_seconds', 0) + start_sec
            else:
                exo['start_seconds'] = start_sec
        
        print(f"✅ [Chunk {idx}] {len(result)} exercice(s) détecté(s)")
        return result
        
    except Exception as e:
        print(f"❌ [Chunk {idx}] Erreur analyse: {e}")
        return []

def split_video_into_chunks(video_path, chunk_duration=120, overlap=5):
    """Découpe une vidéo en segments avec chevauchement."""
    chunks = []
    try:
        clip = VideoFileClip(video_path)
        duration = clip.duration
        
        if duration <= chunk_duration + 10:
            # Vidéo courte, pas besoin de découper
            clip.close()
            return [(0, video_path, 0)]  # (idx, path, start_time)
        
        print(f"✂️ Découpage vidéo : {int(duration)}s en segments de {chunk_duration}s (overlap: {overlap}s)")
        
        idx = 0
        start = 0
        request_id = str(uuid.uuid4())[:8]  # ID unique pour éviter les collisions en parallèle
        while start < duration:
            end = min(start + chunk_duration, duration)
            chunk_filename = f"{TEMP_FOLDER}/chunk_{request_id}_{idx}.mp4"
            
            sub_clip = clip.subclipped(start, end)
            sub_clip.write_videofile(
                chunk_filename,
                codec="libx264",
                audio_codec="aac",
                preset="ultrafast",
                logger=None
            )
            sub_clip.close()
            
            chunks.append((idx, chunk_filename, int(start)))
            print(f"   📎 Segment {idx}: {int(start)}s → {int(end)}s")
            
            # Prochaine position avec overlap
            start = start + chunk_duration - overlap
            idx += 1
        
        clip.close()
        return chunks
        
    except Exception as e:
        print(f"❌ Erreur découpage vidéo: {e}")
        return [(0, video_path, 0)]  # Fallback: vidéo entière

def deduplicate_exercises(all_exercises):
    """Fusionne les exercices détectés en évitant les doublons proches."""
    if len(all_exercises) <= 1:
        return all_exercises
    
    # Tri par timestamp
    sorted_exos = sorted(all_exercises, key=lambda x: x.get('start_seconds', 0))
    
    unique = []
    for exo in sorted_exos:
        ts = exo.get('start_seconds', 0)
        summary = exo.get('summary', '').lower()
        
        # Vérifier si un exercice similaire existe déjà (proche en temps et nom similaire)
        is_duplicate = False
        for existing in unique:
            existing_ts = existing.get('start_seconds', 0)
            existing_summary = existing.get('summary', '').lower()
            
            # Si moins de 60s d'écart ET 40%+ de mots en commun = doublon probable
            # (On élargit la fenêtre pour capter les répétitions et variantes vues comme nouveaux exos)
            if abs(ts - existing_ts) < 60:
                words1 = set(summary.split())
                words2 = set(existing_summary.split())
                if len(words1 & words2) > len(words1) * 0.4:
                    is_duplicate = True
                    break
        
        if not is_duplicate:
            unique.append(exo)
    
    print(f"🔄 Dédoublonnage: {len(all_exercises)} → {len(unique)} exercices")
    return unique


def clean_ai_response(response_text):
    """Supprime tout ce qui est entre <thinking_process> et </thinking_process>."""
    if not response_text: return ""
    cleaned_json = re.sub(r'<thinking_process>.*?</thinking_process>', '', response_text, flags=re.DOTALL)
    return cleaned_json.strip()

def smart_split_and_process(video_path, title):
    """
    Traitement intelligent avec DÉCOUPAGE VIDÉO PARALLÈLE pour les longues vidéos.
    - Vidéos courtes (<3min): Upload unique + analyse (comportement actuel)
    - Vidéos longues (>=3min): Découpage en segments 2min + analyse parallèle + dédoublonnage
    """
    full_text_data = ""
    
    # D'abord, obtenir la durée de la vidéo
    try:
        clip = VideoFileClip(video_path)
        duration = clip.duration
        clip.close()
    except Exception as e:
        print(f"❌ Erreur lecture vidéo: {e}")
        return []
    
    print(f"📹 Durée vidéo: {int(duration)}s ({int(duration/60)}min {int(duration%60)}s)")
    
    # DÉCISION: Vidéo courte (<120s) = mode classique, sinon = mode parallèle
    USE_PARALLEL_CHUNKS = duration >= 120  # Seuil réduit à 2 min
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        
        if USE_PARALLEL_CHUNKS:
            # ============================================================
            # MODE PARALLÈLE (Vidéos >= 3 minutes)
            # ============================================================
            print("🚀 MODE TURBO: Analyse parallèle activée!")
            
            # 1. Découper la vidéo en segments de 2 min avec 3s d'overlap
            video_chunks = split_video_into_chunks(video_path, chunk_duration=120, overlap=3)
            
            # 2. Lancer tous les uploads vidéo en parallèle
            print(f"📤 Upload de {len(video_chunks)} segments vidéo en parallèle sur Gemini...")
            upload_futures = [executor.submit(upload_video_chunk_worker, chunk) for chunk in video_chunks]
            
            # 3. Attendre les uploads vidéo
            uploaded_chunks = [f.result() for f in upload_futures]
            valid_chunks = [c for c in uploaded_chunks if c is not None]
            
            if not valid_chunks:
                print("❌ Aucun segment vidéo uploadé avec succès")
                return []
            
            print(f"✅ {len(valid_chunks)} segments prêts pour l'analyse IA")
            
            # 4. Analyser chaque segment en parallèle (Audio + Vidéo par Gemini)
            print("🧠 Analyse IA (Audio+Vidéo) de tous les segments...")
            analysis_futures = [
                executor.submit(analyze_video_chunk_worker, chunk, title, "", MULTI_EXERCISE_PROMPT) 
                for chunk in valid_chunks
            ]
            
            # 5. Collecter tous les résultats
            all_exercises = []
            for future in analysis_futures:
                try:
                    result = future.result()
                    if result:
                        all_exercises.extend(result)
                except Exception as e:
                    print(f"⚠️ Erreur analyse segment: {e}")
            
            # 6. Dédoublonner les exercices
            final_json = deduplicate_exercises(all_exercises)
            
            # 7. Nettoyage des fichiers temporaires
            for i, path, _ in video_chunks:
                if path != video_path:  # Ne pas supprimer la vidéo originale
                    try: os.remove(path)
                    except: pass
            
        else:
            # ============================================================
            # MODE CLASSIQUE (Vidéos < 3 minutes)
            # ============================================================
            print("⚡ Mode rapide: Analyse directe (vidéo courte)")
            
            # Upload unique de la vidéo
            vid_future = executor.submit(upload_video_worker, video_path)
            
            # Récupérer la vidéo uploadée
            try:
                video_file = vid_future.result()
            except Exception as e:
                print(f"❌ Erreur récup vidéo : {e}")
                return []
            
            if not GENAI_CLIENT or not video_file: 
                print("❌ Echec critique : Pas de client ou pas de vidéo.")
                return []
            
            # Analyse IA classique avec streaming (Audio + Vidéo par Gemini)
            print("🧠 Synthèse finale par l'IA (Yeux + Oreilles assemblés)...")
            try:
                for attempt in range(3):
                    try:
                        print("🌊 Démarrage du stream IA...", end="", flush=True)
                        # Mode 2026 : Utilisation explicite de types.Part
                        video_part = types.Part.from_uri(file_uri=video_file.uri, mime_type=video_file.mime_type)
                        
                        response_stream = GENAI_CLIENT.models.generate_content_stream(
                            model=ACTIVE_MODEL_NAME,
                            contents=[
                                video_part,
                                MULTI_EXERCISE_PROMPT.format(raw_data=f"TITRE: {title}\nInstruction: Analyse complète (Audio + Visuel). Décris tout ce que tu vois et entends.")
                            ],
                            config=GENAI_CONFIG
                        )
                        
                        full_response_text = ""
                        for chunk in response_stream:
                            if chunk.text:
                                print(".", end="", flush=True)
                                full_response_text += chunk.text
                            else:
                                # Mode 2026 : L'IA est en train de "réfléchir" (Thinking)
                                print("💭", end="", flush=True)
                        print("\n✅ Stream terminé.")
                        
                        # Nettoyer la réponse IA (Thinking Process)
                        cleaned_response = clean_ai_response(full_response_text)
                        
                        # Fallback : Si le nettoyage retire tout, essayer de parser direct
                        if not cleaned_response and full_response_text:
                            cleaned_response = full_response_text
                            
                        return robust_json_load(cleaned_response)
                        
                    except Exception as api_err:
                        if "429" in str(api_err) and attempt < 2:
                            print(f"\n⚠️ Rate Limit (429). Attente 5s (Tentative {attempt+1}/3)...")
                            time.sleep(5)
                            continue
                        raise api_err
                
                # Cleanup
                try:
                    if video_file: GENAI_CLIENT.files.delete(name=video_file.name)
                except: pass
                
                final_json = robust_json_load(full_response_text)
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Erreur IA: {e}")
                return []
        
        # ============================================================
        # POST-TRAITEMENT COMMUN
        # ============================================================
        if not final_json:
            print("⚠️ Echec parsing JSON.")
            return []
        
        if isinstance(final_json, dict):
            final_json = [final_json]
        
        # LOG: Nombre d'exercices
        print(f"📊 NOMBRE D'EXERCICES DÉTECTÉS : {len(final_json)}")
        for i, exo in enumerate(final_json):
            print(f"   - Exercice {i+1}: {exo.get('summary', 'Sans titre')[:50]}")
        
        # Normalisation des données
        for i, exo in enumerate(final_json):
            if 'error' in exo: continue
            
            if 'start_seconds' not in exo or exo['start_seconds'] == 0:
                exo['start_seconds'] = i * 120
            
            if 'theme_force' in exo and 'themes' not in exo:
                exo['themes'] = [exo['theme_force']]
            elif 'themes' not in exo:
                exo['themes'] = ["TECHNIQUE"]
        
        return final_json

# ==============================================================================
# ROUTES
# ==============================================================================
# ==============================================================================
# ROUTES
# ==============================================================================
TEMP_FOLDER = "temp_data"
VIDEOS_DB = []

if not os.path.exists(TEMP_FOLDER): os.makedirs(TEMP_FOLDER)

def cleanup_temp_folder():
    """Nettoie tous les fichiers temporaires du dossier temp_data."""
    try:
        for filename in os.listdir(TEMP_FOLDER):
            filepath = os.path.join(TEMP_FOLDER, filename)
            if os.path.isfile(filepath):
                try:
                    os.remove(filepath)
                    print(f"🗑️ Supprimé: {filename}")
                except Exception as e:
                    print(f"⚠️ Impossible de supprimer {filename}: {e}")
    except Exception as e:
        print(f"⚠️ Erreur nettoyage temp_folder: {e}")

# Nettoyage au démarrage
cleanup_temp_folder()

import ast

def robust_json_load(text):
    """Essaye d'extraire et de charger du JSON de manière indestructible (5 Tiers)."""
    if not text: return None
    
    # 1. Nettoyage initial 
    clean = re.sub(r'```json\s*', '', text, flags=re.IGNORECASE)
    # Enlever le dernier ``` s'il existe (fin de bloc markdown)
    clean = re.sub(r'```\s*$', '', clean)
    
    # 2. Extraction du bloc probable
    s_arr = clean.find('[')
    e_arr = clean.rfind(']') + 1
    s_obj = clean.find('{')
    e_obj = clean.rfind('}') + 1
    
    raw_block = ""
    if s_arr != -1 and (s_obj == -1 or s_arr < s_obj):
        raw_block = clean[s_arr:e_arr]
    elif s_obj != -1:
        raw_block = clean[s_obj:e_obj]
    else:
        raw_block = clean

    # --- TIER 1 : Standard ---
    try:
        return json.loads(raw_block, strict=False)
    except:
        pass

    # --- TIER 2 : Réparation des newlines et guillemets dans les valeurs ---
    try:
        # Remplacer les vrais retours à la ligne dans les strings par \n
        # Pattern : trouver les contenus entre guillemets et échapper les newlines
        def escape_newlines(m):
            content = m.group(1)
            content = content.replace('\n', '\\n').replace('\r', '')
            return '"' + content + '"'
        
        repaired = re.sub(r'"((?:[^"\\]|\\.)*)"', escape_newlines, raw_block, flags=re.DOTALL)
        repaired = re.sub(r',\s*([\]}])', r'\1', repaired)  # Virgules trailing
        return json.loads(repaired, strict=False)
    except:
        pass

    # --- TIER 3 : Fallback AST ---
    try:
        python_str = raw_block.replace('null', 'None').replace('true', 'True').replace('false', 'False')
        return ast.literal_eval(python_str)
    except:
        pass

    # --- TIER 4 : Extraction MULTI-EXERCICE par Regex ---
    # Cherche TOUS les objets {} dans le bloc
    try:
        keys = ["summary", "video_description", "synopsis", "themes", "duree_totale", 
                "timing_detail_pro", "cat_range", "level_range", "materiel_detail", 
                "dimensions", "nb_joueurs_exact", "start_seconds"]
        
        all_exercises = []
        
        # Trouver tous les objets indépendants
        depth = 0
        start_idx = -1
        for i, char in enumerate(raw_block):
            if char == '{':
                if depth == 0:
                    start_idx = i
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0 and start_idx != -1:
                    obj_str = raw_block[start_idx:i+1]
                    
                    extracted = {}
                    for k in keys:
                        # Pattern pour extraire les valeurs (gère les multilignes)
                        if k == "themes":
                            match = re.search(r'"themes"\s*:\s*\[(.*?)\]', obj_str, re.DOTALL)
                            if match:
                                themes_str = match.group(1).replace('"', '').replace("'", "")
                                extracted[k] = [t.strip() for t in themes_str.split(',') if t.strip()]
                        else:
                            # Cherche jusqu'à la prochaine clé ou fin d'objet
                            pattern = rf'"{k}"\s*:\s*"((?:[^"\\]|\\.)*?)"'
                            match = re.search(pattern, obj_str, re.DOTALL)
                            if match:
                                val = match.group(1).replace('\\"', '"').replace('\\n', '\n').strip()
                                extracted[k] = val
                    
                    if extracted.get('summary'):
                        all_exercises.append(extracted)
                    
                    start_idx = -1
        
        if all_exercises:
            print(f"🔧 Récupération réussie : {len(all_exercises)} exercice(s) extrait(s)")
            return all_exercises
            
    except Exception as e:
        print(f"❌ Echec Tier 4 : {e}")

    # --- TIER 5 : Dernier recours - extraction minimale ---
    try:
        # Juste chercher le premier "summary" et construire un objet minimal
        summary_match = re.search(r'"summary"\s*:\s*"([^"]+)"', raw_block)
        if summary_match:
            return [{"summary": summary_match.group(1), "synopsis": "Exercice extrait (données partielles)", "themes": ["TECHNIQUE"]}]
    except:
        pass

    return None

@app.route('/')
def home(): 
    # Le mode dev s'active si ?preview=1 est dans l'URL
    is_preview = request.args.get('preview') == '1'
    return render_template('index.html', 
                           stripe_pk=STRIPE_PUBLISHABLE_KEY, 
                           features=FEATURE_FLAGS, 
                           dev_mode=is_preview)

@app.route('/add_video', methods=['POST'])
def add_video():
    url = request.json.get('url')
    if not url: return jsonify({"error": "Lien vide"}), 400

    # 🗑️ Nettoyage des anciens fichiers temporaires avant le nouveau téléchargement
    cleanup_temp_folder()

    print(f"\n🎬 DÉMARRAGE TURBO : {url}")
    print(f"\n🎬 DÉMARRAGE TURBO : {url}")
    try:
        # HYBRID SYSTEM: Pytube for YouTube (Top 720p/480p), yt-dlp for others
        if "youtube.com" in url or "youtu.be" in url:
            print("⬇️ Mode YouTube (Priorité 720p, sinon 480p)...")
            yt = YouTube(url, use_oauth=True, allow_oauth_cache=True)
            title = yt.title 
            thumbnail = yt.thumbnail_url
            
            # 1. TENTATIVE 720p (Qualité HD Standard)
            stream = yt.streams.filter(res="720p", file_extension='mp4').first()
            
            # 2. FALLBACK 480p (Qualité SD acceptable)
            if not stream:
                print("⚠️ 720p introuvable, bascule sur 480p...")
                stream = yt.streams.filter(res="480p", file_extension='mp4').first()
            
            # 3. DERNIER RECOURS (Le mieux qui reste)
            if not stream:
                print("⚠️ 480p introuvable, téléchargement de la meilleure qualité disponible...")
                stream = yt.streams.filter(file_extension='mp4').order_by('resolution').desc().first()
            
            if not stream:
                return jsonify({"error": "Vidéo introuvable ou illisible."}), 400
                
            path = stream.download(output_path=TEMP_FOLDER, filename=f"vid_{int(time.time())}.mp4")
            
        else:
            print("⬇️ Mode Multi-Plateforme (Max 720p)...")
            # yt-dlp gère le fallback automatiquement avec <=
            unique_filename = f"vid_{int(time.time())}"
            ydl_opts = {
                'format': 'best[height<=720]',
                'outtmpl': f'{TEMP_FOLDER}/{unique_filename}.%(ext)s',
                'quiet': True,
                'no_warnings': True,
                'overwrites': True
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get('title', 'Vidéo Sans Titre')
                thumbnail = info.get('thumbnail', '')
                
                # On cherche le fichier créé (extensions possibles)
                possible_exts = ['mp4', 'mkv', 'webm']
                found_path = None
                for ext in possible_exts:
                    p = f"{TEMP_FOLDER}/{unique_filename}.{ext}"
                    if os.path.exists(p):
                        found_path = p
                        break
                
                if not found_path:
                    raise Exception("Fichier non trouvé après téléchargement")
                    
                path = found_path
                
                # Check Thumbnail - Image par défaut si vide (pour Insta/TikTok parfois)
                if not thumbnail:
                    thumbnail = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1000&auto=format&fit=crop"

    except Exception as e: 
        print(f"❌ Erreur téléchargement : {e}")
        return jsonify({"error": str(e)}), 500

    exercises_list = smart_split_and_process(path, title)
    
    try: os.remove(path)
    except: pass
    
    new_entries = []
    if exercises_list:
        # CHECK FOOTBALL VERIFICATION
        if isinstance(exercises_list, list) and len(exercises_list) > 0 and 'error' in exercises_list[0]:
             if exercises_list[0]['error'] == 'NOT_FOOTBALL':
                 return jsonify({"error": "Vous devez renseigner une vidéo de football."}), 400

        for i, exo in enumerate(exercises_list):
            entry = {
                "id": int(time.time() * 1000) + i, # ID unique
                "title": exo.get('summary', title),
                "thumbnail": thumbnail,
                "link": url,
                "data": exo
            }
            VIDEOS_DB.append(entry)
            new_entries.append(entry)
        
        return jsonify(new_entries)
    
    return jsonify({"error": "Echec Analyse ou Vidéo vide"}), 500

@app.route('/filter_videos', methods=['POST'])
def filter_videos(): return jsonify(VIDEOS_DB)

@app.route('/delete_video/<int:vid_id>', methods=['DELETE'])
def delete_video(vid_id):
    global VIDEOS_DB
    VIDEOS_DB = [v for v in VIDEOS_DB if v['id'] != vid_id]
    return jsonify({"status": "success"})

# Base de données locale des clubs (chargée au besoin)
CLUBS_DB = []

def load_clubs_db():
    global CLUBS_DB
    if CLUBS_DB: return
    
    try:
        json_path = os.path.join(app.root_path, 'static', 'clubs_full.json')
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                CLUBS_DB = json.load(f)
            print(f"✅ Base clubs chargée: {len(CLUBS_DB)} clubs")
        else:
            print("⚠️ Fichier clubs_full.json introuvable (téléchargement en cours?)")
    except Exception as e:
        print(f"Erreur chargement clubs: {e}")

@app.route('/api/clubs_search')
def clubs_search():
    query = request.args.get('q', '').lower().strip()
    if len(query) < 2:
        return jsonify([])
    


    # Charger la DB si nécessaire
    if not CLUBS_DB:
        load_clubs_db()
    
    # Si toujours vide, retourner vide (ou réessayer de charger)
    if not CLUBS_DB:
        return jsonify([])

    results = []
    count = 0
    
    # Recherche simple et rapide (contient le texte)
    for club in CLUBS_DB:
        # Vérification des champs (certains peuvent être null)
        c_name = (club.get('name') or '').lower()
        c_short = (club.get('short_name') or '').lower()
        c_loc = (club.get('location') or '').lower()
        
        if query in c_name or query in c_short or query in c_loc:
            results.append({
                "id": club.get("affiliation_number"),
                "name": club.get("name"),
                "short_name": club.get("short_name"),
                "location": club.get("location"),
                "logo": club.get("logo"),
                "lat": club.get("latitude"),
                "lng": club.get("longitude")
            })
            count += 1
            if count >= 20: # Limite de résultats
                break
                
    return jsonify(results)

# ==============================================================================
# ROUTES AUTHENTICATION
# ==============================================================================

@app.route('/auth/login/<platform>')
def login_platform(platform):
    """Redirige vers le provider OAuth choisi."""
    if platform.lower() == 'google':
        # Simuler une vraie redirection Google
        # Dans un vrai flux, on utiliserait google-auth-oauthlib
        return render_template('login_redirect.html', provider='Google')
    elif platform.lower() == 'fff':
        return render_template('login_redirect.html', provider='FFF')
    return redirect('/')

@app.route('/auth/callback')
def auth_callback():
    """Callback après validation sur le provider."""
    provider = request.args.get('provider', 'Unknown')
    user_id = "user_" + str(int(time.time()))
    
    # Simuler la récupération des données utilisateur selon le provider
    if provider == 'Google':
        # En production, on extrairait ces infos du token ID
        user_data = {
            "id": user_id,
            "firstname": "Coach",
            "lastname": "Google",
            "club": "SmartCoach Academy",
            "email": "coach.google@gmail.com"
        }
    elif provider == 'FFF':
        user_data = {
            "id": user_id,
            "firstname": "Educateur",
            "lastname": "FFF",
            "club": "Fédération Française de Football",
            "email": "educateur@fff.fr"
        }
    else:
        return redirect('/')

    # Stocker en session serveur pour plus de sécurité (optionnel ici comme on utilise localStorage côté client)
    session['user'] = user_data
    
    # Rediriger vers l'index avec un flag de succès pour que le JS gère la connexion finale
    return redirect(f'/?login_success=true&provider={provider}')

@app.route('/api/register', methods=['POST'])
def register_user():
    """Inscription utilisateur avec données complètes."""
    data = request.json
    
    # Validation basique
    required = ['firstname', 'lastname', 'email', 'password', 'licence_number', 'club', 'city']
    if not all(field in data for field in required):
        return jsonify({"error": "Champs manquants"}), 400
        
    # Validation licence (10 chiffres)
    if not re.match(r'^\d{10}$', data['licence_number']):
        return jsonify({"error": "Le numéro de licence doit comporter exactement 10 chiffres."}), 400

    # Simulation création utilisateur (ici on renvoie juste l'objet pour le frontend)
    # Dans un vrai système, on hasherait le MDP et on stockerait en BDD
    user_id = "u_" + str(int(time.time()))
    new_user = {
        "id": user_id,
        "firstname": data['firstname'].title(),
        "lastname": data['lastname'].title(),
        "email": data['email'],
        "licence_number": data['licence_number'],
        "club": data['club'],
        "city": data['city'],
        "club_affiliation_number": data.get('club_affiliation_number'),
        "club_address": data.get('club_address'),
        "club_district": data.get('club_district'),
        "category": data.get('category'),
        "level": data.get('level'),
        "phone": data.get('phone'),
        "role": "coach"
    }
    
    # Simuler session
    session['user'] = new_user
    
    return jsonify(new_user)

@app.route('/api/login', methods=['POST'])
def login_user():
    """Simulation login simple."""
    data = request.json
    # Pour la démo, on accepte n'importe quel login qui a l'air valide
    if 'email' in data and 'password' in data:
        # On renvoie un user fictif si pas en mémoire
        return jsonify({
            "id": "u_demo",
            "firstname": "Coach",
            "lastname": "Demo",
            "email": data['email'],
            "licence_number": "1234567890",
            "club": "E.S. BULLY-LES-MINES",
            "city": "Bully-les-Mines",
            "club_affiliation_number": "500302",
            "club_address": "Stade René Bigot, Rue Alfred de Musset",
            "club_district": "Artois",
            "role": "coach"
        })
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    try:
        # Configuration dynamique pour la démo
        # Dans un vrai cas, on utiliserait un price_id Stripe
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'unit_amount': 999, # 9.99€
                    'product_data': {
                        'name': 'SmartCoach Premium',
                        'description': 'Accès illimité aux fonctionnalités IA et analyse vidéo.',
                        'images': ['https://i.imgur.com/LDOOVSy.png'], # Image démo
                    },
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=url_for('home', _external=True) + '?payment_success=true',
            cancel_url=url_for('home', _external=True) + '?payment_canceled=true',
        )
        return jsonify({'id': checkout_session.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 403

@app.route('/api/auth/me')
def get_current_user():
    """Retourne l'utilisateur en session."""
    return jsonify(session.get('user'))

@app.route('/adapt_session_granular', methods=['POST'])
def adapt_session_granular():
    data = request.json
    plan = data.get('plan', [])

    if not plan:
        return jsonify({"error": "Plan d'adaptation vide"}), 400

    def process_step(step):
        vid_id = step['videoId']
        constraints = step['constraints']
        
        # On cherche l'exo original dans la DB (ou on pourrait le passer dans le body)
        # Mais pour être sûr d'avoir la donnée fraîche, on utilise VIDEOS_DB
        original_exo = next((v for v in VIDEOS_DB if v['id'] == vid_id), None)
        if not original_exo: return None

        try:
            prompt = ADAPTATION_PROMPT.format(
                original_exercise=json.dumps(original_exo['data'], ensure_ascii=False),
                level_range=original_exo['data'].get('level_range', 'Non spécifié'),
                players=constraints.get('players', 'Non spécifié'),
                equipment=constraints.get('equipment', 'Non spécifié'),
                space=constraints.get('space', 'Non spécifié'),
                category=constraints.get('category', 'Non spécifié'),
                level=constraints.get('level', 'Non spécifié'),
                time=constraints.get('time', 'Non spécifié')
            )
            response = ACTIVE_MODEL.generate_content(prompt)
            res_json = robust_json_load(response.text)
            
            if not res_json:
                print("⚠️ Echec parsing JSON robuste (Adaptation).")
                return original_exo

            # Créer une copie pour ne pas polluer la DB globale sans confirmation
            new_exo = json.loads(json.dumps(original_exo))
            
            # Mise à jour des données avec le JSON de l'IA
            new_exo['data']['summary'] = res_json.get('summary', original_exo['data'].get('summary'))
            new_exo['data']['video_description'] = res_json.get('video_description', original_exo['data'].get('video_description'))
            new_exo['data']['synopsis'] = res_json.get('synopsis', original_exo['data'].get('synopsis'))
            new_exo['data']['nb_joueurs_exact'] = res_json.get('nb_joueurs_exact', constraints.get('players'))
            new_exo['data']['dimensions'] = res_json.get('dimensions', constraints.get('space'))
            new_exo['data']['materiel_detail'] = res_json.get('materiel_detail', constraints.get('equipment'))
            new_exo['data']['cat_range'] = res_json.get('cat_range', constraints.get('category'))
            new_exo['data']['level_range'] = res_json.get('level_range', constraints.get('level'))
            new_exo['data']['duree_totale'] = res_json.get('duree_totale', original_exo['data'].get('duree_totale'))
            new_exo['data']['timing_detail_pro'] = res_json.get('timing_detail_pro', constraints.get('time'))
            
            return new_exo
        except Exception as e:
            print(f"Error adapting granular exercise {vid_id}: {e}")
            return original_exo

    with concurrent.futures.ThreadPoolExecutor() as executor:
        results = list(executor.map(process_step, plan))

    return jsonify([r for r in results if r])

# --- SIMULATION DE BASE DE DONNÉES CLUBS (Source: FFF/Data.gouv) ---
@app.route('/api/clubs/lookup')
def lookup_club():
    cl_no = request.args.get('cl_no', '').strip()
    if not cl_no:
        return jsonify({"error": "Numéro manquant"}), 400
    
    logo_url = f"https://pf-logo.fff.fr/logo/{cl_no}_1.jpg"

    # Scraping léger sur fff.fr
    try:
        search_url = f"https://www.fff.fr/recherche-clubs?q={cl_no}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        resp = requests.get(search_url, headers=headers, timeout=5)
        
        if resp.status_code == 200:
            html = resp.text
            # Recherche du titre contenant le nom
            match_name = re.search(r'<h4 class="title"[^>]*>\s*<a[^>]*>(.*?)</a>', html, re.IGNORECASE)
            
            club_name = f"Club {cl_no}" # Valeur par défaut
            if match_name:
                club_name = match_name.group(1).strip()
            
            # Si on ne trouve pas avec le premier regex, on tente un autre pattern commun
            if club_name == f"Club {cl_no}":
                 match_alt = re.search(r'class="title uppercase">\s*(.*?)\s*<', html)
                 if match_alt:
                     club_name = match_alt.group(1).strip()

            return jsonify({
                "success": True,
                "club": {
                    "nom": club_name,
                    "ville": "France", 
                    "adresse": "", 
                    "district": "FFF",
                    "logo_url": logo_url
                }
            })
    except Exception as e:
        print(f"Scraping Error: {e}")

    # Fallback si erreur de réseau ou scraping
    return jsonify({
        "success": True,
        "club": {
            "nom": f"Club {cl_no}",
            "ville": "France",
            "adresse": "",
            "district": "FFF",
            "logo_url": logo_url
        }
    })

@app.route('/api/clubs/search')
def hybrid_search():
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify([])
    
    # 1. SI C'EST UN NUMÉRO (Affiliation partielle ou complète) -> SCRAPING FFF
    # C'est la seule façon d'avoir l'autocomplétion sur les numéros ("500...") qui marche à 100%
    if q.isdigit():
        try:
            # On cherche via le site officiel
            search_url = f"https://www.fff.fr/recherche-clubs?q={q}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            resp = requests.get(search_url, headers=headers, timeout=4)
            
            if resp.status_code == 200:
                html = resp.text
                results = []
                # Regex pour trouver les liens de clubs dans la page de recherche FFF
                # Pattern: href="/competition/club/500302-e-s-bully-les-mines" (ou similaire)
                # On capture ID et SLUG (nom approximatif)
                matches = re.findall(r'href="/competition/club/(\d+)-([^"]+)"', html)
                
                seen_ids = set()
                for m in matches:
                    c_id, c_slug = m
                    if c_id in seen_ids: continue
                    
                    # Nettoyage du nom (le slug est moche, on essaie de le rendre lisible)
                    c_name = c_slug.replace('-', ' ').upper()
                    
                    # Logo officiel
                    c_logo = f"https://pf-logo.fff.fr/logo/{c_id}_1.jpg"
                    
                    results.append({
                        "cl_no": c_id,
                        "name": c_name, # Nom "approximatif" mais suffisant pour la suggestion
                        "location": "France", # On n'a pas la ville facile, mais le logo aide
                        "logo": c_logo,
                        "address": ""
                    })
                    seen_ids.add(c_id)
                
                # Si on a trouvé des trucs, on renvoie ça
                if results:
                    return jsonify(results[:10])

        except Exception as e:
            print(f"numeric search error: {e}")

    # 2. SI C'EST DU TEXTE -> API ENTREPRISE (inchangé)
    try:
        api_url = f"https://recherche-entreprises.api.gouv.fr/search?q={q} football&est_association=true&limite=10"
        resp = requests.get(api_url, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            results = []
            for item in data.get('results', []):
                nom = item.get('nom_complet', 'Club Inconnu')
                ville = "France"
                adresse = item.get('adresse', '')
                
                if item.get('siege') and item['siege'].get('libelle_commune'):
                    ville = item['siege']['libelle_commune']
                
                fake_affil = item.get('siren', '000000')[:6] 
                if q.isdigit() and len(q) >= 3:
                     fake_affil = q.ljust(6, '0')[:6]

                logo_url = f"https://pf-logo.fff.fr/logo/{fake_affil}_1.jpg"

                results.append({
                    "cl_no": fake_affil,
                    "name": nom,
                    "location": ville,
                    "logo": logo_url,
                    "address": adresse
                })
            return jsonify(results)
    except Exception as e:
        print(f"API Error: {e}")
        return jsonify([])

    return jsonify([])


@app.route('/api/clubs/fff-lookup', methods=['GET'])
@app.route('/api/clubs/fff-lookup', methods=['GET'])
def fff_lookup():
    """
    ANCIENNE MÉTHODE (Gardée pour compatibilité si besoin, mais dépréciée pour la nouvelle flow)
    Recherche un club par numéro d'affiliation.
    """
    affiliation = request.args.get('q', '').strip()
    return jsonify([])

@app.route('/api/v2/cities', methods=['GET'])
def search_cities():
    """Autocomplete Villes"""
    query = request.args.get('q', '').strip()
    if len(query) < 2:
        return jsonify([])
    results = club_db.search_cities(query)
    return jsonify(results)

@app.route('/api/v2/clubs-by-city', methods=['GET'])
def get_clubs_by_city():
    """Retourne les clubs d'une ville donnée"""
    city = request.args.get('city', '').strip()
    if not city:
        return jsonify([])
    clubs = club_db.get_clubs_in_city(city)
    return jsonify(clubs)



if __name__ == '__main__':
    # Éviter le double lancement avec le reloader de Flask
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        print("⚙️ Démarrage de l'application.")

    print("🚀 COACH PRO (VERSION AMÉLIORÉE) PRÊT")
    app.run(debug=True, port=5000, host='0.0.0.0')