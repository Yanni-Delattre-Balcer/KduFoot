# Changelog

Tous les changements notables de ce projet sont documentés dans ce fichier.

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
Versioning : [Semantic Versioning](https://semver.org/lang/fr/)

---

## [Unreleased]

### Added
- Architecture Decision Records (ADRs) dans `docs/adr/` :
  - ADR-001 : Cloudflare Workers comme runtime backend
  - ADR-002 : Auth0 pour l'authentification et l'autorisation
  - ADR-003 : Cloudflare D1 (SQLite) comme base de données
- `.env.example` complet avec toutes les variables d'environnement documentées
- Tests unitaires pour `MatchService` (isTooLateToModify, mapRowToMatch, getById, update, delete)
- Tests d'intégration pour le `Router` (CORS, 404, security headers, rate limiting, auth middleware)
- Propriété `permissions: string[]` sur `AuthenticatedRequest` — les permissions JWT sont désormais disponibles directement via `request.permissions` dans les handlers

### Changed
- `ARCHITECTURE.md` : mise à jour React 18 → React 19, ajout bounded contexts, ajout section ADRs, cohérence seuils couverture
- `AuthenticatedRequest` : ajout du champ `permissions: string[]` pour accès typé aux permissions dans les handlers
- Route handlers (`/api/ping`, `/api/test-push`, `/api/get_users`, `/api/get/<user>`, `/api/__auth0/autopermissions`) : utilisation de `request.user?.sub` et `request.permissions` au lieu de `router.jwtPayload` et `router.userPermissions` (suppression de l'état mutable sur l'instance Router)
- `vitest.config.mts` : seuils de couverture 50% → 70% (lignes et fonctions), ajout du reporter `html`

### Fixed
- `router.ts` : suppression du cast `(dbUser as any)?.block_reason` → `dbUser?.block_reason` (le type `BlockedUserRow` inclut déjà `block_reason`)
- `ARCHITECTURE.md` : version React corrigée (18 → 19), incohérence des seuils de couverture résolue

---

## [2.0.0] — 2025-Q1

### Added
- Service Worker Workbox via Vite PWA pour support offline
- Synchronisation iCalendar pour les matchs et tournois
- Gestion des tournois avec brackets et pairings automatiques
- Push notifications Web (VAPID)
- WebSocket temps-réel via Durable Objects (WebSocketHub)
- Soft deletes et audit log (migration 0028)
- Blocage utilisateurs avec motif (`is_blocked`, `block_reason`)
- Cache in-memory du statut de blocage (TTL 5min)
- Rate limiting strict in-memory sur les routes sensibles (5 req/5min)
- Security headers complets : HSTS, CSP, X-Frame-Options, Permissions-Policy
- Endpoint `/api/debug-db` (admin seulement)
- Endpoint `/api/test-push` pour tester les notifications
- Dashboard avec cartes matchs/tournois
- Page RGPD avec suppression de compte complète

### Changed
- Migration vers React 19 (depuis React 18)
- Migration vers TailwindCSS v4 (depuis v3)
- Migration vers Vite 7 (depuis Vite 5)

---

## [1.0.0] — 2024-Q1

### Added
- Authentification Auth0 (OIDC/JWT)
- CRUD matchs (création, modification, suppression)
- Recherche géographique avec Haversine + Google Maps Distance Matrix
- CRUD exercices d'entraînement
- CRUD sessions d'entraînement
- Gestion des participations aux matchs
- Recherche de clubs via l'API SIRET (INSEE)
- Profil utilisateur avec synchronisation Auth0
- Permissions RBAC (`read:api`, `write:api`, `admin:api`)
- Interface admin (gestion utilisateurs, statistiques)
- Internationalisation FR/EN (i18next)
- Déploiement automatique GitHub Actions → Cloudflare Pages + Workers
- 28 migrations D1 initiales
