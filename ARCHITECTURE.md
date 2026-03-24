# KduFoot Architecture Overview

Plateforme de matchs et tournois de football amateur.

## Tech Stack

### Frontend (Client)
- **Framework**: React 19 with Vite 7.
- **UI Library**: HeroUI (NextUI) for high-end components.
- **Styling**: TailwindCSS 4 & Framer Motion for premium animations.
- **Authentication**: Auth0 (OIDC/JWT) for secure user sessions.
- **Data Fetching**: SWR for reactive data fetching and caching.
- **Internationalization**: i18next for multi-language support (FR/EN).
- **PWA**: Vite PWA + Workbox for offline support and installability.

### Backend (Cloudflare Worker)
- **Runtime**: Cloudflare Workers (Edge Computing, V8 isolates).
- **Database**: Cloudflare D1 (SQLite at the edge).
- **Caching**: Cloudflare KV for high-performance metadata and details caching.
- **Rate Limiting**: Cloudflare Rate Limiter + in-memory strict RL for DoS protection.
- **Real-time**: Durable Objects + WebSocket (WebSocketHub).
- **Architecture**: Custom Router with request-scoped context and middleware-based permission checking.

---

## Contextes Bornés (Bounded Contexts)

Le domaine est découpé en 5 contextes métier distincts :

| Contexte | Services | Entités Clés | Responsabilité |
|---|---|---|---|
| **Identité** | `UserService`, Auth0 | `User`, `Club` | Auth, profil, RGPD, permissions |
| **Compétition** | `MatchService`, `MatchSearchService`, `ParticipationService` | `Match`, `Participation` | Création matchs, recherche géo, inscriptions |
| **Tournois** | `TournamentService` | `Tournament`, `Pairing` | Brackets, pairings, gestion tournois |
| **Entraînement** | `ExerciseService`, `SessionService` | `Exercise`, `Session` | Exercices, plans d'entraînement |
| **Infrastructure** | `ClubService`, `CalendarService` | `Club`, `CalendarToken` | SIRET, iCalendar, WebSocket hub |

Chaque contexte possède ses propres types dans `src/types/` et ses routes dans `src/routes/`.

---

## Data Flow

```
Client (React) → Auth0 (JWT) → Cloudflare Worker → Router
  ├─ Rate Limiting (Cloudflare RL + strict in-memory)
  ├─ Permission Check (Auth0 JWT verify + DB block status)
  ├─ request.user ← JWT payload (sub, permissions)
  ├─ Route Handler
  │   ├─ Service Layer (business logic, no HTTP concerns)
  │   │   ├─ D1 Database (SQL queries)
  │   │   ├─ KV Cache (read-through)
  │   │   └─ External APIs (Google Maps, SIRET)
  │   └─ ErrorHandler (safe error responses, no leaks)
  └─ Security Headers (HSTS, CSP, X-Frame-Options, Permissions-Policy)
```

---

## Services

| Service | Fichier | Rôle |
|---|---|---|
| `UserService` | `services/user.service.ts` | CRUD utilisateurs, sync Auth0, suppression RGPD |
| `MatchService` | `services/match.service.ts` | Créer, modifier, supprimer des matchs |
| `MatchSearchService` | `services/match-search.service.ts` | Recherche géographique avec Haversine + Google Maps |
| `TournamentService` | `services/tournament.service.ts` | Gestion des tournois, pairings, brackets |
| `ExerciseService` | `services/exercise.service.ts` | CRUD exercices d'entraînement |
| `SessionService` | `services/session.service.ts` | Sessions d'entraînement composées d'exercices |
| `ClubService` | `services/club.service.ts` | Recherche clubs via API SIRET + validation |
| `ParticipationService` | `services/participation.service.ts` | Inscriptions aux matchs avec gestion places |

---

## Architecture Decision Records (ADRs)

Les décisions architecturales majeures sont documentées dans `docs/adr/` :

| ADR | Titre | Statut |
|---|---|---|
| [ADR-001](docs/adr/001-cloudflare-edge-architecture.md) | Cloudflare Workers comme runtime backend | Accepté |
| [ADR-002](docs/adr/002-auth0-authentication.md) | Auth0 pour l'authentification et l'autorisation | Accepté |
| [ADR-003](docs/adr/003-d1-sqlite-database.md) | Cloudflare D1 (SQLite) comme base de données | Accepté |

---

## Comment ajouter une nouvelle route

1. **Créer le service** dans `src/services/mon-service.service.ts`
2. **Créer le fichier route** dans `src/routes/mon-route.ts`
3. **Importer dans `routes/index.ts`** et appeler la fonction setup
4. **Définir les permissions** dans `types/permissions.ts` si nécessaire
5. **Enregistrer la route** avec `router.get('/api/...', handler, 'permission:scope')`
   - L'utilisateur authentifié est disponible via `request.user` (JWTPayload)
   - Les permissions sont disponibles via `request.permissions`
6. **Ajouter des tests** dans `services/__tests__/`

---

## Variables d'environnement

Voir `.env.example` à la racine pour la liste complète. Variables obligatoires :

| Variable | Rôle |
|---|---|
| `AUTH0_DOMAIN` | Domaine Auth0 (ex: `kdufoot.eu.auth0.com`) |
| `AUTH0_CLIENT_ID` | Client ID Auth0 |
| `AUTH0_CLIENT_SECRET` | Client Secret Auth0 |
| `AUTH0_AUDIENCE` | Audience API Auth0 |
| `AUTH0_SCOPE` | Scopes OAuth2 |
| `API_BASE_URL` | URL de l'API Worker |
| `CORS_ORIGIN` | Origines CORS autorisées |
| `GOOGLE_API_KEY` | Clé API Google Maps |
| `SIRET_API_URL` | URL de l'API SIRET (INSEE) |
| `READ_PERMISSION` | Permission de lecture |
| `WRITE_PERMISSION` | Permission d'écriture |
| `ADMIN_PERMISSION` | Permission admin |
| `VITE_API_URL` | URL API pour le frontend |

---

## Performance Targets
- **CPU Time**: Under 10ms for worker execution.
- **D1 Queries**: Maximum 10 par requête HTTP (P99 < 200ms).
- **Lighthouse Scores**: 100/100 en Performance, Accessibility, Best Practices, SEO.

## Monitoring & Seuils Critiques
- **Requêtes D1 par exécution** : Maximum recommandé < 10 requêtes par appel HTTP. Utiliser `Promise.all` ou `DB.batch()` pour les lectures multiples. Logs structurés JSON alertent si dépassement.
- **Rate Limits** : Global Cloudflare RL + strict in-memory (5 req/5min) sur routes sensibles.

---

## Stratégie de Scaling

| Seuil | Action | Coût estimé |
|---|---|---|
| 70K req/jour | Activer Workers Paid ($5/mois) | $5/mois |
| 3.5M D1 reads/jour | Augmenter TTL KV cache (30→120s) | $0 |
| 17.5K MAU Auth0 | Évaluer migration vers Better Auth (self-hosted) | Temps dev |
| 50K D1 writes/jour | Migrer vers Workers for Platforms / Turso | $20+/mois |
| 100K req/jour | Activer Cloudflare Queues pour tâches asynchrones | $5/mois |

### Points de rupture
- **D1 Free Tier** : 5M reads/jour, 100K writes/jour. Au-delà → payant $0.75/M reads.
- **KV Free Tier** : 100K reads/jour, 1K writes/jour. Au-delà → payant.
- **Auth0 Free** : limite 7.5K MAU. Passage Enterprise pour > 50K MAU.
- **Google Maps API** : $200 crédit gratuit/mois. Attention au Distance Matrix ($5/1000 req).

---

## Commandes de développement

```bash
npm run dev:env          # Lancer Worker + Client en mode dev
npm run type-check       # Vérification TypeScript (tsc --noEmit)
npm test                 # Tests Vitest
npm test -- --coverage   # Tests avec couverture (seuils : 70% lignes/fonctions)
npm run lint             # ESLint
npx wrangler deploy      # Déploiement production
```

## Test Coverage Thresholds
- **Minimum global** : 70% lines, 70% functions (configuré dans `vitest.config.mts`).
- **Rapport** : `text` (console) + `json` (CI) + `html` (navigation).
